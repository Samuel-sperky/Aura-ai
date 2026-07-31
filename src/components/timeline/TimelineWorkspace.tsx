"use client";

// The /timeline page body: URL state, data loading, mode switching, mutations.
//
// URL STATE (`nuqs`, contract §6 "filtre zostávajú v URL"):
//   ?mode=roadmap|sprints|decisions   ?zoom=quarter|month|week
//   ?sprint=<id>   ?checkpoint=<id>   ?mine=true
// `mode` and `zoom` use `clearOnDefault: false` so the URL always spells out the
// current view — a shared link then reproduces the screen exactly, and the e2e
// spec can assert on it.
//
// LOADING: three list requests plus /api/auth/me for the right-based UX gating.
// The planner's work items are fetched separately and only in `sprints` mode
// (one request for the backlog plus one per visible sprint column, bounded by
// PLANNER_COLUMNS) — a single unfiltered work-item request would not scale to the
// 5 000-item target.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  parseAsBoolean,
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
} from "nuqs";
import { CalendarRange, GitBranch, ShieldCheck } from "lucide-react";
import { ApiError, apiGet, apiPost, qs, type ListResult } from "@/lib/api";
import { includesRight } from "@/lib/auth/rights";
import type { PublicUserDto } from "@/lib/domain/contracts/auth";
import type { CheckpointDto } from "@/lib/domain/contracts/checkpoints";
import type { ProjectDto } from "@/lib/domain/contracts/projects";
import type {
  CapacityBreakdownDto,
  SprintAction,
  SprintMetricsDto,
  SprintWithMetricsDto,
} from "@/lib/domain/contracts/sprints";
import type { WorkItemDto } from "@/lib/domain/contracts/workItems";
import {
  DEFAULT_MODE,
  DEFAULT_ZOOM,
  TIMELINE_MODES,
  TIMELINE_ZOOMS,
  buildTimeScale,
  sprintsInHorizon,
  todayIso,
} from "@/lib/timeline";
import {
  PageHeader,
  Segmented,
  Toolbar,
  ToolbarSpacer,
  useToast,
} from "@/components/ui";
import { ErrorState, LoadingState } from "@/components/states";
import { CheckpointModal } from "./CheckpointModal";
import { DecisionQueue } from "./DecisionQueue";
import { RoadmapMode, RoadmapSummary } from "./RoadmapMode";
import { BACKLOG_ID, SprintPlanner, type ItemBuckets } from "./SprintPlanner";
import { SprintsAxis, SprintsSummary } from "./SprintsAxis";
import { t } from "./text";

/** How many sprint columns the planner renders (and therefore fetches items for). */
const PLANNER_COLUMNS = 5;
/** Sprint statuses that are still plannable. */
const OPEN_SPRINT_STATUSES = new Set(["draft", "planned", "active", "review"]);
/** Page size for the shared lists — the 50-project target fits on one page. */
const PAGE = { projects: 200, checkpoints: 400, sprints: 100, items: 100 } as const;

const MODE_ICON = {
  roadmap: GitBranch,
  sprints: CalendarRange,
  decisions: ShieldCheck,
} as const;

interface CoreData {
  me: PublicUserDto;
  projects: ProjectDto[];
  checkpoints: CheckpointDto[];
  sprints: SprintWithMetricsDto[];
}

export function TimelineWorkspace() {
  const toast = useToast();

  // ── URL state ─────────────────────────────────────────────────────────────
  const [mode, setMode] = useQueryState(
    "mode",
    parseAsStringLiteral(TIMELINE_MODES)
      .withDefault(DEFAULT_MODE)
      .withOptions({ clearOnDefault: false, history: "push" }),
  );
  const [zoom, setZoom] = useQueryState(
    "zoom",
    parseAsStringLiteral(TIMELINE_ZOOMS)
      .withDefault(DEFAULT_ZOOM)
      .withOptions({ clearOnDefault: false }),
  );
  const [sprintParam, setSprintParam] = useQueryState("sprint", parseAsString);
  const [checkpointParam, setCheckpointParam] = useQueryState(
    "checkpoint",
    parseAsString,
  );
  const [mine, setMine] = useQueryState(
    "mine",
    parseAsBoolean.withDefault(false),
  );

  // `clearOnDefault: false` keeps a default in the URL once it has been written,
  // but it does not put it there on a bare /timeline visit. Write it once so the
  // address bar always spells out the current view and a copied link reproduces
  // the screen. `history: "replace"` — the initial visit must not leave a history
  // entry that Back would land on.
  const urlNormalised = useRef(false);
  useEffect(() => {
    if (urlNormalised.current) return;
    urlNormalised.current = true;
    void setMode(mode, { history: "replace" });
    void setZoom(zoom, { history: "replace" });
  }, [mode, zoom, setMode, setZoom]);

  // ── data ──────────────────────────────────────────────────────────────────
  const [core, setCore] = useState<CoreData | null>(null);
  const [coreError, setCoreError] = useState<string | null>(null);
  const [buckets, setBuckets] = useState<ItemBuckets>({ [BACKLOG_ID]: [] });
  const [capacity, setCapacity] = useState<CapacityBreakdownDto | null>(null);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);

  // Today is read ONCE per mount: recomputing it per render would move the
  // "Dnes" line mid-session and make the horizon jump at midnight.
  const today = useMemo(() => todayIso(), []);

  // Every loader is a promise CHAIN, not an async/await body: that keeps all state
  // writes inside callbacks, so the effects below can call them without setting
  // state synchronously (which cascades renders). An `await` as the first
  // statement is not enough — `set-state-in-effect` cannot see past the call into
  // an extracted async function and flags the call site regardless. `apiGet` is
  // itself async and therefore never throws synchronously, so a chain behaves
  // exactly like the try/catch it replaces.
  const loadCore = useCallback(
    (signal?: AbortSignal): Promise<void> =>
      Promise.all([
        apiGet<{ user: PublicUserDto }>("/api/auth/me", { signal }),
        apiGet<ListResult<ProjectDto>>(
          `/api/projects${qs({ pageSize: PAGE.projects })}`,
          { signal },
        ),
        apiGet<ListResult<CheckpointDto>>(
          `/api/checkpoints${qs({ pageSize: PAGE.checkpoints, sort: "dueDate", dir: "asc" })}`,
          { signal },
        ),
        apiGet<ListResult<SprintWithMetricsDto>>(
          `/api/sprints${qs({ pageSize: PAGE.sprints, sort: "startDate", dir: "asc" })}`,
          { signal },
        ),
      ])
        .then(([me, projects, checkpoints, sprints]) => {
          setCore({
            me: me.user,
            projects: projects.items,
            checkpoints: checkpoints.items,
            sprints: sprints.items,
          });
          setCoreError(null);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          // 401 already redirected inside the api client.
          setCoreError(err instanceof Error ? err.message : t("timeline.error.load"));
        }),
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadCore(controller.signal);
    return () => controller.abort();
  }, [loadCore]);

  // ── scale + derived collections ───────────────────────────────────────────
  const scale = useMemo(
    () => buildTimeScale({ mode, zoom, today }),
    [mode, zoom, today],
  );

  /**
   * Sprints drawn on the axis: those overlapping the CURRENT scale's horizon.
   * That is 12 weeks in `sprints` mode and `ROADMAP_HORIZON[zoom]` units in
   * `roadmap`, because `scale` follows the mode — both modes render from this.
   */
  const axisSprints = useMemo(
    () => sprintsInHorizon(core?.sprints ?? [], scale),
    [core?.sprints, scale],
  );

  /** Sprints that get a planner column (and therefore an item request). */
  const columnSprints = useMemo(
    () =>
      axisSprints
        .filter((sprint) => OPEN_SPRINT_STATUSES.has(sprint.status))
        .slice(0, PLANNER_COLUMNS),
    [axisSprints],
  );

  const selectedSprintId = sprintParam ?? columnSprints[0]?.id ?? null;
  const columnKey = columnSprints.map((s) => s.id).join(",");

  // ── planner items (sprints mode only) ─────────────────────────────────────
  const loadBuckets = useCallback(
    (ids: string[], signal?: AbortSignal): Promise<void> =>
      Promise.all([
        apiGet<ListResult<WorkItemDto>>(
          `/api/work-items${qs({
            backlog: 1,
            openOnly: 1,
            pageSize: PAGE.items,
            sort: "rank",
            dir: "asc",
          })}`,
          { signal },
        ),
        ...ids.map((id) =>
          apiGet<ListResult<WorkItemDto>>(
            `/api/work-items${qs({
              sprintId: id,
              pageSize: PAGE.items,
              sort: "rank",
              dir: "asc",
            })}`,
            { signal },
          ),
        ),
      ])
        .then(([backlog, ...perSprint]) => {
          const next: ItemBuckets = { [BACKLOG_ID]: backlog.items };
          ids.forEach((id, index) => {
            next[id] = perSprint[index]?.items ?? [];
          });
          setBuckets(next);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          toast.error(err instanceof Error ? err.message : t("timeline.error.load"));
        }),
    [toast],
  );

  useEffect(() => {
    if (mode !== "sprints" || !core) return;
    const controller = new AbortController();
    void loadBuckets(columnKey ? columnKey.split(",") : [], controller.signal);
    return () => controller.abort();
  }, [mode, core, columnKey, loadBuckets]);

  // ── capacity of the selected sprint ───────────────────────────────────────
  // This one RETURNS the breakdown instead of storing it: with no sprint selected
  // there is nothing to await, so a state write in here would land synchronously
  // in the body of the effect below. The callers apply it in a `.then` instead.
  // An abort is re-thrown so they can skip the write and leave the panel alone.
  const fetchCapacity = useCallback(
    async (
      id: string | null,
      signal?: AbortSignal,
    ): Promise<CapacityBreakdownDto | null> => {
      if (!id) return null;
      try {
        const res = await apiGet<{
          metrics: SprintMetricsDto;
          capacity: CapacityBreakdownDto;
        }>(`/api/sprints/${encodeURIComponent(id)}`, { signal });
        return res?.capacity ?? null;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") throw err;
        // A missing capacity panel is a degraded view, not a page failure — the
        // axis and the board stay usable, so this never becomes an ErrorState.
        return null;
      }
    },
    [],
  );

  useEffect(() => {
    if (mode !== "sprints") return;
    const controller = new AbortController();
    void fetchCapacity(selectedSprintId, controller.signal)
      .then(setCapacity)
      .catch(() => {
        // Aborted — the run that superseded this one owns the panel.
      });
    return () => controller.abort();
  }, [mode, selectedSprintId, fetchCapacity]);

  // ── mutations ─────────────────────────────────────────────────────────────
  const refreshPlanner = useCallback(async () => {
    await Promise.all([
      loadCore(),
      loadBuckets(columnKey ? columnKey.split(",") : []),
      // No signal here, so this can only resolve — never abort.
      fetchCapacity(selectedSprintId).then(setCapacity),
    ]);
  }, [loadCore, loadBuckets, fetchCapacity, columnKey, selectedSprintId]);

  /**
   * One error policy for every planner mutation: a 409 shows the SERVER's Slovak
   * sentence (never a message we invent) and refetches, so the next attempt runs
   * against the current version.
   */
  const mutate = useCallback(
    async (itemId: string | null, action: () => Promise<void>, okMessage?: string) => {
      setBusyItemId(itemId);
      try {
        await action();
        if (okMessage) toast.success(okMessage);
        await refreshPlanner();
      } catch (err) {
        if (err instanceof ApiError && err.isVersionConflict) {
          toast.warn(err.message);
          await refreshPlanner();
        } else {
          toast.error(err instanceof Error ? err.message : t("timeline.error.load"));
        }
      } finally {
        setBusyItemId(null);
      }
    },
    [toast, refreshPlanner],
  );

  const onMoveItem = useCallback(
    (item: WorkItemDto, sprintId: string | null, rankValue?: number) => {
      void mutate(
        item.id,
        async () => {
          await apiPost(`/api/work-items/${encodeURIComponent(item.id)}/move`, {
            version: item.version,
            sprintId,
            ...(rankValue === undefined ? {} : { rankValue }),
          });
        },
        sprintId ? t("planner.moved") : t("planner.movedToBacklog"),
      );
    },
    [mutate],
  );

  const onRankItem = useCallback(
    (item: WorkItemDto, direction: "up" | "down") => {
      void mutate(
        item.id,
        async () => {
          await apiPost(`/api/work-items/${encodeURIComponent(item.id)}/rank`, {
            version: item.version,
            direction,
          });
        },
        t("planner.reordered"),
      );
    },
    [mutate],
  );

  const onRankTo = useCallback(
    (item: WorkItemDto, rankValue: number) => {
      void mutate(
        item.id,
        async () => {
          await apiPost(`/api/work-items/${encodeURIComponent(item.id)}/rank`, {
            version: item.version,
            rankValue,
          });
        },
        t("planner.reordered"),
      );
    },
    [mutate],
  );

  const onSprintAction = useCallback(
    (sprint: SprintWithMetricsDto, action: SprintAction) => {
      void mutate(
        null,
        async () => {
          await apiPost(
            `/api/sprints/${encodeURIComponent(sprint.id)}/${action}`,
            {
              version: sprint.version,
              // `carry-over` REQUIRES the key to be present; null = back to the
              // backlog, which is the only destination this screen offers.
              ...(action === "carry-over" ? { targetSprintId: null } : {}),
            },
          );
        },
        t("planner.action.done"),
      );
    },
    [mutate],
  );

  // ── rights (UX gating only — the server decides) ──────────────────────────
  const rights = core?.me.rights ?? [];
  const canWriteItems = includesRight(rights, "work_items.write");
  const canWriteSprints = includesRight(rights, "sprints.write");
  const canWriteCheckpoints = includesRight(rights, "checkpoints.write");
  const canDecide = includesRight(rights, "decisions.decide");
  const canOverrideReadiness = includesRight(rights, "readiness.override");

  // Drag & drop is desktop-only (contract §3.2/72). Measured once and on resize;
  // the Move dialog covers every case where it is off.
  const dragDisabled = useNarrowOrTouch();

  // ── render ────────────────────────────────────────────────────────────────
  if (coreError) {
    return (
      <div className="page-stack">
        <PageHeader
          eyebrow={t("timeline.eyebrow")}
          title={t("timeline.title")}
          description={t("timeline.description")}
        />
        <ErrorState message={coreError} onRetry={() => void loadCore()} />
      </div>
    );
  }

  if (!core) {
    return (
      <div className="page-stack">
        <PageHeader
          eyebrow={t("timeline.eyebrow")}
          title={t("timeline.title")}
          description={t("timeline.description")}
        />
        <LoadingState kpis={3} blocks={2} />
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow={t("timeline.eyebrow")}
        title={t("timeline.title")}
        description={t("timeline.description")}
        actions={
          mode === "sprints" ? (
            <SprintsSummary sprints={axisSprints} />
          ) : mode === "roadmap" ? (
            <RoadmapSummary projects={core.projects} />
          ) : null
        }
      />

      <Toolbar sticky>
        <Segmented
          value={mode}
          onChange={(next) => void setMode(next)}
          ariaLabel={t("timeline.mode.label")}
          options={TIMELINE_MODES.map((value) => ({
            value,
            label: t(`timeline.mode.${value}`),
            icon: MODE_ICON[value],
          }))}
        />
        <ToolbarSpacer />
        {mode === "decisions" ? null : (
          <Segmented
            size="sm"
            value={zoom}
            onChange={(next) => void setZoom(next)}
            ariaLabel={t("timeline.zoom.label")}
            options={TIMELINE_ZOOMS.map((value) => ({
              value,
              label: t(`timeline.zoom.${value}`),
            }))}
          />
        )}
      </Toolbar>

      {mode === "roadmap" ? (
        <RoadmapMode
          scale={scale}
          projects={core.projects}
          checkpoints={core.checkpoints}
          // `axisSprints`, not the raw list: it is filtered by the very predicate
          // the lane uses to draw a bar (`barGeometry(...).visible`) against THIS
          // mode's scale, so the sr-only sprint count says exactly as many sprints
          // as there are bars on screen.
          sprints={axisSprints}
          onOpenCheckpoint={(id) => void setCheckpointParam(id)}
        />
      ) : null}

      {mode === "sprints" ? (
        <div className="page-stack">
          <SprintsAxis
            scale={scale}
            sprints={axisSprints}
            itemsBySprint={buckets}
            selectedSprintId={selectedSprintId}
            onSelectSprint={(id) => void setSprintParam(id)}
          />
          <SprintPlanner
            sprints={columnSprints}
            buckets={buckets}
            capacity={capacity}
            selectedSprintId={selectedSprintId}
            onSelectSprint={(id) => void setSprintParam(id)}
            loading={selectedSprintId !== null && capacity === null}
            canWriteItems={canWriteItems}
            canWriteSprints={canWriteSprints}
            dragDisabled={dragDisabled}
            onMoveItem={onMoveItem}
            onRankItem={onRankItem}
            onRankTo={onRankTo}
            onSprintAction={onSprintAction}
            busyItemId={busyItemId}
          />
        </div>
      ) : null}

      {mode === "decisions" ? (
        <DecisionQueue
          checkpoints={core.checkpoints}
          today={today}
          currentUserId={core.me.id}
          mineOnly={mine}
          onMineOnlyChange={(value) => void setMine(value || null)}
          onOpenCheckpoint={(id) => void setCheckpointParam(id)}
        />
      ) : null}

      <CheckpointModal
        checkpointId={checkpointParam}
        onClose={() => void setCheckpointParam(null)}
        canWriteCheckpoints={canWriteCheckpoints}
        canDecide={canDecide}
        canOverrideReadiness={canOverrideReadiness}
        onChanged={() => void loadCore()}
      />
    </div>
  );
}

/**
 * True under the 700 px breakpoint or on a coarse pointer — the two cases where
 * drag & drop planning is switched off by the contract. Starts `true` so the
 * first paint never advertises dragging before the media query is known (and so
 * SSR and hydration agree).
 */
function useNarrowOrTouch(): boolean {
  const [narrow, setNarrow] = useState(true);
  const query = useRef<string>("(max-width: 700px), (pointer: coarse)");

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(query.current);
    const apply = () => setNarrow(mql.matches);
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, []);

  return narrow;
}

"use client";

// `/decisions` — the decision queue (spec Q9, Q31–Q38).
//
// This screen deliberately owns NO checkpoint UI of its own: the queue rows and
// the checkpoint detail are A8's `DecisionQueue` and `CheckpointModal`, imported
// from `@/components/timeline`. A second implementation of a readiness bar or a
// decision form is exactly how two screens end up disagreeing about when a
// decision is allowed — and that rule is the core of the product.
//
// What this view adds is the QUEUE-SPECIFIC framing: the filters (lifecycle,
// type, project, "waiting on me"), the URL state, and `?checkpoint=<id>` as the
// deep link into the modal.
//
// The list always comes from `queue=1`, i.e. only checkpoints that still need a
// decision. Decided ones live in the project detail and in the timeline history —
// a work queue that keeps finished work in it stops being a queue.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import { Gavel } from "lucide-react";
import {
  Button,
  FilterToolbar,
  PageHeader,
  Panel,
  PanelBody,
  Select,
  StatCard,
  ToolbarSearch,
  ToolbarSpacer,
} from "@/components/ui";
import type { FilterChipDescriptor } from "@/components/ui";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  NoResultsState,
} from "@/components/states";
import { CheckpointModal, DecisionQueue } from "@/components/timeline";
import { ApiError, apiGet, qs } from "@/lib/api";
import type { ListResult } from "@/lib/api";
import { checkpointStateKey, checkpointTypeKey } from "@/lib/client/domain";
import { fmtInt, fmtPercent, todayIso } from "@/lib/client/format";
import { useMe } from "@/lib/client/useMe";
import { storedFilter, storedLiteral, useViewPrefs } from "@/lib/client/viewPrefs";
import {
  CHECKPOINT_TYPES,
  SETTABLE_LIFECYCLES,
} from "@/lib/domain/contracts/checkpoints";
import type { CheckpointDto } from "@/lib/domain/contracts/checkpoints";
import type { ProjectDto } from "@/lib/domain/contracts/projects";
import { t } from "@/lib/i18n";

/** Lifecycles reachable in a queue: `decided` is excluded by `queue=1`. */
const QUEUE_LIFECYCLES = SETTABLE_LIFECYCLES;
const MINE = ["0", "1"] as const;
const QUEUE_LIMIT = 300;
const REFERENCE_LIMIT = 200;
const SEARCH_DEBOUNCE_MS = 350;

const FILTER_KEYS = [
  "lifecycle",
  "checkpointType",
  "projectId",
  "q",
  "mine",
] as const;

export function DecisionsView() {
  const router = useRouter();
  const me = useMe();
  const {
    stored: storedPrefs,
    loading: prefsLoading,
    save: savePrefs,
  } = useViewPrefs("decisions");

  const [params, setParams] = useQueryStates(
    {
      lifecycle: parseAsString.withDefault(""),
      checkpointType: parseAsString.withDefault(""),
      projectId: parseAsString.withDefault(""),
      q: parseAsString.withDefault(""),
      mine: parseAsStringLiteral(MINE).withDefault("0"),
      checkpoint: parseAsString.withDefault(""),
    },
    { history: "replace", clearOnDefault: true },
  );

  const [rows, setRows] = useState<CheckpointDto[]>([]);
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [firstLoadDone, setFirstLoadDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  // Same guard as in WorkItemsView: a ref, because flipping it is not something
  // the screen re-renders for.
  const restored = useRef(false);

  // The search box is EDITED locally and debounced into `?q=`, so its value is
  // derived rather than mirrored by an effect: as long as the query it was typed
  // against is still in the URL the local text wins, and the moment `?q=` moves
  // on its own (Back, a removed chip, the restored preferences) the URL wins.
  const [typedSearch, setTypedSearch] = useState({ value: params.q, q: params.q });
  const search = typedSearch.q === params.q ? typedSearch.value : params.q;
  const setSearch = useCallback(
    (value: string) => setTypedSearch({ value, q: params.q }),
    [params.q],
  );

  // `loading` is DERIVED from which request the rows on screen belong to; a
  // setLoading(true) in the effect body cascades renders
  // (react-hooks/set-state-in-effect).
  const queuePath = `/api/checkpoints${qs({
    queue: 1,
    mine: params.mine === "1" ? 1 : undefined,
    lifecycle: params.lifecycle || undefined,
    checkpointType: params.checkpointType || undefined,
    projectId: params.projectId || undefined,
    q: params.q || undefined,
    sort: "dueDate",
    dir: "asc",
    pageSize: QUEUE_LIMIT,
  })}`;
  const requestKey = `${queuePath}#${nonce}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const loading = loadedKey !== requestKey;

  const canWriteCheckpoints = me.can("checkpoints.write");
  const canDecide = me.can("decisions.decide");
  const canOverrideReadiness = me.can("readiness.override");

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  // ── remembered filters (URL wins; see ProjectsView for the full rationale) ──
  useEffect(() => {
    if (restored.current || prefsLoading || !storedPrefs) return;
    restored.current = true;
    const hasUrlState = FILTER_KEYS.some(
      (key) => (params as Record<string, string>)[key] !== "" &&
        (params as Record<string, string>)[key] !== "0",
    );
    if (hasUrlState) return;
    const next = {
      lifecycle: storedFilter(storedPrefs, "lifecycle"),
      checkpointType: storedFilter(storedPrefs, "checkpointType"),
      projectId: storedFilter(storedPrefs, "projectId"),
      q: typeof storedPrefs.q === "string" ? storedPrefs.q : "",
      mine: storedLiteral(storedPrefs, "mine", MINE) ?? "0",
    };
    // The search box needs no separate write: its text derives from `?q=`, which
    // this one call sets.
    void setParams(next);
    // `params` is read once here as the entry state; adding it would re-run the
    // restore on every filter change and fight the user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefsLoading, storedPrefs, setParams]);

  // `prefsLoading` is a dependency so this still runs in the same commit as the
  // restore pass above (effects fire in declaration order), which is what used to
  // happen when `restored` was state.
  useEffect(() => {
    if (!restored.current) return;
    savePrefs({
      q: params.q,
      mode: "decisions",
      filters: {
        lifecycle: params.lifecycle,
        checkpointType: params.checkpointType,
        projectId: params.projectId,
        mine: params.mine,
      },
    });
  }, [
    prefsLoading,
    savePrefs,
    params.q,
    params.lifecycle,
    params.checkpointType,
    params.projectId,
    params.mine,
  ]);

  // ── search debounce ────────────────────────────────────────────────────────
  useEffect(() => {
    if (search === params.q) return;
    const timer = setTimeout(() => void setParams({ q: search }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, params.q, setParams]);

  // ── data ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();
    let alive = true;
    apiGet<ListResult<CheckpointDto>>(queuePath, { signal: controller.signal })
      .then((res) => {
        if (!alive) return;
        setRows(res.items);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Frontu rozhodnutí sa nepodarilo načítať.",
        );
      })
      .finally(() => {
        if (!alive) return;
        setLoadedKey(requestKey);
        setFirstLoadDone(true);
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [queuePath, requestKey]);

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;
    apiGet<ListResult<ProjectDto>>(
      `/api/projects${qs({ pageSize: REFERENCE_LIMIT, sort: "code", dir: "asc" })}`,
      { signal: controller.signal },
    )
      .then((res) => {
        if (alive) setProjects(res.items);
      })
      .catch(() => {
        // The project filter degrades to "everything".
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, []);

  // ── derived numbers for the strip ──────────────────────────────────────────
  const today = todayIso();
  const stats = useMemo(() => {
    const overdue = rows.filter((c) => c.overdue).length;
    const ready = rows.filter((c) => c.readiness >= 100).length;
    const mine = rows.filter((c) => c.approverId === me.user?.id).length;
    const avg =
      rows.length === 0
        ? 0
        : rows.reduce((sum, c) => sum + c.readiness, 0) / rows.length;
    return { overdue, ready, mine, avg };
  }, [rows, me.user?.id]);

  const filtersActive =
    params.lifecycle !== "" ||
    params.checkpointType !== "" ||
    params.projectId !== "" ||
    params.q !== "" ||
    params.mine === "1";

  const resetFilters = useCallback(() => {
    setSearch("");
    void setParams({
      lifecycle: "",
      checkpointType: "",
      projectId: "",
      q: "",
      mine: "0",
    });
  }, [setParams, setSearch]);

  const chips = useMemo<FilterChipDescriptor[]>(() => {
    const list: FilterChipDescriptor[] = [];
    if (params.lifecycle) {
      list.push({
        key: "lifecycle",
        label: `${t("checkpoints.field.lifecycle")}: ${t(`checkpointState.${params.lifecycle}`)}`,
        onRemove: () => void setParams({ lifecycle: "" }),
      });
    }
    if (params.checkpointType) {
      list.push({
        key: "checkpointType",
        label: `${t("checkpoints.field.type")}: ${t(`checkpointType.${params.checkpointType}`)}`,
        onRemove: () => void setParams({ checkpointType: "" }),
      });
    }
    if (params.projectId) {
      const project = projects.find((p) => p.id === params.projectId);
      list.push({
        key: "projectId",
        label: `${t("checkpoints.field.project")}: ${project?.code ?? params.projectId}`,
        onRemove: () => void setParams({ projectId: "" }),
      });
    }
    if (params.mine === "1") {
      list.push({
        key: "mine",
        label: t("checkpoints.queue.mine"),
        onRemove: () => void setParams({ mine: "0" }),
      });
    }
    if (params.q) {
      list.push({
        key: "q",
        label: `${t("action.search")} ${params.q}`,
        onRemove: () => {
          setSearch("");
          void setParams({ q: "" });
        },
      });
    }
    return list;
  }, [params, projects, setParams, setSearch]);

  if (!firstLoadDone && loading) {
    return <LoadingState label={t("state.loading")} kpis={4} blocks={2} />;
  }

  return (
    <div className="page-stack" aria-busy={loading || undefined}>
      <PageHeader
        eyebrow={t("overview.eyebrow")}
        title={t("checkpoints.queue.title")}
        description={t("checkpoints.subtitle")}
        actions={
          me.can("timeline.read") ? (
            <Button
              variant="outline"
              icon={Gavel}
              onClick={() => router.push("/timeline?mode=decisions")}
            >
              {t("nav.timeline")}
            </Button>
          ) : null
        }
      />

      <div className="kpi-grid" style={{ ["--kpi-cols" as string]: 4 }}>
        <StatCard
          accent="accent"
          label={t("checkpoints.queue.title")}
          value={fmtInt(rows.length)}
          sub={t("checkpoints.queue.all")}
        />
        <StatCard
          accent="gold"
          label={t("checkpoints.queue.mine")}
          value={fmtInt(stats.mine)}
          sub={t("decisions.decide")}
        />
        <StatCard
          label={t("checkpoints.lifecycle.ready")}
          value={fmtInt(stats.ready)}
          sub={t("checkpoints.requirements.progress")}
        />
        <StatCard
          label={t("checkpoints.overdue")}
          value={fmtInt(stats.overdue)}
          sub={`${t("checkpoints.field.readiness")} ⌀ ${fmtPercent(stats.avg)}`}
        />
      </div>

      <FilterToolbar chips={chips} onResetAll={resetFilters}>
        <ToolbarSearch
          value={search}
          onChange={setSearch}
          placeholder={t("action.search")}
          ariaLabel={t("checkpoints.field.name")}
        />
        <Select
          aria-label={t("checkpoints.field.lifecycle")}
          value={params.lifecycle}
          placeholder={t("common.all")}
          options={QUEUE_LIFECYCLES.map((v) => ({
            value: v,
            label: t(checkpointStateKey(v)),
          }))}
          onChange={(e) => void setParams({ lifecycle: e.target.value })}
        />
        <Select
          aria-label={t("checkpoints.field.type")}
          value={params.checkpointType}
          placeholder={t("common.all")}
          options={CHECKPOINT_TYPES.map((v) => ({
            value: v,
            label: t(checkpointTypeKey(v)),
          }))}
          onChange={(e) => void setParams({ checkpointType: e.target.value })}
        />
        <Select
          aria-label={t("checkpoints.field.project")}
          value={params.projectId}
          placeholder={t("common.all")}
          options={projects.map((p) => ({ value: p.id, label: p.code }))}
          onChange={(e) => void setParams({ projectId: e.target.value })}
        />
        <ToolbarSpacer />
      </FilterToolbar>

      {error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : rows.length === 0 ? (
        <Panel>
          <PanelBody>
            {filtersActive ? (
              <NoResultsState onResetFilters={resetFilters} />
            ) : (
              <EmptyState
                canAct={false}
                tone="muted"
                icon={Gavel}
                title={t("checkpoints.queue.empty")}
                description={t("overview.checkpoints.emptyDesc")}
              />
            )}
          </PanelBody>
        </Panel>
      ) : (
        // A8's queue component: the readiness bar, the "waiting on me" toggle and
        // the row ordering all live there, so both screens stay identical.
        <DecisionQueue
          checkpoints={rows}
          today={today}
          currentUserId={me.user?.id ?? null}
          mineOnly={params.mine === "1"}
          onMineOnlyChange={(value) => void setParams({ mine: value ? "1" : "0" })}
          onOpenCheckpoint={(id) => void setParams({ checkpoint: id })}
        />
      )}

      <CheckpointModal
        checkpointId={params.checkpoint === "" ? null : params.checkpoint}
        canWriteCheckpoints={canWriteCheckpoints}
        canDecide={canDecide}
        canOverrideReadiness={canOverrideReadiness}
        onClose={() => void setParams({ checkpoint: "" })}
        // The modal raises its own toasts; this only re-reads the queue so a
        // decided checkpoint disappears from it immediately.
        onChanged={refetch}
      />
    </div>
  );
}

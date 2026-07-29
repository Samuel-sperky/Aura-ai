"use client";

// `/work-items` — Úlohy (spec Q23–Q30).
//
// The LIST is the default view and requests only TOP-LEVEL rows
// (`parentId=none`); subtasks are fetched per expanded parent. That keeps the
// two-level hierarchy readable and the payload proportional to what is on screen.
// The BOARD groups by `status_category` and therefore asks for every row in the
// filter, subtasks included — a subtask that is "Prebieha" belongs in that column.
//
// Filters live in the URL (`nuqs`) and are mirrored into
// `user_view_preferences`; see the same note in ProjectsView for why the stored
// config is applied only when the entry URL was empty.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import { Columns3, Plus, Rows3 } from "lucide-react";
import {
  Button,
  Chip,
  FilterToolbar,
  PageHeader,
  Pagination,
  Panel,
  PanelBody,
  Segmented,
  Select,
  ToolbarSearch,
  ToolbarSpacer,
  useToast,
} from "@/components/ui";
import type { FilterChipDescriptor } from "@/components/ui";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  NoResultsState,
} from "@/components/states";
import { ApiError, apiGet, apiPost, qs } from "@/lib/api";
import type { ListResult } from "@/lib/api";
import { itemTypeKey, priorityKey, statusKey } from "@/lib/client/domain";
import { useDirectory } from "@/lib/client/useDirectory";
import { useMe } from "@/lib/client/useMe";
import { storedFilter, storedLiteral, useViewPrefs } from "@/lib/client/viewPrefs";
import {
  PRIORITIES,
  WORK_ITEM_STATUSES,
  WORK_ITEM_TYPES,
} from "@/lib/domain/contracts/workItems";
import type { WorkItemDto, WorkItemStatus } from "@/lib/domain/contracts/workItems";
import type { ProjectDto } from "@/lib/domain/contracts/projects";
import type { SprintWithMetricsDto } from "@/lib/domain/contracts/sprints";
import { t } from "@/lib/i18n";
import { MoveDialog } from "./MoveDialog";
import { WorkItemBoard } from "./WorkItemBoard";
import { WorkItemDetailModal } from "./WorkItemDetailModal";
import { WorkItemFormModal } from "./WorkItemFormModal";
import { WorkItemList } from "./WorkItemList";

const VIEWS = ["list", "board"] as const;
const FILTER_KEYS = [
  "view",
  "projectId",
  "sprintId",
  "assigneeId",
  "itemType",
  "status",
  "priority",
  "q",
  "backlog",
  "openOnly",
  "page",
  "pageSize",
] as const;

const SEARCH_DEBOUNCE_MS = 350;
/** The board has no pagination of its own — it needs the whole filtered set. */
const BOARD_LIMIT = 500;
const REFERENCE_LIMIT = 200;

export function WorkItemsView() {
  const toast = useToast();
  const me = useMe();
  const rawParams = useSearchParams();
  const directory = useDirectory();
  const {
    stored: storedPrefs,
    loading: prefsLoading,
    save: savePrefs,
  } = useViewPrefs("work-items");

  const [params, setParams] = useQueryStates(
    {
      view: parseAsStringLiteral(VIEWS).withDefault("list"),
      projectId: parseAsString.withDefault(""),
      sprintId: parseAsString.withDefault(""),
      assigneeId: parseAsString.withDefault(""),
      itemType: parseAsString.withDefault(""),
      status: parseAsString.withDefault(""),
      priority: parseAsString.withDefault(""),
      q: parseAsString.withDefault(""),
      backlog: parseAsString.withDefault(""),
      openOnly: parseAsString.withDefault(""),
      page: parseAsInteger.withDefault(1),
      pageSize: parseAsInteger.withDefault(50),
      item: parseAsString.withDefault(""),
    },
    { history: "replace", clearOnDefault: true },
  );

  const [urlWasEmpty] = useState(
    () => !FILTER_KEYS.some((key) => rawParams?.has(key)),
  );
  const restored = useRef(false);

  const [rows, setRows] = useState<WorkItemDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [firstLoadDone, setFirstLoadDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [sprints, setSprints] = useState<SprintWithMetricsDto[]>([]);
  const [parentCandidates, setParentCandidates] = useState<WorkItemDto[]>([]);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [childrenByParent, setChildrenByParent] = useState<Map<string, WorkItemDto[]>>(
    new Map(),
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  const [search, setSearch] = useState(params.q);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<WorkItemDto | null>(null);
  const [newParent, setNewParent] = useState<string | null>(null);
  /** Project pre-selected for a NEW item — never the filter, so opening
   *  "Pridať podúlohu" cannot silently narrow the list the user is looking at. */
  const [formProjectId, setFormProjectId] = useState<string>("");
  const [moveTarget, setMoveTarget] = useState<WorkItemDto | null>(null);
  const [detailToken, setDetailToken] = useState(0);

  const canWrite = me.can("work_items.write");
  const canComment = me.can("comments.write");
  const canLogTime = me.can("worklogs.write");

  const refetch = useCallback(() => {
    setChildrenByParent(new Map());
    setNonce((n) => n + 1);
  }, []);

  // ── restore / remember the view ────────────────────────────────────────────
  useEffect(() => {
    if (restored.current || prefsLoading || !storedPrefs) return;
    restored.current = true;
    if (!urlWasEmpty) return;
    const next = {
      view: storedLiteral(storedPrefs, "view", VIEWS) ?? "list",
      q: typeof storedPrefs.q === "string" ? storedPrefs.q : "",
      projectId: storedFilter(storedPrefs, "projectId"),
      sprintId: storedFilter(storedPrefs, "sprintId"),
      assigneeId: storedFilter(storedPrefs, "assigneeId"),
      itemType: storedFilter(storedPrefs, "itemType"),
      status: storedFilter(storedPrefs, "status"),
      priority: storedFilter(storedPrefs, "priority"),
      backlog: storedFilter(storedPrefs, "backlog"),
      openOnly: storedFilter(storedPrefs, "openOnly"),
    };
    setSearch(next.q);
    void setParams(next);
  }, [prefsLoading, storedPrefs, urlWasEmpty, setParams]);

  useEffect(() => {
    if (!restored.current) return;
    savePrefs({
      view: params.view,
      q: params.q,
      pageSize: params.pageSize,
      filters: {
        projectId: params.projectId,
        sprintId: params.sprintId,
        assigneeId: params.assigneeId,
        itemType: params.itemType,
        status: params.status,
        priority: params.priority,
        backlog: params.backlog,
        openOnly: params.openOnly,
      },
    });
  }, [
    savePrefs,
    params.view,
    params.q,
    params.pageSize,
    params.projectId,
    params.sprintId,
    params.assigneeId,
    params.itemType,
    params.status,
    params.priority,
    params.backlog,
    params.openOnly,
  ]);

  // ── search debounce ────────────────────────────────────────────────────────
  useEffect(() => {
    if (search === params.q) return;
    const timer = setTimeout(() => {
      void setParams({ q: search, page: 1 });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, params.q, setParams]);

  useEffect(() => {
    setSearch((current) => (current === params.q ? current : params.q));
  }, [params.q]);

  // ── rows ───────────────────────────────────────────────────────────────────
  const listQuery = useMemo(
    () => ({
      // The list is a hierarchy: only roots come back, children load on expand.
      parentId: params.view === "list" ? "none" : undefined,
      projectId: params.projectId || undefined,
      sprintId: params.sprintId || undefined,
      assigneeId: params.assigneeId || undefined,
      itemType: params.itemType || undefined,
      status: params.status || undefined,
      priority: params.priority || undefined,
      q: params.q || undefined,
      backlog: params.backlog === "1" ? "1" : undefined,
      openOnly: params.openOnly === "1" ? "1" : undefined,
      page: params.view === "board" ? 1 : params.page,
      pageSize: params.view === "board" ? BOARD_LIMIT : params.pageSize,
    }),
    [
      params.view,
      params.projectId,
      params.sprintId,
      params.assigneeId,
      params.itemType,
      params.status,
      params.priority,
      params.q,
      params.backlog,
      params.openOnly,
      params.page,
      params.pageSize,
    ],
  );

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;
    setLoading(true);
    apiGet<ListResult<WorkItemDto>>(
      `/api/work-items${qs(listQuery as Record<string, string | number | undefined>)}`,
      { signal: controller.signal },
    )
      .then((res) => {
        if (!alive) return;
        setRows(res.items);
        setTotal(res.pagination.total);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(
          err instanceof ApiError ? err.message : "Úlohy sa nepodarilo načítať.",
        );
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
        setFirstLoadDone(true);
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [listQuery, nonce]);

  // ── reference data for the filters and the form ────────────────────────────
  useEffect(() => {
    const controller = new AbortController();
    let alive = true;
    void Promise.all([
      apiGet<ListResult<ProjectDto>>(
        `/api/projects${qs({ pageSize: REFERENCE_LIMIT, sort: "code", dir: "asc" })}`,
        { signal: controller.signal },
      ),
      apiGet<ListResult<SprintWithMetricsDto>>(
        `/api/sprints${qs({ pageSize: REFERENCE_LIMIT })}`,
        { signal: controller.signal },
      ),
    ])
      .then(([p, s]) => {
        if (!alive) return;
        setProjects(p.items);
        setSprints(s.items);
      })
      .catch(() => {
        // The filters degrade to "everything"; the list itself still works.
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, []);

  // Parent candidates for the form: top-level items of the selected project.
  useEffect(() => {
    if (!params.projectId) {
      setParentCandidates([]);
      return;
    }
    const controller = new AbortController();
    let alive = true;
    apiGet<ListResult<WorkItemDto>>(
      `/api/work-items${qs({
        projectId: params.projectId,
        parentId: "none",
        pageSize: REFERENCE_LIMIT,
      })}`,
      { signal: controller.signal },
    )
      .then((res) => {
        if (alive) setParentCandidates(res.items);
      })
      .catch(() => {
        if (alive) setParentCandidates([]);
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [params.projectId, nonce]);

  // ── subtasks, lazily ───────────────────────────────────────────────────────
  const onToggleExpand = useCallback(
    (id: string) => {
      setExpanded((current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      setChildrenByParent((current) => {
        if (current.has(id)) return current;
        void apiGet<ListResult<WorkItemDto>>(
          `/api/work-items${qs({ parentId: id, pageSize: 100, sort: "rank", dir: "asc" })}`,
        )
          .then((res) =>
            setChildrenByParent((map) => new Map(map).set(id, res.items)),
          )
          .catch(() =>
            setChildrenByParent((map) => new Map(map).set(id, [])),
          );
        return current;
      });
    },
    [],
  );

  // ── mutations ──────────────────────────────────────────────────────────────
  const runAction = useCallback(
    async (item: WorkItemDto, action: string, body: unknown, fallback: string) => {
      setBusyId(item.id);
      try {
        await apiPost<{ workItem: WorkItemDto }>(
          `/api/work-items/${item.id}/${action}`,
          body,
        );
        refetch();
      } catch (err) {
        if (err instanceof ApiError) {
          toast.error(err.message);
          if (err.isVersionConflict) refetch();
        } else {
          toast.error(fallback);
        }
      } finally {
        setBusyId(null);
      }
    },
    [refetch, toast],
  );

  const onRank = useCallback(
    (item: WorkItemDto, rankValue: number) =>
      void runAction(
        item,
        "rank",
        { version: item.version, rankValue },
        "Zmena poradia zlyhala.",
      ),
    [runAction],
  );

  const onNudge = useCallback(
    (item: WorkItemDto, direction: "up" | "down") =>
      void runAction(
        item,
        "rank",
        { version: item.version, direction },
        "Zmena poradia zlyhala.",
      ),
    [runAction],
  );

  const onTransition = useCallback(
    (item: WorkItemDto, status: WorkItemStatus) =>
      void runAction(
        item,
        "transition",
        { version: item.version, status },
        "Zmena stavu zlyhala.",
      ),
    [runAction],
  );

  // ── filters ────────────────────────────────────────────────────────────────
  const filtersActive = FILTER_KEYS.some(
    (key) =>
      key !== "view" &&
      key !== "page" &&
      key !== "pageSize" &&
      (params as Record<string, unknown>)[key] !== "",
  );

  const resetFilters = useCallback(() => {
    setSearch("");
    void setParams({
      projectId: "",
      sprintId: "",
      assigneeId: "",
      itemType: "",
      status: "",
      priority: "",
      q: "",
      backlog: "",
      openOnly: "",
      page: 1,
    });
  }, [setParams]);

  const chips = useMemo<FilterChipDescriptor[]>(() => {
    const list: FilterChipDescriptor[] = [];
    const project = projects.find((p) => p.id === params.projectId);
    if (params.projectId) {
      list.push({
        key: "projectId",
        label: `${t("workItems.filter.project")}: ${project?.code ?? params.projectId}`,
        onRemove: () => void setParams({ projectId: "", page: 1 }),
      });
    }
    const sprint = sprints.find((s) => s.id === params.sprintId);
    if (params.sprintId) {
      list.push({
        key: "sprintId",
        label: `${t("workItems.filter.sprint")}: ${sprint?.name ?? params.sprintId}`,
        onRemove: () => void setParams({ sprintId: "", page: 1 }),
      });
    }
    if (params.assigneeId) {
      const who =
        params.assigneeId === "none"
          ? t("workItems.unassigned")
          : (directory.byId.get(params.assigneeId)?.displayName ?? params.assigneeId);
      list.push({
        key: "assigneeId",
        label: `${t("workItems.filter.assignee")}: ${who}`,
        onRemove: () => void setParams({ assigneeId: "", page: 1 }),
      });
    }
    if (params.itemType) {
      list.push({
        key: "itemType",
        label: `${t("workItems.filter.type")}: ${t(`itemType.${params.itemType}`)}`,
        onRemove: () => void setParams({ itemType: "", page: 1 }),
      });
    }
    if (params.status) {
      list.push({
        key: "status",
        label: `${t("workItems.filter.status")}: ${t(`status.${params.status}`)}`,
        onRemove: () => void setParams({ status: "", page: 1 }),
      });
    }
    if (params.priority) {
      list.push({
        key: "priority",
        label: `${t("workItems.filter.priority")}: ${params.priority}`,
        onRemove: () => void setParams({ priority: "", page: 1 }),
      });
    }
    if (params.backlog === "1") {
      list.push({
        key: "backlog",
        label: t("workItems.filter.backlogOnly"),
        onRemove: () => void setParams({ backlog: "", page: 1 }),
      });
    }
    if (params.openOnly === "1") {
      list.push({
        key: "openOnly",
        label: t("workItems.filter.openOnly"),
        onRemove: () => void setParams({ openOnly: "", page: 1 }),
      });
    }
    if (params.q) {
      list.push({
        key: "q",
        label: `${t("workItems.filter.search")}: ${params.q}`,
        onRemove: () => {
          setSearch("");
          void setParams({ q: "", page: 1 });
        },
      });
    }
    return list;
  }, [params, projects, sprints, directory.byId, setParams]);

  const sprintOptions = useMemo(
    () =>
      sprints
        .filter((s) => !params.projectId || s.projectId === params.projectId)
        .map((s) => ({ value: s.id, label: s.name })),
    [sprints, params.projectId],
  );

  const openItem = useCallback(
    (item: WorkItemDto) => void setParams({ item: item.id }),
    [setParams],
  );

  if (!firstLoadDone && loading) {
    return <LoadingState label={t("state.loading")} blocks={2} />;
  }

  return (
    <div className="page-stack" aria-busy={loading || undefined}>
      <PageHeader
        eyebrow={t("overview.eyebrow")}
        title={t("workItems.title")}
        description={t("workItems.subtitle")}
        actions={
          canWrite ? (
            <Button
              variant="accent"
              icon={Plus}
              onClick={() => {
                setEditing(null);
                setNewParent(null);
                setFormProjectId("");
                setFormOpen(true);
              }}
            >
              {t("workItems.action.create")}
            </Button>
          ) : null
        }
      />

      <FilterToolbar chips={chips} onResetAll={resetFilters}>
        <ToolbarSearch
          value={search}
          onChange={setSearch}
          placeholder={t("workItems.filter.search")}
          ariaLabel={t("workItems.filter.search")}
        />
        <Select
          aria-label={t("workItems.filter.project")}
          value={params.projectId}
          placeholder={t("common.all")}
          options={projects.map((p) => ({ value: p.id, label: p.code }))}
          onChange={(e) =>
            void setParams({ projectId: e.target.value, sprintId: "", page: 1 })
          }
        />
        <Select
          aria-label={t("workItems.filter.sprint")}
          value={params.sprintId}
          placeholder={t("workItems.noSprint")}
          options={sprintOptions}
          onChange={(e) => void setParams({ sprintId: e.target.value, page: 1 })}
        />
        <Select
          aria-label={t("workItems.filter.assignee")}
          value={params.assigneeId}
          placeholder={t("common.all")}
          options={[
            { value: "none", label: t("workItems.unassigned") },
            ...directory.users.map((u) => ({ value: u.id, label: u.displayName })),
          ]}
          onChange={(e) => void setParams({ assigneeId: e.target.value, page: 1 })}
        />
        <Select
          aria-label={t("workItems.filter.type")}
          value={params.itemType}
          placeholder={t("common.all")}
          options={WORK_ITEM_TYPES.map((v) => ({
            value: v,
            label: t(itemTypeKey(v)),
          }))}
          onChange={(e) => void setParams({ itemType: e.target.value, page: 1 })}
        />
        <Select
          aria-label={t("workItems.filter.status")}
          value={params.status}
          placeholder={t("common.all")}
          options={WORK_ITEM_STATUSES.map((v) => ({
            value: v,
            label: t(statusKey(v)),
          }))}
          onChange={(e) => void setParams({ status: e.target.value, page: 1 })}
        />
        <Select
          aria-label={t("workItems.filter.priority")}
          value={params.priority}
          placeholder={t("common.all")}
          options={PRIORITIES.map((v) => ({ value: v, label: t(priorityKey(v)) }))}
          onChange={(e) => void setParams({ priority: e.target.value, page: 1 })}
        />
        <Chip
          label={t("workItems.filter.backlogOnly")}
          active={params.backlog === "1"}
          onClick={() =>
            void setParams({ backlog: params.backlog === "1" ? "" : "1", page: 1 })
          }
        />
        <Chip
          label={t("workItems.filter.openOnly")}
          active={params.openOnly === "1"}
          onClick={() =>
            void setParams({ openOnly: params.openOnly === "1" ? "" : "1", page: 1 })
          }
        />
        <ToolbarSpacer />
        <Segmented
          ariaLabel={t("workItems.view.list")}
          value={params.view}
          onChange={(view) => void setParams({ view, page: 1 })}
          options={[
            { value: "list", label: t("workItems.view.list"), icon: Rows3 },
            { value: "board", label: t("workItems.view.board"), icon: Columns3 },
          ]}
        />
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
                title={t("workItems.empty")}
                canAct={canWrite}
                actionLabel={t("workItems.action.create")}
                onAction={() => {
                  setEditing(null);
                  setNewParent(null);
                  setFormProjectId("");
                  setFormOpen(true);
                }}
              />
            )}
          </PanelBody>
        </Panel>
      ) : params.view === "board" ? (
        <WorkItemBoard
          items={rows}
          onOpen={openItem}
          onTransition={onTransition}
          canWrite={canWrite}
        />
      ) : (
        <Panel>
          <PanelBody flush>
            <WorkItemList
              items={rows}
              childrenByParent={childrenByParent}
              expanded={expanded}
              onToggleExpand={onToggleExpand}
              onOpen={openItem}
              onAddSubtask={(parent) => {
                setEditing(null);
                setNewParent(parent.id);
                setFormProjectId(parent.projectId);
                setFormOpen(true);
              }}
              onMove={setMoveTarget}
              onRank={onRank}
              onNudge={onNudge}
              canWrite={canWrite}
              busyId={busyId}
            />
          </PanelBody>
        </Panel>
      )}

      {params.view === "list" && rows.length > 0 ? (
        <Pagination
          page={params.page}
          pageSize={params.pageSize}
          total={total}
          onPageChange={(page) => void setParams({ page })}
          onPageSizeChange={(pageSize) => void setParams({ pageSize, page: 1 })}
        />
      ) : null}

      <WorkItemDetailModal
        itemId={params.item === "" ? null : params.item}
        refreshToken={detailToken}
        canWrite={canWrite}
        canComment={canComment}
        canLogTime={canLogTime}
        siblings={rows}
        onClose={() => void setParams({ item: "" })}
        onEdit={(item) => {
          setEditing(item);
          setNewParent(null);
          setFormOpen(true);
        }}
        onAddSubtask={(parent) => {
          setEditing(null);
          setNewParent(parent.id);
          setFormProjectId(parent.projectId);
          setFormOpen(true);
        }}
        onChanged={(item) => {
          refetch();
          if (item === null) void setParams({ item: "" });
        }}
      />

      <WorkItemFormModal
        open={formOpen}
        item={editing}
        defaultProjectId={formProjectId || params.projectId || projects[0]?.id || ""}
        defaultParentId={newParent}
        projects={projects}
        sprints={sprints}
        users={directory.users}
        parentCandidates={parentCandidates.length > 0 ? parentCandidates : rows}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          refetch();
          setDetailToken((n) => n + 1);
        }}
      />

      <MoveDialog
        item={moveTarget}
        sprints={sprints}
        onClose={() => setMoveTarget(null)}
        onMoved={() => refetch()}
      />
    </div>
  );
}

"use client";

// `/projects` — the project register (spec Q19–Q22).
//
// FILTER STATE LIVES IN TWO PLACES, ON PURPOSE:
//   * the URL (`nuqs`) is the truth for the CURRENT view — shareable, bookmarkable
//     and restored by the Back button;
//   * `user_view_preferences` is the DEFAULT applied when the URL carries nothing,
//     so coming back to /projects lands on the filters you left.
// The stored config is therefore applied exactly once, and only when the URL
// arrived empty — otherwise a shared link would be silently rewritten.
//
// The detail modal is driven by `?project=<id>` (contract §3.2/57), so a project
// is linkable and Back closes it.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import { LayoutGrid, Plus, Rows3 } from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  FilterToolbar,
  PageHeader,
  Pagination,
  Panel,
  PanelBody,
  Pill,
  ProgressBar,
  Select,
  Table,
  ToolbarSearch,
  ToolbarSpacer,
  Segmented,
  healthTone,
} from "@/components/ui";
import type { FilterChipDescriptor, TableColumn, TableSort } from "@/components/ui";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  NoResultsState,
} from "@/components/states";
import { ApiError, apiGet, qs } from "@/lib/api";
import type { ListResult } from "@/lib/api";
import {
  HEALTH_TONE,
  PRIORITY_TONE,
  PROJECT_STATUS_TONE,
  healthKey,
  projectStatusKey,
} from "@/lib/client/domain";
import { EM_DASH, dueLabel, fmtDate, fmtPercent } from "@/lib/client/format";
import { useMe } from "@/lib/client/useMe";
import { storedFilter, storedLiteral, useViewPrefs } from "@/lib/client/viewPrefs";
import { PRIORITIES, PROJECT_STATUSES } from "@/lib/domain/contracts/projects";
import type {
  AreaDto,
  ProjectDto,
  ProjectHealth,
} from "@/lib/domain/contracts/projects";
import { t } from "@/lib/i18n";
import { ProjectCards } from "./ProjectCards";
import { ProjectDetailModal } from "./ProjectDetailModal";
import { ProjectFormModal } from "./ProjectFormModal";

const VIEWS = ["table", "cards"] as const;
const DIRS = ["asc", "desc"] as const;

/** Table column key → the sort key the API accepts. */
const SORTABLE: Readonly<Record<string, string>> = {
  code: "code",
  name: "name",
  area: "area",
  status: "status",
  health: "health",
  progress: "progress",
  priority: "priority",
  nextCheckpoint: "nextCheckpointDate",
};

/** URL keys that count as "the link already carries a view". */
const FILTER_KEYS = ["area", "status", "priority", "q", "sort", "dir", "view", "page", "pageSize"] as const;

const SEARCH_DEBOUNCE_MS = 350;

export function ProjectsView() {
  const me = useMe();
  const rawParams = useSearchParams();
  const {
    stored: storedPrefs,
    loading: prefsLoading,
    save: savePrefs,
  } = useViewPrefs("projects");

  const [params, setParams] = useQueryStates(
    {
      view: parseAsStringLiteral(VIEWS).withDefault("table"),
      area: parseAsString.withDefault(""),
      status: parseAsString.withDefault(""),
      priority: parseAsString.withDefault(""),
      q: parseAsString.withDefault(""),
      sort: parseAsString.withDefault("risk"),
      dir: parseAsStringLiteral(DIRS).withDefault("asc"),
      page: parseAsInteger.withDefault(1),
      pageSize: parseAsInteger.withDefault(50),
      project: parseAsString.withDefault(""),
    },
    { history: "replace", clearOnDefault: true },
  );

  // Was the entry URL free of view state? Captured on the FIRST render, before
  // anything can write to the query string.
  const [urlWasEmpty] = useState(
    () => !FILTER_KEYS.some((key) => rawParams?.has(key)),
  );
  const restored = useRef(false);

  const [rows, setRows] = useState<ProjectDto[]>([]);
  const [total, setTotal] = useState(0);
  const [areas, setAreas] = useState<AreaDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [firstLoadDone, setFirstLoadDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const [search, setSearch] = useState(params.q);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectDto | null>(null);
  const [suggested, setSuggested] = useState<ProjectHealth | null>(null);
  const [detailToken, setDetailToken] = useState(0);

  const canWrite = me.can("projects.write");
  const canDelete = me.can("projects.delete");

  // ── restore the remembered view once ────────────────────────────────────────
  useEffect(() => {
    if (restored.current || prefsLoading || !storedPrefs) return;
    restored.current = true;
    if (!urlWasEmpty) return;
    const stored = storedPrefs;
    const next = {
      view: storedLiteral(stored, "view", VIEWS) ?? "table",
      sort: typeof stored.sort === "string" ? stored.sort : "risk",
      dir: storedLiteral(stored, "dir", DIRS) ?? "asc",
      area: storedFilter(stored, "area"),
      status: storedFilter(stored, "status"),
      priority: storedFilter(stored, "priority"),
      q: typeof stored.q === "string" ? stored.q : "",
    };
    setSearch(next.q);
    void setParams(next);
  }, [prefsLoading, storedPrefs, urlWasEmpty, setParams]);

  // ── remember the current view ──────────────────────────────────────────────
  useEffect(() => {
    if (!restored.current) return;
    savePrefs({
      view: params.view,
      sort: params.sort,
      dir: params.dir,
      q: params.q,
      pageSize: params.pageSize,
      filters: {
        area: params.area,
        status: params.status,
        priority: params.priority,
      },
    });
  }, [
    savePrefs,
    params.view,
    params.sort,
    params.dir,
    params.q,
    params.pageSize,
    params.area,
    params.status,
    params.priority,
  ]);

  // ── debounce the search box into the URL ───────────────────────────────────
  useEffect(() => {
    if (search === params.q) return;
    const timer = setTimeout(() => {
      void setParams({ q: search, page: 1 });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, params.q, setParams]);

  // Keep the box in sync when the URL changes from elsewhere (Back, restore).
  useEffect(() => {
    setSearch((current) => (current === params.q ? current : params.q));
  }, [params.q]);

  // ── data ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();
    let alive = true;
    setLoading(true);
    apiGet<ListResult<ProjectDto>>(
      `/api/projects${qs({
        area: params.area,
        status: params.status,
        priority: params.priority,
        q: params.q,
        sort: params.sort,
        dir: params.dir,
        page: params.page,
        pageSize: params.pageSize,
      })}`,
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
          err instanceof ApiError
            ? err.message
            : "Projekty sa nepodarilo načítať.",
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
  }, [
    params.area,
    params.status,
    params.priority,
    params.q,
    params.sort,
    params.dir,
    params.page,
    params.pageSize,
    nonce,
  ]);

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;
    apiGet<ListResult<AreaDto>>("/api/areas", { signal: controller.signal })
      .then((res) => {
        if (alive) setAreas(res.items);
      })
      .catch(() => {
        // The area filter degrades to free text; not worth a toast.
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [nonce]);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  const filtersActive =
    params.area !== "" ||
    params.status !== "" ||
    params.priority !== "" ||
    params.q !== "";

  const resetFilters = useCallback(() => {
    setSearch("");
    void setParams({ area: "", status: "", priority: "", q: "", page: 1 });
  }, [setParams]);

  const chips = useMemo<FilterChipDescriptor[]>(() => {
    const list: FilterChipDescriptor[] = [];
    if (params.area) {
      list.push({
        key: "area",
        label: `${t("projects.field.area")}: ${params.area}`,
        onRemove: () => void setParams({ area: "", page: 1 }),
      });
    }
    if (params.status) {
      list.push({
        key: "status",
        label: `${t("projects.field.status")}: ${t(`projectStatus.${params.status}`)}`,
        onRemove: () => void setParams({ status: "", page: 1 }),
      });
    }
    if (params.priority) {
      list.push({
        key: "priority",
        label: `${t("projects.field.priority")}: ${params.priority}`,
        onRemove: () => void setParams({ priority: "", page: 1 }),
      });
    }
    if (params.q) {
      list.push({
        key: "q",
        label: `${t("projects.filter.search")}: ${params.q}`,
        onRemove: () => {
          setSearch("");
          void setParams({ q: "", page: 1 });
        },
      });
    }
    return list;
  }, [params.area, params.status, params.priority, params.q, setParams]);

  const sort = useMemo<TableSort | undefined>(() => {
    const key = Object.keys(SORTABLE).find((k) => SORTABLE[k] === params.sort);
    return key ? { key, dir: params.dir } : undefined;
  }, [params.sort, params.dir]);

  const onSortChange = useCallback(
    (key: string) => {
      const apiKey = SORTABLE[key];
      if (!apiKey) return;
      if (params.sort === apiKey) {
        void setParams({ dir: params.dir === "asc" ? "desc" : "asc" });
        return;
      }
      void setParams({ sort: apiKey, dir: "asc" });
    },
    [params.sort, params.dir, setParams],
  );

  const openProject = useCallback(
    (project: ProjectDto) => void setParams({ project: project.id }),
    [setParams],
  );

  const onSaved = useCallback(
    (project: ProjectDto) => {
      setRows((list) => {
        const at = list.findIndex((p) => p.id === project.id);
        if (at === -1) return list;
        const next = [...list];
        next[at] = project;
        return next;
      });
      // A created project (or a changed code) can move in the sort order, so the
      // list is refetched rather than patched optimistically.
      refetch();
      setDetailToken((n) => n + 1);
    },
    [refetch],
  );

  const onDeleted = useCallback(
    (projectId: string) => {
      setRows((list) => list.filter((p) => p.id !== projectId));
      setTotal((n) => Math.max(0, n - 1));
      refetch();
    },
    [refetch],
  );

  const columns = useMemo<TableColumn<ProjectDto>[]>(
    () => [
      {
        key: "code",
        header: t("projects.field.code"),
        width: "110px",
        sortable: true,
        render: (p) => <span className="pv-code">{p.code}</span>,
      },
      {
        key: "name",
        header: t("projects.field.name"),
        sortable: true,
        render: (p) => <span className="truncate">{p.name}</span>,
      },
      {
        key: "area",
        header: t("projects.field.area"),
        sortable: true,
        width: "150px",
        render: (p) =>
          p.area ? <Badge>{p.area}</Badge> : <span className="muted">{EM_DASH}</span>,
      },
      {
        key: "status",
        header: t("projects.field.status"),
        sortable: true,
        width: "128px",
        render: (p) => (
          <Badge tone={PROJECT_STATUS_TONE[p.status]}>
            {t(projectStatusKey(p.status))}
          </Badge>
        ),
      },
      {
        key: "health",
        header: t("projects.field.health"),
        sortable: true,
        width: "120px",
        render: (p) => (
          <Pill tone={HEALTH_TONE[p.health]}>{t(healthKey(p.health))}</Pill>
        ),
      },
      {
        key: "priority",
        header: t("projects.field.priority"),
        sortable: true,
        width: "80px",
        render: (p) => <Badge tone={PRIORITY_TONE[p.priority]}>{p.priority}</Badge>,
      },
      {
        key: "progress",
        header: t("projects.field.progress"),
        sortable: true,
        width: "150px",
        render: (p) => (
          <span className="pv-progress">
            <ProgressBar
              value={p.progress}
              tone={healthTone(p.progress)}
              label={`${t("projects.field.progress")} ${p.code}`}
            />
            <span className="tnum">{fmtPercent(p.progress)}</span>
          </span>
        ),
      },
      {
        key: "nextCheckpoint",
        header: t("projects.field.nextCheckpoint"),
        sortable: true,
        render: (p) =>
          p.nextCheckpoint ? (
            <span className="pv-stack">
              <span className="truncate">{p.nextCheckpoint}</span>
              <span className="meta">
                {fmtDate(p.nextCheckpointDate)} · {dueLabel(p.nextCheckpointDate)}
              </span>
            </span>
          ) : (
            <span className="muted">{EM_DASH}</span>
          ),
      },
      {
        key: "owner",
        header: t("projects.field.owner"),
        width: "170px",
        render: (p) =>
          p.owner ? (
            <span className="row">
              <Avatar size="sm" name={p.owner} initials={p.ownerInitials} />
              <span className="truncate">{p.owner}</span>
            </span>
          ) : (
            <span className="muted">{EM_DASH}</span>
          ),
      },
    ],
    [],
  );

  const areaOptions = useMemo(
    () => areas.map((a) => ({ value: a.name, label: a.name || t("areas.unassigned") })),
    [areas],
  );

  if (!firstLoadDone && loading) {
    return <LoadingState label={t("state.loading")} kpis={0} blocks={2} />;
  }

  return (
    <div className="page-stack" aria-busy={loading || undefined}>
      <PageHeader
        eyebrow={t("overview.eyebrow")}
        title={t("projects.title")}
        description={t("projects.subtitle")}
        actions={
          canWrite ? (
            <Button
              variant="accent"
              icon={Plus}
              onClick={() => {
                setEditing(null);
                setSuggested(null);
                setFormOpen(true);
              }}
            >
              {t("projects.new")}
            </Button>
          ) : null
        }
      />

      <FilterToolbar chips={chips} onResetAll={resetFilters}>
        <ToolbarSearch
          value={search}
          onChange={setSearch}
          placeholder={t("projects.filter.search")}
          ariaLabel={t("projects.filter.search")}
        />
        <Select
          aria-label={t("projects.filter.area")}
          value={params.area}
          placeholder={t("projects.filter.allAreas")}
          options={areaOptions}
          onChange={(e) => void setParams({ area: e.target.value, page: 1 })}
        />
        <Select
          aria-label={t("projects.filter.status")}
          value={params.status}
          placeholder={t("projects.filter.allStatuses")}
          options={PROJECT_STATUSES.map((s) => ({
            value: s,
            label: t(projectStatusKey(s)),
          }))}
          onChange={(e) => void setParams({ status: e.target.value, page: 1 })}
        />
        <Select
          aria-label={t("projects.filter.priority")}
          value={params.priority}
          placeholder={t("projects.filter.allPriorities")}
          options={PRIORITIES.map((p) => ({ value: p, label: p }))}
          onChange={(e) => void setParams({ priority: e.target.value, page: 1 })}
        />
        <Select
          aria-label={t("projects.sort.label")}
          value={params.sort}
          options={[
            { value: "risk", label: t("projects.sort.risk") },
            { value: "code", label: t("projects.sort.code") },
            { value: "name", label: t("projects.sort.name") },
            { value: "progress", label: t("projects.sort.progress") },
            { value: "endDate", label: t("projects.sort.endDate") },
            {
              value: "nextCheckpointDate",
              label: t("projects.sort.nextCheckpointDate"),
            },
            { value: "updatedAt", label: t("projects.sort.updatedAt") },
          ]}
          onChange={(e) =>
            void setParams({ sort: e.target.value || "risk", dir: "asc" })
          }
        />
        <ToolbarSpacer />
        <Segmented
          ariaLabel={t("projects.viewTable")}
          value={params.view}
          onChange={(view) => void setParams({ view })}
          options={[
            { value: "table", label: t("projects.viewTable"), icon: Rows3 },
            { value: "cards", label: t("projects.viewCards"), icon: LayoutGrid },
          ]}
        />
      </FilterToolbar>

      {error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : rows.length === 0 ? (
        filtersActive ? (
          <Panel>
            <PanelBody>
              <NoResultsState onResetFilters={resetFilters} />
            </PanelBody>
          </Panel>
        ) : (
          <Panel>
            <PanelBody>
              <EmptyState
                title={t("projects.empty")}
                description={t("projects.emptyDesc")}
                canAct={canWrite}
                actionLabel={t("projects.new")}
                onAction={() => {
                  setEditing(null);
                  setSuggested(null);
                  setFormOpen(true);
                }}
              />
            </PanelBody>
          </Panel>
        )
      ) : params.view === "cards" ? (
        <ProjectCards projects={rows} onOpen={openProject} />
      ) : (
        <Panel>
          <PanelBody flush>
            <Table
              className="pv-table"
              columns={columns}
              rows={rows}
              rowKey={(p) => p.id}
              rowsClickable
              onRowClick={openProject}
              sort={sort}
              onSortChange={onSortChange}
              caption={t("projects.title")}
              empty={<NoResultsState bare onResetFilters={resetFilters} />}
            />
          </PanelBody>
        </Panel>
      )}

      {rows.length > 0 ? (
        <Pagination
          page={params.page}
          pageSize={params.pageSize}
          total={total}
          onPageChange={(page) => void setParams({ page })}
          onPageSizeChange={(pageSize) => void setParams({ pageSize, page: 1 })}
        />
      ) : null}

      <ProjectDetailModal
        projectId={params.project === "" ? null : params.project}
        refreshToken={detailToken}
        canWrite={canWrite}
        canDelete={canDelete}
        onClose={() => void setParams({ project: "" })}
        onEdit={(project, suggestedHealth) => {
          setEditing(project);
          setSuggested(suggestedHealth);
          setFormOpen(true);
        }}
        onDeleted={onDeleted}
      />

      <ProjectFormModal
        open={formOpen}
        project={editing}
        suggestedHealth={suggested}
        areas={areas.map((a) => a.name).filter((n) => n !== "")}
        onClose={() => setFormOpen(false)}
        onSaved={(project) => {
          onSaved(project);
          // A brand-new project opens straight into its detail so the next step
          // (items, checkpoints) is one click away.
          if (!editing) void setParams({ project: project.id });
        }}
      />

      <style>{PROJECTS_CSS}</style>
    </div>
  );
}

const PROJECTS_CSS = `
.pv-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: var(--text-xs); letter-spacing: 0.02em; color: var(--ink2);
  white-space: nowrap;
}
.pv-progress { display: flex; align-items: center; gap: var(--space-2); }
.pv-progress .progress { flex: 1 1 auto; min-width: 44px; }
.pv-stack { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
/* Nine columns cannot fit 390 px: the wrapper scrolls horizontally instead of
   crushing them (.tbl-wrap already has overflow-x: auto). */
table.pv-table { min-width: 940px; }
@media (max-width: 700px) {
  .filter-toolbar .select { flex: 1 1 140px; }
}
`;

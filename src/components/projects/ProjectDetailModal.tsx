"use client";

// Project detail, in a CENTRED MODAL opened by `?project=<id>` (contract §3.2/57,
// spec Q22). Four tabs: Prehľad · Položky · Checkpointy · Aktivita.
//
// The endpoint `GET /api/projects/[id]` returns the project, the aggregate stats
// behind the tab counters, the health SUGGESTION and the last ten audit rows in
// one response. The rows behind the two middle tabs come from the work-item and
// checkpoint list endpoints and are fetched LAZILY — opening a project to read its
// description must not pull a hundred work items.
//
// `progress` and `nextCheckpoint` are shown here read-only: they are computed
// server-side and the form deliberately has no input for them.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  CalendarRange,
  ExternalLink,
  ListChecks,
  Pencil,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  ConfirmDialog,
  Modal,
  Pill,
  ProgressBar,
  StatCard,
  Table,
  Tabs,
  healthTone,
  useToast,
} from "@/components/ui";
import type { TableColumn } from "@/components/ui";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { ApiError, apiDelete, apiGet, qs } from "@/lib/api";
import type { ListResult } from "@/lib/api";
import {
  CHECKPOINT_LIFECYCLE_TONE,
  HEALTH_TONE,
  ITEM_TYPE_ICON,
  PRIORITY_TONE,
  PROJECT_STATUS_TONE,
  WORK_ITEM_STATUS_TONE,
  checkpointStateKey,
  checkpointTypeKey,
  healthKey,
  itemTypeKey,
  projectStatusKey,
  statusKey,
} from "@/lib/client/domain";
import {
  EM_DASH,
  dueLabel,
  fmtDate,
  fmtDateTime,
  fmtInt,
  fmtMinutes,
  fmtPercent,
  fmtRollupPoints,
} from "@/lib/client/format";
import { t } from "@/lib/i18n";
import type { CheckpointDto } from "@/lib/domain/contracts/checkpoints";
import type {
  ProjectDetailDto,
  ProjectDto,
  ProjectHealth,
} from "@/lib/domain/contracts/projects";
import type { WorkItemDto } from "@/lib/domain/contracts/workItems";

type DetailTab = "overview" | "items" | "checkpoints" | "activity";

/** Rows pulled per tab; the counters come from the aggregate stats, not from these. */
const TAB_ROW_LIMIT = 100;

/** Everything that must start over when another project is opened. */
interface TabState {
  projectId: string | null;
  tab: DetailTab;
  items: WorkItemDto[] | null;
  checkpoints: CheckpointDto[] | null;
  error: string | null;
}

const FRESH_TABS = {
  tab: "overview" as DetailTab,
  items: null,
  checkpoints: null,
  error: null,
};

export interface ProjectDetailModalProps {
  /** Project id from `?project=`; null closes the modal. */
  projectId: string | null;
  onClose: () => void;
  /** Open the edit form over this project (owned by the parent view). */
  onEdit: (project: ProjectDto, suggestedHealth: ProjectHealth) => void;
  /** The project was deleted — the parent drops it from the list. */
  onDeleted: (projectId: string) => void;
  canWrite: boolean;
  canDelete: boolean;
  /** Bump to force a refetch after the parent saved an edit. */
  refreshToken?: number;
  /**
   * Bump when the modal is OPENED. Distinct from `refreshToken` on purpose — the
   * two want opposite things on screen: a refresh after saving keeps the current
   * content visible, while a fresh open must start from the skeleton. Without this
   * token, reopening the SAME project showed the previous response for a frame,
   * because the cached detail was keyed by project id alone.
   */
  openToken?: number;
}

export function ProjectDetailModal({
  projectId,
  onClose,
  onEdit,
  onDeleted,
  canWrite,
  canDelete,
  refreshToken = 0,
  openToken = 0,
}: ProjectDetailModalProps) {
  const router = useRouter();
  const toast = useToast();

  // The response is stored WITH the open it belongs to, so closing the modal drops
  // it during render instead of through a `setDetail(null)` in the effect body.
  // `loading` is derived the same way but keyed by the refresh token too: a
  // parent-triggered refetch must keep the current content on screen rather than
  // flash a skeleton, which is exactly what the old `setLoading(true)` did.
  const [fetched, setFetched] = useState<{
    openKey: string;
    detail: ProjectDetailDto;
  } | null>(null);
  // Keyed by the OPEN, not by the project: reopening the same project is a new open
  // and must show the skeleton rather than the previous response. `refreshToken` is
  // deliberately absent from this key — a refetch after saving keeps content up.
  const openKey = projectId ? `${projectId}#${openToken}` : "";
  const detail = fetched?.openKey === openKey ? fetched.detail : null;

  const requestKey = projectId ? `${openKey}#${refreshToken}` : "";
  const [loadedKey, setLoadedKey] = useState("");
  const loading = projectId !== null && loadedKey !== requestKey;

  const [error, setError] = useState<string | null>(null);

  // Tab + lazy caches are stored WITH their project as well, so opening another
  // project resets all four during render. The reset effect this replaces called
  // four setStates synchronously in its body on every open
  // (react-hooks/set-state-in-effect).
  const [tabState, setTabState] = useState<TabState>({
    projectId: null,
    ...FRESH_TABS,
  });
  const tabs: TabState =
    tabState.projectId === projectId ? tabState : { projectId, ...FRESH_TABS };
  const { tab, items, checkpoints, error: tabError } = tabs;

  const patchTabs = useCallback(
    (patch: Partial<Omit<TabState, "projectId">>) =>
      setTabState((current) => ({
        ...(current.projectId === projectId
          ? current
          : { projectId, ...FRESH_TABS }),
        ...patch,
        projectId,
      })),
    [projectId],
  );

  const setTab = useCallback(
    (next: DetailTab) => patchTabs({ tab: next }),
    [patchTabs],
  );

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    const controller = new AbortController();
    let alive = true;
    apiGet<ProjectDetailDto>(`/api/projects/${projectId}`, {
      signal: controller.signal,
    })
      .then((data) => {
        if (!alive) return;
        setFetched({ openKey, detail: data });
        setError(null);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Projekt sa nepodarilo načítať.",
        );
      })
      .finally(() => {
        if (alive) setLoadedKey(requestKey);
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [projectId, openKey, requestKey]);

  // Lazy tab loads. Each runs once per opened project. `patchTabs` is bound to the
  // project that started the request, so a response that lands after the user
  // switched projects can no longer show up under the new one.
  useEffect(() => {
    if (!projectId) return;
    if (tab === "items" && items === null) {
      apiGet<ListResult<WorkItemDto>>(
        `/api/work-items${qs({ projectId, pageSize: TAB_ROW_LIMIT, sort: "rank", dir: "asc" })}`,
      )
        .then((res) => patchTabs({ items: res.items }))
        .catch((err: unknown) =>
          patchTabs({
            error:
              err instanceof ApiError
                ? err.message
                : "Položky sa nepodarilo načítať.",
          }),
        );
    }
    if (tab === "checkpoints" && checkpoints === null) {
      apiGet<ListResult<CheckpointDto>>(
        `/api/checkpoints${qs({ projectId, pageSize: TAB_ROW_LIMIT, sort: "dueDate", dir: "asc" })}`,
      )
        .then((res) => patchTabs({ checkpoints: res.items }))
        .catch((err: unknown) =>
          patchTabs({
            error:
              err instanceof ApiError
                ? err.message
                : "Checkpointy sa nepodarilo načítať.",
          }),
        );
    }
  }, [tab, projectId, items, checkpoints, patchTabs]);

  const onConfirmDelete = useCallback(async () => {
    if (!detail) return;
    setDeleting(true);
    try {
      await apiDelete(`/api/projects/${detail.project.id}`, {
        code: detail.project.code,
      });
      toast.success(t("projects.delete.done"));
      setConfirmDelete(false);
      onDeleted(detail.project.id);
      onClose();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Zmazanie projektu zlyhalo.",
      );
    } finally {
      setDeleting(false);
    }
  }, [detail, onClose, onDeleted, toast]);

  const itemColumns = useMemo<TableColumn<WorkItemDto>[]>(
    () => [
      {
        key: "title",
        header: t("workItems.field.title"),
        render: (w) => {
          const Icon = ITEM_TYPE_ICON[w.itemType];
          return (
            <span className="row">
              <Icon
                size={14}
                aria-hidden="true"
                className="muted"
              />
              <span className="truncate">{w.title}</span>
              <span className="sr-only">{t(itemTypeKey(w.itemType))}</span>
            </span>
          );
        },
      },
      {
        key: "status",
        header: t("workItems.field.status"),
        width: "128px",
        render: (w) => (
          <Badge tone={WORK_ITEM_STATUS_TONE[w.status]}>{t(statusKey(w.status))}</Badge>
        ),
      },
      {
        key: "priority",
        header: t("workItems.field.priority"),
        width: "72px",
        render: (w) => <Badge tone={PRIORITY_TONE[w.priority]}>{w.priority}</Badge>,
      },
      {
        key: "points",
        header: t("workItems.field.storyPoints"),
        align: "right",
        width: "104px",
        render: (w) =>
          fmtRollupPoints(w.storyPoints, w.childStoryPoints, w.childCount),
      },
      {
        key: "dueDate",
        header: t("workItems.field.dueDate"),
        width: "120px",
        render: (w) =>
          w.dueDate ? fmtDate(w.dueDate) : <span className="muted">{EM_DASH}</span>,
      },
    ],
    [],
  );

  const checkpointColumns = useMemo<TableColumn<CheckpointDto>[]>(
    () => [
      {
        key: "name",
        header: t("checkpoints.field.name"),
        render: (c) => (
          <span className="pd-stack">
            <span className="truncate">{c.name}</span>
            <span className="meta">{t(checkpointTypeKey(c.checkpointType))}</span>
          </span>
        ),
      },
      {
        key: "dueDate",
        header: t("checkpoints.field.dueDate"),
        width: "150px",
        render: (c) => (
          <span className="pd-stack">
            <span>{fmtDate(c.dueDate)}</span>
            <span className={c.overdue ? "meta pd-late" : "meta"}>
              {dueLabel(c.dueDate)}
            </span>
          </span>
        ),
      },
      {
        key: "readiness",
        header: t("checkpoints.field.readiness"),
        width: "150px",
        render: (c) => (
          <span className="pd-progress">
            <ProgressBar
              value={c.readiness}
              tone={healthTone(c.readiness)}
              label={`${t("checkpoints.field.readiness")} ${c.name}`}
            />
            <span className="tnum">
              {fmtInt(c.requiredCompleteCount)}/{fmtInt(c.requiredCount)}
            </span>
          </span>
        ),
      },
      {
        key: "lifecycle",
        header: t("checkpoints.field.lifecycle"),
        width: "128px",
        render: (c) => (
          <Pill tone={CHECKPOINT_LIFECYCLE_TONE[c.lifecycle]}>
            {t(checkpointStateKey(c.lifecycle))}
          </Pill>
        ),
      },
    ],
    [],
  );

  if (!projectId) return null;

  const project = detail?.project ?? null;
  const stats = detail?.stats ?? null;

  return (
    <>
      <Modal
        open
        onClose={onClose}
        size="lg"
        title={project ? `${project.code} · ${project.name}` : t("projects.detail.title")}
        subtitle={
          project
            ? [
                project.area || t("areas.unassigned"),
                t(projectStatusKey(project.status)),
                `${t("projects.field.priority")} ${project.priority}`,
              ].join(" · ")
            : undefined
        }
        footer={
          project ? (
            <>
              {canDelete ? (
                <Button
                  variant="danger"
                  icon={Trash2}
                  onClick={() => setConfirmDelete(true)}
                >
                  {t("action.delete")}
                </Button>
              ) : null}
              <span className="spacer" />
              <Button variant="ghost" onClick={onClose}>
                {t("action.close")}
              </Button>
              {canWrite ? (
                <Button
                  variant="accent"
                  icon={Pencil}
                  onClick={() =>
                    onEdit(project, detail?.suggestedHealth ?? project.health)
                  }
                >
                  {t("action.edit")}
                </Button>
              ) : null}
            </>
          ) : null
        }
      >
        {loading && !detail ? (
          <LoadingState kpis={0} blocks={2} />
        ) : error && !detail ? (
          <ErrorState message={error} bare />
        ) : project && stats ? (
          <div className="pd-root">
            <Tabs
              ariaLabel={t("projects.detail.title")}
              value={tab}
              onChange={setTab}
              items={[
                { value: "overview", label: t("projects.detail.tab.overview") },
                {
                  value: "items",
                  label: t("projects.detail.tab.items"),
                  count: stats.workItems.total,
                },
                {
                  value: "checkpoints",
                  label: t("projects.detail.tab.checkpoints"),
                  count: stats.checkpoints.total,
                },
                {
                  value: "activity",
                  label: t("projects.detail.tab.activity"),
                  count: detail?.activity.length ?? 0,
                },
              ]}
            />

            {tab === "overview" ? (
              <div
                role="tabpanel"
                id="panel-overview"
                aria-labelledby="tab-overview"
                className="pd-panel"
              >
                {project.description ? (
                  <p className="pd-desc">{project.description}</p>
                ) : null}

                <div className="kpi-grid" style={{ ["--kpi-cols" as string]: 4 }}>
                  <StatCard
                    accent="accent"
                    label={t("projects.field.progress")}
                    value={fmtPercent(project.progress)}
                    sub={t("projects.hint.progressComputed")}
                  />
                  <StatCard
                    label={t("projects.detail.storyPoints")}
                    value={`${fmtInt(stats.workItems.storyPoints.done)} / ${fmtInt(stats.workItems.storyPoints.total)}`}
                    sub={t("projects.detail.storyPointsDone")}
                  />
                  <StatCard
                    label={t("projects.detail.itemsOverdue")}
                    value={fmtInt(stats.workItems.overdue)}
                    sub={`${t("projects.detail.itemsTotal")}: ${fmtInt(stats.workItems.total)}`}
                  />
                  <StatCard
                    label={t("projects.detail.loggedTime")}
                    value={fmtMinutes(stats.workItems.loggedMinutes)}
                    sub={`${t("projects.detail.checkpointsOpen")}: ${fmtInt(stats.checkpoints.open)}`}
                  />
                </div>

                <dl className="pd-facts">
                  <div>
                    <dt>{t("projects.field.health")}</dt>
                    <dd>
                      <span className="row row-wrap">
                        <Pill tone={HEALTH_TONE[project.health]}>
                          {t(healthKey(project.health))}
                        </Pill>
                        {detail && detail.suggestedHealth !== project.health ? (
                          <span className="meta">
                            <Sparkles size={12} aria-hidden="true" />{" "}
                            {t("projects.health.suggested")}:{" "}
                            {t(healthKey(detail.suggestedHealth))}
                          </span>
                        ) : null}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt>{t("projects.field.status")}</dt>
                    <dd>
                      <Badge tone={PROJECT_STATUS_TONE[project.status]}>
                        {t(projectStatusKey(project.status))}
                      </Badge>
                    </dd>
                  </div>
                  <div>
                    <dt>{t("projects.field.owner")}</dt>
                    <dd>
                      {project.owner ? (
                        <span className="row">
                          <Avatar
                            size="sm"
                            name={project.owner}
                            initials={project.ownerInitials}
                          />
                          {project.owner}
                        </span>
                      ) : (
                        <span className="muted">{EM_DASH}</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      <CalendarRange size={12} aria-hidden="true" />{" "}
                      {t("projects.field.startDate")} — {t("projects.field.endDate")}
                    </dt>
                    <dd className="tnum">
                      {fmtDate(project.startDate)} — {fmtDate(project.endDate)}
                    </dd>
                  </div>
                  <div>
                    <dt>{t("projects.field.nextCheckpoint")}</dt>
                    <dd>
                      {project.nextCheckpoint ? (
                        <span className="pd-stack">
                          <span>{project.nextCheckpoint}</span>
                          <span className="meta">
                            {fmtDate(project.nextCheckpointDate)} ·{" "}
                            {dueLabel(project.nextCheckpointDate)}
                          </span>
                        </span>
                      ) : (
                        <span className="muted">{EM_DASH}</span>
                      )}
                      <span className="field-hint">
                        {t("projects.hint.nextCheckpointComputed")}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt>{t("projects.detail.avgReadiness")}</dt>
                    <dd className="tnum">
                      {fmtPercent(stats.checkpoints.avgReadiness)}
                    </dd>
                  </div>
                  <div>
                    <dt>{t("projects.detail.sprintsActive")}</dt>
                    <dd className="tnum">
                      {fmtInt(stats.sprints.active)} / {fmtInt(stats.sprints.total)}
                    </dd>
                  </div>
                  <div>
                    <dt>{t("projects.detail.decisions")}</dt>
                    <dd className="tnum">{fmtInt(stats.decisions.total)}</dd>
                  </div>
                  <div>
                    <dt>{t("projects.field.updatedAt")}</dt>
                    <dd className="tnum">{fmtDateTime(project.updatedAt)}</dd>
                  </div>
                </dl>
              </div>
            ) : null}

            {tab === "items" ? (
              <div
                role="tabpanel"
                id="panel-items"
                aria-labelledby="tab-items"
                className="pd-panel"
              >
                <div className="row row-wrap">
                  <span className="spacer" />
                  <Button
                    size="sm"
                    variant="outline"
                    icon={ExternalLink}
                    onClick={() =>
                      router.push(`/work-items?projectId=${project.id}`)
                    }
                  >
                    {t("workItems.title")}
                  </Button>
                </div>
                <Table
                  columns={itemColumns}
                  rows={items ?? []}
                  rowKey={(w) => w.id}
                  loading={items === null && tabError === null}
                  caption={t("projects.detail.tab.items")}
                  empty={
                    tabError ? (
                      <ErrorState message={tabError} bare />
                    ) : (
                      <EmptyState
                        bare
                        canAct={false}
                        tone="muted"
                        icon={ListChecks}
                        title={t("workItems.empty")}
                      />
                    )
                  }
                />
              </div>
            ) : null}

            {tab === "checkpoints" ? (
              <div
                role="tabpanel"
                id="panel-checkpoints"
                aria-labelledby="tab-checkpoints"
                className="pd-panel"
              >
                <div className="row row-wrap">
                  <span className="spacer" />
                  <Button
                    size="sm"
                    variant="outline"
                    icon={ExternalLink}
                    onClick={() => router.push("/decisions")}
                  >
                    {t("checkpoints.queue.title")}
                  </Button>
                </div>
                <Table
                  columns={checkpointColumns}
                  rows={checkpoints ?? []}
                  rowKey={(c) => c.id}
                  loading={checkpoints === null && tabError === null}
                  caption={t("projects.detail.tab.checkpoints")}
                  empty={
                    tabError ? (
                      <ErrorState message={tabError} bare />
                    ) : (
                      <EmptyState
                        bare
                        canAct={false}
                        tone="muted"
                        title={t("checkpoints.queue.empty")}
                      />
                    )
                  }
                />
              </div>
            ) : null}

            {tab === "activity" ? (
              <div
                role="tabpanel"
                id="panel-activity"
                aria-labelledby="tab-activity"
                className="pd-panel"
              >
                {(detail?.activity ?? []).length === 0 ? (
                  <EmptyState
                    bare
                    canAct={false}
                    tone="muted"
                    icon={Activity}
                    title={t("projects.detail.noActivity")}
                  />
                ) : (
                  <ul className="pd-activity">
                    {(detail?.activity ?? []).map((row) => (
                      <li key={row.id}>
                        <span className="pd-stack">
                          <span>
                            <code className="pd-code">{row.action}</code>
                            {row.entity ? ` · ${row.entity}` : ""}
                          </span>
                          <span className="meta">
                            {row.actorEmail ?? EM_DASH}
                            {row.detail ? ` · ${row.detail}` : ""}
                          </span>
                        </span>
                        <span className="meta pd-nowrap">{fmtDateTime(row.at)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        <style>{PROJECT_DETAIL_CSS}</style>
      </Modal>

      {project ? (
        <ConfirmDialog
          open={confirmDelete}
          busy={deleting}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => void onConfirmDelete()}
          title={t("projects.delete.title")}
          message={t("projects.delete.warning")}
          confirmLabel={t("action.delete")}
          confirmCode={project.code}
          confirmCodeLabel={t("projects.delete.confirmLabel")}
        />
      ) : null}
    </>
  );
}

const PROJECT_DETAIL_CSS = `
.pd-root { display: flex; flex-direction: column; gap: var(--space-4); }
.pd-panel { display: flex; flex-direction: column; gap: var(--space-4); }
.pd-desc { color: var(--ink2); max-width: 70ch; }
.pd-stack { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.pd-progress { display: flex; align-items: center; gap: var(--space-2); }
.pd-progress .progress { flex: 1 1 auto; min-width: 48px; }
.pd-late { color: var(--danger); font-weight: 600; }
.pd-nowrap { white-space: nowrap; }
.pd-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: var(--text-xs);
  color: var(--accent-ink);
}
.pd-facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-4);
}
.pd-facts > * { min-width: 0; }
.pd-facts dt {
  display: flex; align-items: center; gap: 4px;
  margin-bottom: 4px;
  font-size: var(--text-xs); font-weight: 700; letter-spacing: 0.1em;
  text-transform: uppercase; color: var(--muted);
}
.pd-facts dd { color: var(--ink); }
.pd-activity { list-style: none; display: flex; flex-direction: column; gap: var(--space-3); }
.pd-activity li {
  display: flex; align-items: flex-start; gap: var(--space-3);
  padding-bottom: var(--space-3); border-bottom: 1px solid var(--border-soft);
}
.pd-activity li:last-child { padding-bottom: 0; border-bottom: 0; }
.pd-activity li .pd-stack { flex: 1 1 auto; }
`;

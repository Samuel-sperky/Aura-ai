"use client";

// `/` — Prehľad. The dashboard the CEO report is built from (spec Q1–Q6).
//
// STRUCTURE (fixed by the spec):
//   1. six KPI tiles
//   2. the ONE chart: completed story points per week, 12 weeks
//   3. every project, health-first (no pagination — 50 is the target scale)
//   4. upcoming checkpoints + recent audit activity
//   5. "Kopírovať súhrn" → a plain-text summary on the clipboard
//
// DATA: one parallel fan-out, all of it read-only. Counts that the server can
// answer with a COUNT come back as `pagination.total` from a `pageSize=1`
// request instead of being derived from a downloaded page — cheaper and exact.
//
// The audit panel is rendered ONLY for a holder of `audit.read`; the request is
// not even sent otherwise, so a viewer never produces a 403 in their network log.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ClipboardCopy,
  Flag,
  FolderKanban,
  Gauge,
  Gavel,
  ListChecks,
  ShieldAlert,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Panel,
  PanelBody,
  PanelHead,
  Pill,
  ProgressBar,
  StatCard,
  Table,
  healthTone,
  useToast,
} from "@/components/ui";
import type { TableColumn } from "@/components/ui";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { ApiError, apiGet, qs } from "@/lib/api";
import type { ListResult } from "@/lib/api";
import {
  CHECKPOINT_LIFECYCLE_TONE,
  CHECKPOINT_TYPE_ICON,
  HEALTH_TONE,
  checkpointStateKey,
  checkpointTypeKey,
  healthKey,
  isActiveProject,
  isAtRisk,
} from "@/lib/client/domain";
import {
  EM_DASH,
  daysUntil,
  dueLabel,
  fmtDate,
  fmtDateTime,
  fmtInt,
  fmtPercent,
  todayIso,
} from "@/lib/client/format";
import { t } from "@/lib/i18n";
import type { CheckpointDto } from "@/lib/domain/contracts/checkpoints";
import type { ProjectDto } from "@/lib/domain/contracts/projects";
import type { SprintWithMetricsDto } from "@/lib/domain/contracts/sprints";
import type { WorkItemDto } from "@/lib/domain/contracts/workItems";
import { useMe } from "@/lib/client/useMe";
import { DonePointsChart } from "./DonePointsChart";
import { sortByRisk } from "./ranking";
import { buildSummary, copyToClipboard } from "./summary";
import type { SummaryInput } from "./summary";
import {
  CHART_WEEKS,
  bucketDonePoints,
  weekOverWeekDelta,
  weekStarts,
  windowTotal,
} from "./weeks";

/** `GET /api/audit` row, restated locally: a client component must never import
 *  from a route module (it would drag `mariadb` into the browser bundle). */
interface ActivityEntry {
  id: string;
  userEmail: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  ts: string | null;
  detail: string | null;
}

/** Upper bound for the project block — "all of them" at the 50-project scale. */
const PROJECT_LIMIT = 200;
/** Upper bound for the queue list; the KPI count comes from `pagination.total`. */
const CHECKPOINT_LIMIT = 200;
/** How many done items to scan for the 12-week chart (newest first). */
const DONE_SCAN_LIMIT = 2000;
/** Rows in the activity and checkpoint panels. */
const ACTIVITY_ROWS = 10;
const UPCOMING_ROWS = 6;

interface OverviewData {
  projects: ProjectDto[];
  openCheckpoints: CheckpointDto[];
  openCheckpointCount: number;
  myDecisionCount: number;
  activeSprint: SprintWithMetricsDto | null;
  overdueItems: number;
  doneItems: WorkItemDto[];
  activity: ActivityEntry[];
}

/** Yesterday — `dueBefore` is inclusive, so "overdue" must stop before today. */
function yesterdayIso(today = todayIso()): string {
  const ms = Date.parse(`${today}T00:00:00Z`) - 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

export function OverviewView() {
  const router = useRouter();
  const toast = useToast();
  const me = useMe();

  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const canReadAudit = me.can("audit.read");
  const meReady = !me.loading;

  useEffect(() => {
    if (!meReady) return;
    const controller = new AbortController();
    const opts = { signal: controller.signal };
    let alive = true;

    async function load(): Promise<void> {
      const today = todayIso();

      const [
        projects,
        checkpoints,
        mine,
        sprints,
        overdue,
        done,
        activity,
      ] = await Promise.all([
        apiGet<ListResult<ProjectDto>>(
          `/api/projects${qs({ pageSize: PROJECT_LIMIT, sort: "risk", dir: "asc" })}`,
          opts,
        ),
        apiGet<ListResult<CheckpointDto>>(
          `/api/checkpoints${qs({
            queue: 1,
            pageSize: CHECKPOINT_LIMIT,
            sort: "dueDate",
            dir: "asc",
          })}`,
          opts,
        ),
        apiGet<ListResult<CheckpointDto>>(
          `/api/checkpoints${qs({ queue: 1, mine: 1, pageSize: 1 })}`,
          opts,
        ),
        apiGet<ListResult<SprintWithMetricsDto>>(
          `/api/sprints${qs({ status: "active", pageSize: 5 })}`,
          opts,
        ),
        apiGet<ListResult<WorkItemDto>>(
          `/api/work-items${qs({
            openOnly: 1,
            dueBefore: yesterdayIso(today),
            pageSize: 1,
          })}`,
          opts,
        ),
        apiGet<ListResult<WorkItemDto>>(
          `/api/work-items${qs({
            status: "done",
            sort: "updatedAt",
            dir: "desc",
            pageSize: DONE_SCAN_LIMIT,
          })}`,
          opts,
        ),
        canReadAudit
          ? apiGet<ListResult<ActivityEntry>>(
              `/api/audit${qs({ pageSize: ACTIVITY_ROWS })}`,
              opts,
            ).catch(() => ({ items: [] as ActivityEntry[] }))
          : Promise.resolve({ items: [] as ActivityEntry[] }),
      ]);

      if (!alive) return;
      setData({
        projects: sortByRisk(projects.items),
        openCheckpoints: checkpoints.items,
        openCheckpointCount: checkpoints.pagination.total,
        myDecisionCount: mine.pagination.total,
        activeSprint: sprints.items[0] ?? null,
        overdueItems: overdue.pagination.total,
        doneItems: done.items,
        activity: activity.items,
      });
      setError(null);
    }

    setLoading(true);
    load()
      .catch((err: unknown) => {
        if (!alive) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Prehľad sa nepodarilo načítať. Skúste to prosím znova.",
        );
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
      controller.abort();
    };
  }, [meReady, canReadAudit, nonce]);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  const buckets = useMemo(() => {
    const weeks = weekStarts(CHART_WEEKS, todayIso());
    return bucketDonePoints(data?.doneItems ?? [], weeks);
  }, [data]);

  const kpis = useMemo(() => {
    const projects = data?.projects ?? [];
    return {
      activeProjects: projects.filter((p) => isActiveProject(p.status)).length,
      projectsAtRisk: projects.filter((p) => isAtRisk(p.health)).length,
      openCheckpoints: data?.openCheckpointCount ?? 0,
      myDecisions: data?.myDecisionCount ?? 0,
      sprintName: data?.activeSprint?.name ?? null,
      sprintCapacityUsedPercent:
        data?.activeSprint?.metrics.capacityUsedPercent ?? null,
      overdueItems: data?.overdueItems ?? 0,
      donePointsWindow: windowTotal(buckets),
      donePointsDelta: weekOverWeekDelta(buckets),
    };
  }, [data, buckets]);

  const atRisk = useMemo(
    () => (data?.projects ?? []).filter((p) => isAtRisk(p.health)),
    [data],
  );

  const upcoming = useMemo(
    () => (data?.openCheckpoints ?? []).slice(0, UPCOMING_ROWS),
    [data],
  );

  const onCopySummary = useCallback(async () => {
    const input: SummaryInput = {
      generatedAt: new Date().toISOString(),
      kpis,
      atRisk: atRisk.map((p) => ({
        code: p.code,
        name: p.name,
        health: p.health,
        progress: p.progress,
        nextCheckpoint: p.nextCheckpoint,
        nextCheckpointDate: p.nextCheckpointDate,
        owner: p.owner,
      })),
      checkpoints: upcoming.map((c) => ({
        projectCode: c.projectCode,
        name: c.name,
        dueDate: c.dueDate,
        readiness: c.readiness,
        lifecycle: c.lifecycle,
        approverName: c.approverName,
      })),
    };
    const ok = await copyToClipboard(buildSummary(input));
    if (ok) toast.success(t("overview.copy.done"));
    else toast.error(t("overview.copy.failed"));
  }, [kpis, atRisk, upcoming, toast]);

  const columns = useMemo<TableColumn<ProjectDto>[]>(
    () => [
      {
        key: "project",
        header: t("overview.projects.col.project"),
        render: (p) => (
          <span className="ov-project">
            <span className="ov-code">{p.code}</span>
            <span className="truncate">{p.name}</span>
          </span>
        ),
      },
      {
        key: "area",
        header: t("overview.projects.col.area"),
        render: (p) =>
          p.area ? <Badge>{p.area}</Badge> : <span className="muted">{EM_DASH}</span>,
      },
      {
        key: "health",
        header: t("overview.projects.col.health"),
        render: (p) => (
          <Pill tone={HEALTH_TONE[p.health]}>{t(healthKey(p.health))}</Pill>
        ),
      },
      {
        key: "progress",
        header: t("overview.projects.col.progress"),
        width: "140px",
        render: (p) => (
          <span className="ov-progress">
            <ProgressBar
              value={p.progress}
              tone={healthTone(p.progress)}
              label={`${t("overview.projects.col.progress")} ${p.code}`}
            />
            <span className="tnum">{fmtPercent(p.progress)}</span>
          </span>
        ),
      },
      {
        key: "nextCheckpoint",
        header: t("overview.projects.col.nextCheckpoint"),
        render: (p) =>
          p.nextCheckpoint ? (
            <span className="ov-stack">
              <span className="truncate">{p.nextCheckpoint}</span>
              <span className="meta">
                {fmtDate(p.nextCheckpointDate)}
                {p.nextCheckpointDate
                  ? ` · ${dueLabel(p.nextCheckpointDate)}`
                  : ""}
              </span>
            </span>
          ) : (
            <span className="muted">{EM_DASH}</span>
          ),
      },
      {
        key: "owner",
        header: t("overview.projects.col.owner"),
        width: "180px",
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

  // First load with nothing on screen yet — the only place skeletons appear.
  if ((loading && !data) || me.loading) {
    return <LoadingState label={t("state.loading")} kpis={6} blocks={2} />;
  }

  if (error && !data) {
    return (
      <div className="page-stack">
        <ErrorState message={error} onRetry={refetch} />
        <style>{OVERVIEW_CSS}</style>
      </div>
    );
  }

  const projects = data?.projects ?? [];

  return (
    <div className="page-stack" aria-busy={loading || undefined}>
      <header className="page-header">
        <div style={{ minWidth: 0 }}>
          <p className="eyebrow">{t("overview.eyebrow")}</p>
          <h1>{t("overview.title")}</h1>
          <p className="page-header-desc">{t("overview.subtitle")}</p>
        </div>
        <div className="page-header-actions">
          <Button
            variant="outline"
            icon={ClipboardCopy}
            onClick={() => void onCopySummary()}
          >
            {t("overview.copy.action")}
          </Button>
        </div>
      </header>

      {/* Six tiles on a three-column grid: two calm rows beat six cramped ones. */}
      <div className="kpi-grid" style={{ ["--kpi-cols" as string]: 3 }}>
        <StatCard
          icon={FolderKanban}
          accent="accent"
          label={t("overview.kpi.activeProjects")}
          value={fmtInt(kpis.activeProjects)}
          sub={t("overview.kpi.activeProjectsSub")}
        />
        <StatCard
          icon={ShieldAlert}
          label={t("overview.kpi.projectsAtRisk")}
          value={fmtInt(kpis.projectsAtRisk)}
          sub={t("overview.kpi.projectsAtRiskSub")}
        />
        <StatCard
          icon={Flag}
          label={t("overview.kpi.openCheckpoints")}
          value={fmtInt(kpis.openCheckpoints)}
          sub={t("overview.kpi.openCheckpointsSub")}
        />
        <StatCard
          icon={Gavel}
          accent="gold"
          label={t("overview.kpi.myDecisions")}
          value={fmtInt(kpis.myDecisions)}
          sub={t("overview.kpi.myDecisionsSub")}
        />
        <StatCard
          icon={Gauge}
          label={t("overview.kpi.sprintCapacity")}
          value={
            kpis.sprintCapacityUsedPercent === null
              ? EM_DASH
              : fmtPercent(kpis.sprintCapacityUsedPercent)
          }
          sub={kpis.sprintName ?? t("overview.kpi.noActiveSprint")}
        />
        <StatCard
          icon={ListChecks}
          label={t("overview.kpi.overdueItems")}
          value={fmtInt(kpis.overdueItems)}
          sub={t("overview.kpi.overdueItemsSub")}
        />
      </div>

      <DonePointsChart buckets={buckets} loading={loading && !data} />

      <Panel>
        <PanelHead
          title={t("overview.projects.title")}
          subtitle={t("overview.projects.subtitle")}
          actions={
            <Button size="sm" variant="ghost" onClick={() => router.push("/projects")}>
              {t("overview.projects.openAll")}
            </Button>
          }
        />
        <PanelBody flush>
          <Table
            columns={columns}
            rows={projects}
            rowKey={(p) => p.id}
            rowsClickable
            onRowClick={(p) => router.push(`/projects?project=${p.id}`)}
            caption={t("overview.projects.title")}
            empty={
              <EmptyState
                bare
                canAct={false}
                title={t("overview.projects.empty")}
                description={t("overview.projects.emptyDesc")}
              />
            }
          />
        </PanelBody>
      </Panel>

      <div className="grid-2">
        <Panel>
          <PanelHead
            title={t("overview.checkpoints.title")}
            subtitle={t("overview.checkpoints.subtitle")}
            actions={
              <Button
                size="sm"
                variant="ghost"
                onClick={() => router.push("/decisions")}
              >
                {t("overview.checkpoints.openQueue")}
              </Button>
            }
          />
          <PanelBody>
            {upcoming.length === 0 ? (
              <EmptyState
                bare
                canAct={false}
                tone="muted"
                title={t("overview.checkpoints.empty")}
                description={t("overview.checkpoints.emptyDesc")}
              />
            ) : (
              <ul className="ov-list">
                {upcoming.map((c) => {
                  const Icon = CHECKPOINT_TYPE_ICON[c.checkpointType];
                  const late = (daysUntil(c.dueDate) ?? 0) < 0;
                  return (
                    <li key={c.id} className="ov-list-row">
                      <span className="ov-list-icon">
                        <Icon size={15} aria-hidden="true" />
                      </span>
                      <span className="ov-stack ov-grow">
                        <span className="truncate">{c.name}</span>
                        <span className="meta">
                          {c.projectCode} · {t(checkpointTypeKey(c.checkpointType))} ·{" "}
                          {fmtDate(c.dueDate)}
                        </span>
                        <ProgressBar
                          value={c.readiness}
                          tone={healthTone(c.readiness)}
                          label={`${t("checkpoints.field.readiness")} ${c.name}`}
                        />
                      </span>
                      <span className="ov-list-side">
                        <Pill tone={CHECKPOINT_LIFECYCLE_TONE[c.lifecycle]}>
                          {t(checkpointStateKey(c.lifecycle))}
                        </Pill>
                        <span className={late ? "meta ov-late" : "meta"}>
                          {dueLabel(c.dueDate)}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </PanelBody>
        </Panel>

        {canReadAudit ? (
          <Panel>
            <PanelHead
              icon={Activity}
              title={t("overview.activity.title")}
              subtitle={t("overview.activity.subtitle")}
            />
            <PanelBody>
              {(data?.activity ?? []).length === 0 ? (
                <EmptyState
                  bare
                  canAct={false}
                  tone="muted"
                  title={t("overview.activity.empty")}
                  description={t("overview.activity.emptyDesc")}
                />
              ) : (
                <ul className="ov-list">
                  {(data?.activity ?? []).map((row) => (
                    <li key={row.id} className="ov-list-row">
                      <span className="ov-stack ov-grow">
                        <span className="truncate">
                          <code className="ov-code">{row.action}</code>
                          {row.entity ? ` · ${row.entity}` : ""}
                        </span>
                        <span className="meta truncate">
                          {row.userEmail ?? EM_DASH}
                          {row.detail ? ` · ${row.detail}` : ""}
                        </span>
                      </span>
                      <span className="meta ov-nowrap">{fmtDateTime(row.ts)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </PanelBody>
          </Panel>
        ) : null}
      </div>

      <style>{OVERVIEW_CSS}</style>
    </div>
  );
}

// Page-scoped layout only. Tokens exclusively — the palette lives in globals.css
// and no raw hex or rgba may appear here (same rule as the login screen).
const OVERVIEW_CSS = `
.ov-project { display: inline-flex; align-items: baseline; gap: var(--space-2); min-width: 0; }
.ov-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: var(--text-xs);
  letter-spacing: 0.02em;
  color: var(--muted);
  white-space: nowrap;
}
.ov-progress { display: flex; align-items: center; gap: var(--space-2); min-width: 0; }
.ov-progress .progress { flex: 1 1 auto; min-width: 48px; }
.ov-stack { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.ov-grow { flex: 1 1 auto; }
.ov-nowrap { white-space: nowrap; }
.ov-list { list-style: none; display: flex; flex-direction: column; gap: var(--space-3); }
.ov-list-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--border-soft);
}
.ov-list-row:last-child { padding-bottom: 0; border-bottom: 0; }
.ov-list-icon {
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  width: 28px; height: 28px; border-radius: var(--radius-sm);
  color: var(--accent-ink); background: var(--accent-tint);
}
.ov-list-side {
  display: flex; flex-direction: column; align-items: flex-end; gap: 4px;
  flex-shrink: 0; text-align: right;
}
.ov-late { color: var(--danger); font-weight: 600; }
@media (max-width: 700px) {
  .ov-list-row { flex-wrap: wrap; }
  .ov-list-side { align-items: flex-start; text-align: left; }
}
`;

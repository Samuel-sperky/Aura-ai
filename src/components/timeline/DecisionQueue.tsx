"use client";

// Decisions mode (spec Q9): NOT a time axis — a work queue. Checkpoints that
// still need a decision, ordered by due date, each with its readiness bar and
// state. The full-fat view lives on /decisions (A9); this is the compact one
// inside Timeline so a planner never has to leave the page to see what is stuck.

import { useMemo } from "react";
import { ArrowRight, CheckCircle2, Clock3, ShieldCheck, User } from "lucide-react";
import Link from "next/link";
import type { CheckpointDto } from "@/lib/domain/contracts/checkpoints";
import {
  daysBetween,
  formatDay,
  isPastDay,
  queueStats,
  sortDecisionQueue,
} from "@/lib/timeline";
import {
  Badge,
  Chip,
  Panel,
  PanelBody,
  PanelFoot,
  PanelHead,
  ProgressBar,
  StatCard,
  cx,
  healthTone,
} from "@/components/ui";
import { EmptyState, NoResultsState } from "@/components/states";
import { t, tk } from "./text";
import styles from "./timeline.module.css";

export interface DecisionQueueProps {
  checkpoints: CheckpointDto[];
  today: string;
  /** Id of the signed-in user, for the "Čaká na mňa" filter. */
  currentUserId: string | null;
  mineOnly: boolean;
  onMineOnlyChange: (value: boolean) => void;
  onOpenCheckpoint: (id: string) => void;
}

export function DecisionQueue({
  checkpoints,
  today,
  currentUserId,
  mineOnly,
  onMineOnlyChange,
  onOpenCheckpoint,
}: DecisionQueueProps) {
  // The server orders `queue=1` the same way; re-sorting locally keeps the order
  // correct after the "waiting on me" filter narrows the list.
  const open = useMemo(
    () => sortDecisionQueue(checkpoints.filter((cp) => cp.lifecycle !== "decided")),
    [checkpoints],
  );
  const rows = useMemo(
    () =>
      mineOnly && currentUserId
        ? open.filter((cp) => cp.approverId === currentUserId)
        : open,
    [open, mineOnly, currentUserId],
  );
  const stats = useMemo(() => queueStats(open, today), [open, today]);

  const mineChip = (
    <Chip
      active={mineOnly}
      onClick={() => onMineOnlyChange(!mineOnly)}
      disabled={!currentUserId}
      icon={User}
      label={t("timeline.queue.mineOnly")}
    />
  );

  return (
    <div className="page-stack">
      <div className="kpi-grid" style={{ ["--kpi-cols" as string]: 3 }}>
        <StatCard
          label={t("timeline.queue.ready")}
          value={stats.ready}
          sub={t("checkpointModal.decideReady")}
          accent="accent"
        />
        <StatCard label={t("timeline.queue.blocked")} value={stats.blocked} />
        <StatCard label={t("timeline.queue.overdue")} value={stats.overdue} />
      </div>

      <Panel>
        <PanelHead
          icon={ShieldCheck}
          title={t("timeline.queue.title")}
          subtitle={t("timeline.queue.subtitle")}
          actions={mineChip}
        />
        {rows.length === 0 ? (
          <PanelBody>
            {mineOnly ? (
              <NoResultsState bare onResetFilters={() => onMineOnlyChange(false)} />
            ) : (
              <EmptyState
                bare
                icon={CheckCircle2}
                tone="accent"
                title={t("timeline.queue.emptyTitle")}
                description={t("timeline.queue.emptyDesc")}
              />
            )}
          </PanelBody>
        ) : (
          <PanelBody flush>
            <ol className={styles.queue}>
              {rows.map((cp, index) => (
                <li key={cp.id}>
                  <button
                    type="button"
                    className={styles.queueRow}
                    onClick={() => onOpenCheckpoint(cp.id)}
                  >
                    <span className={styles.queueRank} aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className={styles.queueMain}>
                      <span className={styles.queueTitle}>{cp.name}</span>
                      <span className={styles.queueMeta}>
                        <Badge tone="neutral">{cp.projectCode}</Badge>
                        <Badge tone={cp.lifecycle === "blocked" ? "danger" : "neutral"}>
                          {tk("checkpointState", cp.lifecycle)}
                        </Badge>
                        <span>{tk("checkpointType", cp.checkpointType)}</span>
                        {cp.approverName ? (
                          <span className="truncate">
                            {t("checkpointModal.approver")}: {cp.approverName}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <span className={styles.queueReadiness}>
                      <span className="tnum">
                        {cp.requiredCompleteCount} {t("checkpointModal.readinessOf")}{" "}
                        {cp.requiredCount} · {cp.readiness} %
                      </span>
                      <ProgressBar
                        value={cp.readiness}
                        tone={healthTone(cp.readiness)}
                        label={`${t("checkpointModal.readiness")} ${cp.readiness} %`}
                      />
                    </span>
                    <span className={styles.queueDue}>
                      <span
                        className={cx(
                          "tnum",
                          isPastDay(cp.dueDate, today) && styles.queueDueOverdue,
                        )}
                      >
                        <Clock3 size={12} aria-hidden="true" /> {formatDay(cp.dueDate)}
                      </span>
                      <span>{dueHint(cp.dueDate, today)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </PanelBody>
        )}
        <PanelFoot>
          {/* A link, not a Button: this navigates. `.btn` classes give it the
              same affordance without faking a button for assistive tech. */}
          <Link className="btn btn-outline btn-sm" href="/decisions">
            {t("timeline.queue.full")}
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </PanelFoot>
      </Panel>
    </div>
  );
}

/** "o 6 dní" / "8 dní po termíne" / "dnes" — plain Slovak, no icon soup. */
function dueHint(dueDate: string | null, today: string): string {
  if (!dueDate) return t("common.noValue");
  const delta = daysBetween(today, dueDate);
  if (delta === null) return t("common.noValue");
  if (delta === 0) return t("common.today");
  if (delta > 0) return `o ${delta} ${dayWord(delta)}`;
  return `${-delta} ${dayWord(-delta)} po termíne`;
}

/** Slovak plural of "deň" for 1 / 2–4 / 5+. */
function dayWord(n: number): string {
  if (n === 1) return "deň";
  if (n >= 2 && n <= 4) return "dni";
  return "dní";
}

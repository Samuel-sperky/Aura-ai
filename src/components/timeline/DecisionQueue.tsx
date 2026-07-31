"use client";

// Decisions mode (spec Q9): the checkpoints that still need a decision, on the
// SAME vertical time axis the roadmap uses. Months run top to bottom as section
// headers, each checkpoint sits in the month of its due date, and one rule marks
// today.
//
// Why it stopped being a flat queue: ordered by due date, the list said which
// checkpoint was next but never how far away it was — "o 6 dní" and "o 5 mesiacov"
// were two rows apart and looked identical. The month sections give the distance
// back, and the "Dnes" rule turns "what is late" into something the reader sees
// instead of reads. Nothing was dropped in the move: the readiness bar, the type,
// the lifecycle, the approver, the queue position and the filters are all still
// here, and the full-fat view still lives on /decisions (A9).
//
// No absolute positioning. A checkpoint is a single day, not a span, so a section
// per month with the cards stacked under it is both more readable and immune to
// the overflow the percentage geometry would need at 390 px.

import { Fragment, useMemo } from "react";
import { ArrowRight, CheckCircle2, Clock3, ShieldCheck, User } from "lucide-react";
import Link from "next/link";
import type { CheckpointDto } from "@/lib/domain/contracts/checkpoints";
import {
  daysBetween,
  formatDay,
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
import { groupDecisionsByMonth, type DecisionCard } from "./decisionTimeline";
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
  // correct after the "waiting on me" filter narrows the list. The month grouping
  // preserves this order inside a day, so readiness still breaks a tie.
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
  const timeline = useMemo(() => groupDecisionsByMonth(rows, today), [rows, today]);

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
            <div className={styles.dt}>
              {/* Sections in calendar order. Only months that actually hold a
                  checkpoint are drawn — an empty run between two real ones would be
                  noise, and this axis has no horizon to fill up. */}
              <ol className={styles.dtMonths} aria-label={t("timeline.queue.axisLabel")}>
                {timeline.months.map((month) => (
                  <li
                    key={month.key}
                    className={cx(styles.dtMonth, month.isCurrent && styles.dtMonthNow)}
                  >
                    <p className={styles.dtMonthHead}>
                      <span className={styles.dtMonthLabel}>{month.label}</span>
                      <span
                        className={cx("tnum", styles.dtMonthCount)}
                        title={t("timeline.roadmap.checkpointCount")}
                      >
                        {month.cards.length}
                      </span>
                    </p>
                    <ol className={styles.dtCards}>
                      {month.cards.map((card, index) => (
                        <Fragment key={card.item.id}>
                          {/* The rule can land INSIDE a month — the month that holds
                              today usually has late and upcoming checkpoints both. */}
                          {month.todayIndex === index ? <TodayRule today={today} /> : null}
                          <DecisionRow
                            card={card}
                            today={today}
                            onOpenCheckpoint={onOpenCheckpoint}
                          />
                        </Fragment>
                      ))}
                      {month.todayIndex === month.cards.length ? (
                        <TodayRule today={today} />
                      ) : null}
                    </ol>
                  </li>
                ))}
              </ol>

              {/* No usable due date: no place on an axis, but dropping the rows would
                  make this screen disagree with the counters right above it. */}
              {timeline.undated.length > 0 ? (
                <div className={styles.dtMonth}>
                  <p className={styles.dtMonthHead}>
                    <span className={styles.dtMonthLabel}>
                      {t("timeline.roadmap.undated")}
                    </span>
                    <span
                      className={cx("tnum", styles.dtMonthCount)}
                      title={t("timeline.roadmap.checkpointCount")}
                    >
                      {timeline.undated.length}
                    </span>
                  </p>
                  <ol className={styles.dtCards}>
                    {timeline.undated.map((card) => (
                      <DecisionRow
                        key={card.item.id}
                        card={card}
                        today={today}
                        onOpenCheckpoint={onOpenCheckpoint}
                      />
                    ))}
                  </ol>
                </div>
              ) : null}
            </div>
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

/**
 * The divider between what is behind us and what is ahead — the one thing a queue
 * ordered by date could not show. Placement is decided by `groupDecisionsByMonth`;
 * this only draws it.
 *
 * A plain `<li>`, not a `role="separator"`: an `<ol>` may only contain list items,
 * and the rule carries a date worth reading out loud rather than being decoration.
 */
function TodayRule({ today }: { today: string }) {
  return (
    <li className={styles.dtNow}>
      <span className={styles.dtNowLabel}>{t("timeline.today")}</span>
      <span className={cx("tnum", styles.dtNowDate)}>{formatDay(today)}</span>
    </li>
  );
}

/**
 * One checkpoint on the axis. Same facts as the old queue row, same click target:
 * the whole card opens the checkpoint modal through `?checkpoint=`.
 *
 * The day number replaces nothing — the full date stays in the right-hand column,
 * because a month header plus "30" is not a date a reader can quote. It is
 * `aria-hidden` for exactly that reason: to a screen reader it would be a duplicate.
 */
function DecisionRow({
  card,
  today,
  onOpenCheckpoint,
}: {
  card: DecisionCard<CheckpointDto>;
  today: string;
  onOpenCheckpoint: (id: string) => void;
}) {
  const cp = card.item;
  return (
    <li>
      <button
        type="button"
        className={cx(styles.dtCard, card.overdue && styles.dtCardOverdue)}
        onClick={() => onOpenCheckpoint(cp.id)}
      >
        <span className={styles.dtDay} aria-hidden="true">
          <span className={styles.dtDayNum}>{card.day ?? t("common.noValue")}</span>
          {/* Position in the queue: the ordering the flat list used to show as `01`,
              kept because it is the answer to "how much is ahead of this one". */}
          <span className={styles.dtRank}>#{card.rank}</span>
        </span>

        <span className={styles.dtMain}>
          <span className={styles.dtTitle}>{cp.name}</span>
          <span className={styles.dtMeta}>
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

        <span className={styles.dtReadiness}>
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

        {/* Overdue and undecided is the strongest signal on this screen, so it is the
            one place that gets `--danger-text` — the fill token is tuned for
            backgrounds and lands under AA as 11 px text on its own tint. */}
        <span className={cx(styles.dtDue, card.overdue && styles.dtDueOverdue)}>
          <span className="tnum">
            <Clock3 size={12} aria-hidden="true" /> {formatDay(cp.dueDate)}
          </span>
          <span>{dueHint(cp.dueDate, today)}</span>
        </span>
      </button>
    </li>
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

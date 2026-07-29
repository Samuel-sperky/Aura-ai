"use client";

// Sprints mode, upper half (spec Q8): one row per SPRINT drawn as a bar, its
// items as sub-rows underneath, parallel sprints side by side (greedy lane
// packing in `packLanes`). Selecting a row drives the planner and the capacity
// panel below.
//
// Only the sprints the planner has items for can expand; the rest still draw
// their bar so the axis stays honest about what else is running.

import { useMemo, useState } from "react";
import { CalendarRange, ChevronDown, ChevronRight, Target } from "lucide-react";
import type { SprintWithMetricsDto } from "@/lib/domain/contracts/sprints";
import type { WorkItemDto } from "@/lib/domain/contracts/workItems";
import {
  barGeometry,
  dayPhase,
  formatDay,
  formatRange,
  markerPercent,
  packLanes,
  type TimeScale,
} from "@/lib/timeline";
import { Badge, Pill, cx } from "@/components/ui";
import { EmptyState } from "@/components/states";
import { t, tk } from "./text";
import {
  LegendItem,
  TimelineBar,
  TimelineChart,
  TimelineMarker,
  TimelineNoDates,
  TimelineRow,
} from "./TimelineChart";
import styles from "./timeline.module.css";

/** Sprint status → bar band. Only the live states get the accent treatment. */
function sprintTone(status: SprintWithMetricsDto["status"]) {
  if (status === "active") return "accent" as const;
  if (status === "cancelled") return "grey" as const;
  if (status === "completed") return "green" as const;
  return "grey" as const;
}

export interface SprintsAxisProps {
  scale: TimeScale;
  sprints: SprintWithMetricsDto[];
  /** Items keyed by sprint id — only the planner's columns are populated. */
  itemsBySprint: Record<string, WorkItemDto[]>;
  selectedSprintId: string | null;
  onSelectSprint: (id: string) => void;
}

export function SprintsAxis({
  scale,
  sprints,
  itemsBySprint,
  selectedSprintId,
  onSelectSprint,
}: SprintsAxisProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const laned = useMemo(() => packLanes(sprints, scale), [sprints, scale]);
  const laneCount = laned.reduce((max, entry) => Math.max(max, entry.lane + 1), 0);

  if (sprints.length === 0) {
    return (
      <EmptyState
        icon={CalendarRange}
        title={t("timeline.sprints.emptyTitle")}
        description={t("timeline.sprints.emptyDesc")}
        canAct={false}
      />
    );
  }

  return (
    <TimelineChart
      scale={scale}
      ariaLabel={t("timeline.sprints.lanesLabel")}
      identityLabel={t("timeline.sprints.lanesLabel")}
      identityHint={`${t("timeline.horizon")}: ${t("timeline.horizonSprints")} · ${laneCount}×`}
      legend={
        <>
          <LegendItem kind="bar">{t("timeline.sprints.lanesLabel")}</LegendItem>
          <LegendItem kind="line">{t("timeline.today")}</LegendItem>
          <span>{t("timeline.sprints.selectHint")}</span>
        </>
      }
    >
      {laned.map(({ item: sprint, lane }) => {
        const geometry = barGeometry(scale, sprint.startDate, sprint.endDate);
        const items = itemsBySprint[sprint.id] ?? [];
        const isOpen = expanded.has(sprint.id);
        const selected = sprint.id === selectedSprintId;
        return (
          <div key={sprint.id}>
            <TimelineRow
              scale={scale}
              className={selected ? styles.groupStripe : undefined}
              identity={
                <>
                  <button
                    type="button"
                    className={styles.rowToggle}
                    aria-expanded={isOpen}
                    aria-label={`${sprint.name} — ${t("timeline.sprints.itemsInSprint")}`}
                    disabled={items.length === 0}
                    onClick={() =>
                      setExpanded((prev) => {
                        const next = new Set(prev);
                        if (next.has(sprint.id)) next.delete(sprint.id);
                        else next.add(sprint.id);
                        return next;
                      })
                    }
                  >
                    {isOpen ? (
                      <ChevronDown size={14} aria-hidden="true" />
                    ) : (
                      <ChevronRight size={14} aria-hidden="true" />
                    )}
                  </button>
                  <span className={styles.identityMain}>
                    <button
                      type="button"
                      className={cx(styles.identityLink, "truncate")}
                      aria-pressed={selected}
                      title={sprint.name}
                      onClick={() => onSelectSprint(sprint.id)}
                    >
                      {sprint.name}
                    </button>
                    <span className={styles.identityMeta}>
                      {sprint.projectCode ?? t("common.noValue")} ·{" "}
                      {tk("sprintStatus", sprint.status)} · {t("timeline.axis.label")}{" "}
                      {lane + 1}
                    </span>
                  </span>
                </>
              }
            >
              {geometry.visible ? (
                <TimelineBar
                  geometry={geometry}
                  tone={sprintTone(sprint.status)}
                  fillPercent={
                    sprint.metrics.currentPoints > 0
                      ? (sprint.metrics.donePoints / sprint.metrics.currentPoints) * 100
                      : 0
                  }
                  label={`${sprint.metrics.donePoints}/${sprint.metrics.currentPoints} ${t("planner.points")}`}
                  title={[
                    sprint.name,
                    formatRange(sprint.startDate, sprint.endDate),
                    `${tk("sprintStatus", sprint.status)}`,
                    `${sprint.metrics.donePoints}/${sprint.metrics.currentPoints} ${t("planner.pointsLong")}`,
                  ].join(" · ")}
                />
              ) : (
                <TimelineNoDates />
              )}
            </TimelineRow>

            {isOpen
              ? items.map((workItem) => (
                  <TimelineRow
                    key={workItem.id}
                    scale={scale}
                    sub
                    identity={
                      <span className={styles.identityMain} style={{ paddingLeft: 22 }}>
                        <span className={styles.identityMeta} title={workItem.title}>
                          {workItem.title}
                        </span>
                        <span className={styles.identityMeta}>
                          {tk("status", workItem.status)} · {workItem.storyPoints}{" "}
                          {t("planner.points")}
                        </span>
                      </span>
                    }
                  >
                    {workItem.dueDate ? (
                      <TimelineMarker
                        percent={markerPercent(scale, workItem.dueDate)}
                        phase={dayPhase(workItem.dueDate, scale.todayIso)}
                        variant={workItem.status === "done" ? "decided" : "planned"}
                        title={`${workItem.title} · ${formatDay(workItem.dueDate)}`}
                        onClick={() => onSelectSprint(sprint.id)}
                      >
                        <Target size={10} aria-hidden="true" />
                      </TimelineMarker>
                    ) : (
                      <TimelineNoDates />
                    )}
                  </TimelineRow>
                ))
              : null}
          </div>
        );
      })}
    </TimelineChart>
  );
}

/** Badge row summarising the sprints horizon for the page header. */
export function SprintsSummary({ sprints }: { sprints: SprintWithMetricsDto[] }) {
  const active = sprints.filter((s) => s.status === "active").length;
  const over = sprints.filter((s) => s.metrics.capacityUsedPercent > 100).length;
  return (
    <>
      <Badge tone="neutral">
        {sprints.length} {t("timeline.sprints.lanesLabel")}
      </Badge>
      {active > 0 ? (
        <Pill tone="accent">
          {active} {tk("sprintStatus", "active")}
        </Pill>
      ) : null}
      {over > 0 ? <Badge tone="danger">{over}× {t("capacity.overloaded")}</Badge> : null}
    </>
  );
}

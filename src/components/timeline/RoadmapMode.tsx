"use client";

// Roadmap mode (spec Q7): one LANE per project, grouped by `area`. No team rows —
// teams are out of scope. Time runs top to bottom, the lane's bar spans
// start_date…end_date with the progress filling downward, and the project's
// checkpoints sit on the lane as markers.
//
// The eight decisions this file implements, each of them a deliberate answer to a
// problem the first vertical draft had:
//   1. no sideways name inside the bar — it was cut off on short bars and the lane
//      header above it already carries the name
//   2. an area collapses to ONE summary lane (fifty projects ≈ 5 800 px of
//      sideways scroll otherwise); the collapsed set lives in `?collapsed=`
//   3. `compact` density shortens a month from 58 px to 40 px, so twelve months fit
//      on a screen without scrolling
//   4. a checkpoint outside its project's duration KEEPS its marker and gains a
//      warning style — it is real information, most likely a data error
//   5. projects with no dates move UNDER the axis instead of occupying an empty lane
//   6. the whole bar opens the project (it was the biggest target on screen and did
//      nothing); checkpoint markers sit above it and keep the click
//   7. `@media print` — a printable roadmap is what the reporting pillar needs
//   8. "Skočiť na dnes" plus a one-line legend, so the axis gets the vertical room

import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";
import {
  CalendarCheck,
  ChevronDown,
  ChevronRight,
  Flag,
  Layers,
  Milestone,
} from "lucide-react";
import Link from "next/link";
import type { CheckpointDto } from "@/lib/domain/contracts/checkpoints";
import type { ProjectDto } from "@/lib/domain/contracts/projects";
import type { SprintDto } from "@/lib/domain/contracts/sprints";
import {
  barGeometry,
  columnLabel,
  columnTitle,
  dayPhase,
  formatDay,
  formatRange,
  groupProjectsByArea,
  markerPercent,
  type TimeScale,
} from "@/lib/timeline";
import { DEFAULT_DENSITY, getDensity, subscribePreferences } from "@/lib/theme";
import type { Density } from "@/lib/theme";
import { Badge, Button, Pill, cx } from "@/components/ui";
import { EmptyState } from "@/components/states";
import { useIsNarrow } from "@/lib/client/useIsNarrow";
import { pluralForm, t, tk } from "./text";
import { LegendItem } from "./TimelineChart";
import {
  aggregateArea,
  isOutsideProject,
  partitionByDates,
  type AreaAggregate,
} from "./roadmapAggregate";
import styles from "./timeline.module.css";

/**
 * A percentage of the horizon, as a CSS length.
 *
 * The geometry helpers are orientation-agnostic — they return a share of the
 * horizon, not a direction — so the very same numbers the horizontal chart feeds
 * into `left`/`width` go into `top`/`height` here. That is why turning the roadmap
 * on its side needed no changes in `lib/timeline`.
 */
function pct(value: number): string {
  return `${value}%`;
}

/** `green` → `Green`, so a variant name can be appended to a camelCase class key. */
function cap(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Look up an optional CSS-module variant without widening `styles` to `any`. */
function variant(prefix: string, value: string): string | undefined {
  return (styles as Record<string, string | undefined>)[`${prefix}${cap(value)}`];
}

/** Project health → bar band. `grey` means "no data", not a fourth state. */
const HEALTH_TONE = {
  green: "green",
  amber: "amber",
  red: "red",
  grey: "grey",
} as const;

/**
 * Height of one time unit, per density.
 *
 * The horizon is twelve units at `month`/`week` and eight at `quarter`, so this one
 * number decides the whole axis: 12 × 58 ≈ 700 px is roughly the vertical room a
 * laptop has below the toolbar, and `compact` drops it to 40 px so the full twelve
 * months fit on a screen with no scrolling at all. Bars are positioned in PERCENT
 * of that height, so the number only decides how airy the axis is — never whether a
 * bar lands in the right month.
 */
const UNIT_PX: Record<Density, number> = { cozy: 58, compact: 40 };

/** Shortest axis worth drawing, in px (matters at `quarter`, which has 8 columns). */
const MIN_AXIS_PX = 360;

const serverDensity = () => DEFAULT_DENSITY;

/**
 * `?collapsed=Platforma,Marketing` — the areas folded into a summary lane.
 *
 * Built ONCE at module scope, not inline in the component: an inline
 * `.withDefault([])` hands `useQueryState` a fresh empty array on every render, so
 * the "nothing collapsed" value would never be referentially stable. `nuqs`
 * percent-encodes the separator, so an area name containing a comma survives the
 * round trip.
 */
const COLLAPSED_PARSER = parseAsArrayOf(parseAsString).withDefault([]);

/**
 * The density stamped on `<html data-density>`, read through the same external
 * store `ThemeControls.usePreferences` uses. NOT a `useState` + effect: the lint
 * rule `set-state-in-effect` is at zero in this repo and stays there.
 */
function useDensity(): Density {
  return useSyncExternalStore(subscribePreferences, getDensity, serverDensity);
}

/** Stable empty default for `sprints`, so omitting the prop does not churn memos. */
const NO_SPRINTS: SprintDto[] = [];

/**
 * The axis hint, composed from the columns the axis actually draws.
 *
 * Never a constant string: the roadmap horizon follows the zoom (8 quarters /
 * 12 months / 12 weeks), so a hardcoded "12 mesiacov" was false at two of the
 * three zooms. Reading `scale.columns.length` is what keeps the label and the
 * axis from drifting apart — the same rule as everywhere else in this pillar.
 */
function horizonHint(scale: TimeScale): string {
  const units = scale.columns.length;
  return t(`timeline.horizonUnits.${scale.zoom}.${pluralForm(units)}`, { n: units });
}

/** Link to the project detail, which opens as a modal over /projects. */
function projectHref(id: string): string {
  return `/projects?project=${encodeURIComponent(id)}`;
}

export interface RoadmapModeProps {
  scale: TimeScale;
  projects: ProjectDto[];
  checkpoints: CheckpointDto[];
  /**
   * Sprints drawn as a thin second bar beside the project's own, so the reader can
   * see when work actually happened on it. OPTIONAL with an empty default: the
   * roadmap must keep working for a caller that does not pass them yet.
   */
  sprints?: SprintDto[];
  /** Opens the checkpoint modal (deep-linked through `?checkpoint=`). */
  onOpenCheckpoint: (id: string) => void;
}

export function RoadmapMode({
  scale,
  projects,
  checkpoints,
  sprints = NO_SPRINTS,
  onOpenCheckpoint,
}: RoadmapModeProps) {
  // ── URL state: which areas are collapsed ──────────────────────────────────
  // The URL is the source of truth in this app, so a link to a folded-down roadmap
  // reproduces exactly that screen.
  const [collapsed, setCollapsed] = useQueryState("collapsed", COLLAPSED_PARSER);
  const collapsedSet = useMemo(() => new Set(collapsed), [collapsed]);
  const toggleArea = useCallback(
    (area: string) => {
      const next = collapsedSet.has(area)
        ? collapsed.filter((name) => name !== area)
        : [...collapsed, area];
      // null clears the parameter, so a fully expanded roadmap has a clean URL.
      void setCollapsed(next.length > 0 ? next : null);
    },
    [collapsed, collapsedSet, setCollapsed],
  );

  // A project with no usable date has no place on a time axis; it is listed under
  // the chart instead of holding an empty lane open.
  const { dated, undated } = useMemo(() => partitionByDates(projects), [projects]);
  const groups = useMemo(() => groupProjectsByArea(dated), [dated]);

  const aggregates = useMemo(() => {
    const map = new Map<string, AreaAggregate>();
    for (const group of groups) map.set(group.area, aggregateArea(group.projects));
    return map;
  }, [groups]);

  const byProject = useMemo(() => {
    const map = new Map<string, CheckpointDto[]>();
    for (const cp of checkpoints) {
      const list = map.get(cp.projectId);
      if (list) list.push(cp);
      else map.set(cp.projectId, [cp]);
    }
    return map;
  }, [checkpoints]);

  const sprintsByProject = useMemo(() => {
    const map = new Map<string, SprintDto[]>();
    for (const sprint of sprints) {
      const list = map.get(sprint.projectId);
      if (list) list.push(sprint);
      else map.set(sprint.projectId, [sprint]);
    }
    return map;
  }, [sprints]);

  const density = useDensity();
  const isNarrow = useIsNarrow();

  // Scrolled far enough down and the "Dnes" rule leaves the screen; this brings it
  // back. A ref rather than a query for the element, so it survives a re-render.
  const todayRef = useRef<HTMLSpanElement | null>(null);
  const jumpToToday = useCallback(() => {
    todayRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, []);

  if (projects.length === 0) {
    return (
      <EmptyState
        icon={Layers}
        title={t("timeline.roadmap.emptyTitle")}
        description={t("timeline.roadmap.emptyDesc")}
        actionLabel={t("checkpointModal.openProject")}
        actionHref="/projects"
      />
    );
  }

  // Lanes side by side need horizontal room a phone does not have, and a wide
  // scroller is not a way out — it pans the whole page here. So the phone gets the
  // same information as a list ordered in time, which is still top-to-bottom.
  if (isNarrow) {
    return (
      <RoadmapNarrow
        projects={projects}
        byProject={byProject}
        scale={scale}
        onOpenCheckpoint={onOpenCheckpoint}
      />
    );
  }

  const axisHeight = Math.max(MIN_AXIS_PX, scale.columns.length * UNIT_PX[density]);

  return (
    <div className={styles.vt}>
      {/* One line, small type: the legend used to eat a row the axis could use. */}
      <div className={styles.vtLegend}>
        <LegendItem kind="bar">{t("timeline.roadmap.legendProject")}</LegendItem>
        <span className={styles.legendItem}>
          <span className={styles.vtLegendSprint} aria-hidden="true" />
          {t("timeline.roadmap.legendSprint")}
        </span>
        <LegendItem kind="line">{t("timeline.today")}</LegendItem>
        <LegendItem kind="icon">
          <Milestone size={12} aria-hidden="true" />
          {t("timeline.roadmap.legendCheckpoint")}
        </LegendItem>
        <span>
          {t("timeline.phase.past")} · {t("timeline.phase.future")}
        </span>
        <span className="spacer" />
        {scale.todayPercent !== null ? (
          <Button
            size="xs"
            variant="ghost"
            icon={CalendarCheck}
            className="no-print"
            onClick={jumpToToday}
          >
            {t("timeline.roadmap.jumpToday")}
          </Button>
        ) : null}
      </div>

      <div className={styles.vtScroll}>
        {/* Header and body repeat the SAME nested flex structure (group → lane), so
            a lane header always sits above its own lane without any width maths.
            That holds for a collapsed area too: one header cell, one lane. */}
        <div className={styles.vtHead}>
          <div className={styles.vtAxisHead}>
            <span className={styles.vtAxisHeadLabel}>{t("timeline.horizon")}</span>
            <span className={styles.vtAxisHeadHint}>{horizonHint(scale)}</span>
          </div>
          {groups.map((group, index) => {
            const isCollapsed = collapsedSet.has(group.area);
            const aggregate = aggregates.get(group.area);
            return (
              <div key={group.area} className={styles.vtGroupHead}>
                <button
                  type="button"
                  className={styles.vtGroupToggle}
                  aria-expanded={!isCollapsed}
                  aria-controls={`vt-area-${index}`}
                  title={`${group.area} — ${
                    isCollapsed
                      ? t("timeline.roadmap.expandArea")
                      : t("timeline.roadmap.collapseArea")
                  }`}
                  onClick={() => toggleArea(group.area)}
                >
                  {isCollapsed ? (
                    <ChevronRight size={12} aria-hidden="true" />
                  ) : (
                    <ChevronDown size={12} aria-hidden="true" />
                  )}
                  <Layers size={12} aria-hidden="true" />
                  <span className="truncate">{group.area}</span>
                  <span className="tnum">{group.projects.length}</span>
                </button>
                <div className={styles.vtLaneHeads}>
                  {isCollapsed && aggregate ? (
                    <div className={styles.vtLaneHead}>
                      <Pill tone="neutral" dot={false} className="tnum">
                        {aggregate.projectCount} {t("timeline.roadmap.projectsCount")}
                      </Pill>
                      <span className={styles.vtLaneNameStatic}>
                        {t("timeline.roadmap.areaSummary")}
                      </span>
                      <span className={styles.vtLaneMeta}>
                        {tk("health", aggregate.health)} · {aggregate.progress} %
                      </span>
                    </div>
                  ) : (
                    group.projects.map((project) => (
                      <div key={project.id} className={styles.vtLaneHead}>
                        <Pill tone="neutral" dot={false} className="tnum">
                          {project.code}
                        </Pill>
                        <Link
                          href={projectHref(project.id)}
                          className={styles.vtLaneName}
                          title={project.name}
                        >
                          {project.name}
                        </Link>
                        <span className={styles.vtLaneMeta}>
                          {tk("health", project.health)} · {project.progress} %
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div
          className={styles.vtBody}
          style={{ height: `${axisHeight}px` }}
          // `group`, NOT `img`: the lanes contain real buttons and links, and an
          // `img` role would make this a leaf node — which is illegal with
          // interactive descendants (axe: nested-interactive) and would also hide
          // the checkpoint buttons from assistive tech entirely.
          role="group"
          aria-label={t("timeline.roadmap.rowsLabel")}
        >
          {/* Time axis: units top to bottom. Each cell's HEIGHT is its share of the
              horizon, the same percentage the horizontal head used for width — so a
              31-day month is visibly taller than a 28-day one, and the bars line up. */}
          <div className={styles.vtAxis} aria-hidden="true">
            {scale.columns.map((col) => (
              <div
                key={col.key}
                className={cx(styles.vtAxisCell, col.isCurrent && styles.vtAxisCellNow)}
                style={{ height: pct(col.widthPercent) }}
                title={columnTitle(col)}
              >
                <span className={styles.vtAxisMonth}>{columnLabel(col)}</span>
                {col.ordinal === 1 || col.key === scale.columns[0]?.key ? (
                  <span className={styles.vtAxisYear}>{col.year}</span>
                ) : null}
              </div>
            ))}
          </div>

          <div className={styles.vtLanesWrap}>
            <div className={styles.vtGrid} aria-hidden="true">
              {scale.columns.map((col) => (
                <span
                  key={col.key}
                  className={cx(styles.vtGridRow, col.isCurrent && styles.vtGridRowNow)}
                  style={{ height: pct(col.widthPercent) }}
                />
              ))}
            </div>

            {scale.todayPercent !== null ? (
              <>
                <span
                  ref={todayRef}
                  className={styles.vtToday}
                  style={{ top: pct(scale.todayPercent) }}
                  aria-hidden="true"
                />
                <span
                  className={styles.vtTodayFlag}
                  style={{ top: pct(scale.todayPercent) }}
                >
                  {t("timeline.today")}
                </span>
              </>
            ) : null}

            {groups.map((group, index) => {
              const isCollapsed = collapsedSet.has(group.area);
              const aggregate = aggregates.get(group.area);
              return (
                <div
                  key={group.area}
                  id={`vt-area-${index}`}
                  className={styles.vtGroupLanes}
                >
                  {isCollapsed && aggregate ? (
                    <AreaLane area={group.area} aggregate={aggregate} scale={scale} />
                  ) : (
                    group.projects.map((project) => (
                      <ProjectLane
                        key={project.id}
                        scale={scale}
                        project={project}
                        checkpoints={byProject.get(project.id) ?? []}
                        sprints={sprintsByProject.get(project.id) ?? []}
                        onOpenCheckpoint={onOpenCheckpoint}
                      />
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Undated projects, under the axis rather than lost: the axis stays clean and
          the project count on this screen still adds up to the one elsewhere. */}
      {undated.length > 0 ? (
        <div className={styles.vtUndated}>
          <span className={styles.vtUndatedLabel}>
            {t("timeline.roadmap.undated")} ({undated.length})
          </span>
          <ul className={styles.vtUndatedList}>
            {undated.map((project) => (
              <li key={project.id}>
                <Link
                  href={projectHref(project.id)}
                  className={styles.vtUndatedLink}
                  title={`${project.code} · ${project.name} · ${t(
                    "timeline.roadmap.noDates",
                  )}`}
                >
                  <span className="tnum">{project.code}</span>
                  <span className="truncate">{project.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ScreenReaderSummary
        projects={projects}
        checkpoints={checkpoints}
        sprints={sprints}
        scale={scale}
      />
    </div>
  );
}

/**
 * One project lane: the duration bar, the sprints worked on it and its checkpoints.
 *
 * The bar is a LINK, not a div — it is the largest target in the lane and used to
 * do nothing at all. Markers are siblings rather than children and carry a higher
 * `z-index`, so a click on a checkpoint opens the checkpoint and not the project.
 */
function ProjectLane({
  scale,
  project,
  checkpoints,
  sprints,
  onOpenCheckpoint,
}: {
  scale: TimeScale;
  project: ProjectDto;
  checkpoints: CheckpointDto[];
  sprints: SprintDto[];
  onOpenCheckpoint: (id: string) => void;
}) {
  const geometry = barGeometry(scale, project.startDate, project.endDate);
  const tone = HEALTH_TONE[project.health] ?? "grey";
  const barTitle = [
    `${project.code} · ${project.name}`,
    `${formatDay(project.startDate)} – ${formatDay(project.endDate)}`,
    `${t("timeline.roadmap.progress")}: ${project.progress} %`,
  ].join(" · ");

  return (
    <div className={styles.vtLane}>
      {geometry.visible ? (
        <Link
          href={projectHref(project.id)}
          className={cx(
            styles.vtBar,
            variant("vtBar", tone),
            geometry.clippedStart && styles.vtBarCutTop,
            geometry.clippedEnd && styles.vtBarCutBottom,
          )}
          style={{
            top: pct(geometry.leftPercent),
            height: pct(geometry.widthPercent),
          }}
          title={barTitle}
          aria-label={barTitle}
        >
          {/* The bar carries the progress and nothing else. A sideways name inside a
              26 px column was cut off on any bar shorter than a quarter, and the
              lane header directly above already says it. */}
          <span
            className={styles.vtBarFill}
            style={{ height: pct(project.progress) }}
            aria-hidden="true"
          />
        </Link>
      ) : null}

      {/* Sprints: a thin second bar beside the project's own. Same axis, so "when was
          this actually worked on" is answered by looking straight across. */}
      {sprints.map((sprint) => {
        const span = barGeometry(scale, sprint.startDate, sprint.endDate);
        if (!span.visible) return null;
        return (
          <span
            key={sprint.id}
            className={styles.vtSprint}
            style={{ top: pct(span.leftPercent), height: pct(span.widthPercent) }}
            title={`${sprint.name} · ${formatRange(
              sprint.startDate,
              sprint.endDate,
            )} · ${tk("sprintStatus", sprint.status)}`}
          />
        );
      })}

      {checkpoints.map((cp) => {
        const top = markerPercent(scale, cp.dueDate);
        if (top === null) return null;
        // Outside its project's duration: kept visible on purpose (it is real data,
        // probably wrong data) and marked as such instead of silently floating.
        const outside = isOutsideProject(
          cp.dueDate,
          project.startDate,
          project.endDate,
        );
        const title = [
          cp.name,
          formatDay(cp.dueDate),
          tk("checkpointState", cp.lifecycle),
          `${t("checkpointModal.readiness")} ${cp.readiness} %`,
          ...(outside ? [t("timeline.roadmap.checkpointOutside")] : []),
        ].join(" · ");
        return (
          <button
            key={cp.id}
            type="button"
            className={cx(
              styles.vtMarker,
              variant("vtMarker", dayPhase(cp.dueDate, scale.todayIso)),
              variant("vtMarker", cp.lifecycle),
              outside && styles.vtMarkerOutside,
            )}
            style={{ top: pct(top) }}
            title={title}
            aria-label={title}
            onClick={() => onOpenCheckpoint(cp.id)}
          >
            {/* 13 px, not 11: the marker is 24×24 to satisfy the WCAG 2.2 target
                size, and an 11 px glyph floated in it. */}
            {cp.checkpointType === "gate" ? (
              <Flag size={13} aria-hidden="true" />
            ) : (
              <Milestone size={13} aria-hidden="true" />
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * A collapsed area as ONE lane: the span from the earliest start to the latest end,
 * with the group's worst health and mean progress.
 *
 * This is what makes fifty projects readable — expanded they need roughly 5 800 px
 * of sideways scroll, folded they are one 116 px lane per area. Not a link: the
 * lane stands for several projects, so there is no single thing to open. Expanding
 * happens on the area header, which is the control that owns the state.
 */
function AreaLane({
  area,
  aggregate,
  scale,
}: {
  area: string;
  aggregate: AreaAggregate;
  scale: TimeScale;
}) {
  const geometry = barGeometry(scale, aggregate.startDate, aggregate.endDate);
  const tone = HEALTH_TONE[aggregate.health] ?? "grey";
  const title = [
    `${area} — ${t("timeline.roadmap.areaSummary")}`,
    `${aggregate.projectCount} ${t("timeline.roadmap.projectsCount")}`,
    formatRange(aggregate.startDate, aggregate.endDate),
    `${tk("health", aggregate.health)} · ${t("timeline.roadmap.progress")}: ${
      aggregate.progress
    } %`,
  ].join(" · ");

  return (
    <div className={styles.vtLane}>
      {geometry.visible ? (
        <div
          className={cx(
            styles.vtBar,
            styles.vtBarSummary,
            variant("vtBar", tone),
            geometry.clippedStart && styles.vtBarCutTop,
            geometry.clippedEnd && styles.vtBarCutBottom,
          )}
          style={{
            top: pct(geometry.leftPercent),
            height: pct(geometry.widthPercent),
          }}
          title={title}
        >
          <span
            className={styles.vtBarFill}
            style={{ height: pct(aggregate.progress) }}
            aria-hidden="true"
          />
        </div>
      ) : null}
    </div>
  );
}

/**
 * The phone rendering: the same projects and checkpoints, ordered in time as a
 * list. Not a fallback that loses information — it drops only the two things a
 * 390 px screen cannot show honestly anyway, proportional duration and overlap
 * between lanes. Everything else, including each checkpoint's date and state,
 * is here and reachable.
 */
function RoadmapNarrow({
  projects,
  byProject,
  scale,
  onOpenCheckpoint,
}: {
  projects: ProjectDto[];
  byProject: Map<string, CheckpointDto[]>;
  scale: TimeScale;
  onOpenCheckpoint: (id: string) => void;
}) {
  const ordered = useMemo(() => {
    // Undated projects last: they have no place on a time axis, but hiding them
    // would make the list disagree with the project count elsewhere.
    return [...projects].sort((a, b) => {
      if (!a.startDate) return b.startDate ? 1 : 0;
      if (!b.startDate) return -1;
      return a.startDate.localeCompare(b.startDate);
    });
  }, [projects]);

  return (
    <ol className={styles.vtList}>
      {ordered.map((project) => {
        const checkpoints = [...(byProject.get(project.id) ?? [])].sort((a, b) =>
          (a.dueDate ?? "").localeCompare(b.dueDate ?? ""),
        );
        const tone = HEALTH_TONE[project.health] ?? "grey";
        return (
          <li key={project.id} className={styles.vtListItem}>
            <span
              className={cx(styles.vtListRail, variant("vtListRail", tone))}
              aria-hidden="true"
            />
            <div className={styles.vtListHead}>
              <Pill tone="neutral" dot={false} className="tnum">
                {project.code}
              </Pill>
              <Link href={projectHref(project.id)} className={styles.vtLaneName}>
                {project.name}
              </Link>
            </div>
            <div className={styles.vtListMeta}>
              {project.startDate && project.endDate ? (
                <span className="tnum">
                  {formatDay(project.startDate)} – {formatDay(project.endDate)}
                </span>
              ) : (
                <span>{t("timeline.roadmap.noDates")}</span>
              )}
              <span>·</span>
              <span>{tk("health", project.health)}</span>
              <span>·</span>
              <span className="tnum">{project.progress} %</span>
            </div>

            {checkpoints.length > 0 ? (
              <ul className={styles.vtListCps}>
                {checkpoints.map((cp) => {
                  const outside = isOutsideProject(
                    cp.dueDate,
                    project.startDate,
                    project.endDate,
                  );
                  return (
                    <li key={cp.id}>
                      <button
                        type="button"
                        className={styles.vtListCp}
                        title={
                          outside
                            ? `${cp.name} · ${t("timeline.roadmap.checkpointOutside")}`
                            : undefined
                        }
                        onClick={() => onOpenCheckpoint(cp.id)}
                      >
                        <span
                          className={cx(
                            styles.vtListCpDot,
                            variant("vtMarker", dayPhase(cp.dueDate, scale.todayIso)),
                            variant("vtMarker", cp.lifecycle),
                            outside && styles.vtMarkerOutside,
                          )}
                          aria-hidden="true"
                        >
                          {cp.checkpointType === "gate" ? (
                            <Flag size={10} aria-hidden="true" />
                          ) : (
                            <Milestone size={10} aria-hidden="true" />
                          )}
                        </span>
                        <span className={cx("tnum", styles.vtListCpDate)}>
                          {formatDay(cp.dueDate)}
                        </span>
                        <span className={styles.vtListCpName}>{cp.name}</span>
                        {/* The lifecycle stays — the dashed dot plus `title` carry the
                            "outside the project duration" warning without replacing a
                            fact the reader needs either way. */}
                        <span className={styles.vtListCpState}>
                          {tk("checkpointState", cp.lifecycle)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * The chart is a pile of absolutely positioned spans, so a screen reader gets a
 * plain table with the same facts. Visually hidden, never stale — it is built
 * from the same props as the bars. Undated projects appear here too, and the
 * sprint column is the accessible path to the thin bars.
 */
function ScreenReaderSummary({
  projects,
  checkpoints,
  sprints,
  scale,
}: {
  projects: ProjectDto[];
  checkpoints: CheckpointDto[];
  sprints: SprintDto[];
  scale: TimeScale;
}) {
  return (
    <table className="sr-only">
      <caption>
        {t("timeline.roadmap.rowsLabel")} — {formatDay(scale.startIso)} –{" "}
        {formatDay(scale.endIso)}
      </caption>
      <thead>
        <tr>
          <th scope="col">{t("timeline.roadmap.rowsLabel")}</th>
          <th scope="col">{t("timeline.horizon")}</th>
          <th scope="col">{t("timeline.roadmap.progress")}</th>
          <th scope="col">{t("timeline.roadmap.checkpointCount")}</th>
          <th scope="col">{t("timeline.roadmap.sprintCount")}</th>
        </tr>
      </thead>
      <tbody>
        {projects.map((project) => (
          <tr key={project.id}>
            <th scope="row">
              {project.code} {project.name}
            </th>
            <td>
              {formatDay(project.startDate)} – {formatDay(project.endDate)}
            </td>
            <td>{project.progress} %</td>
            <td>
              {checkpoints.filter((cp) => cp.projectId === project.id).length}
            </td>
            <td>{sprints.filter((s) => s.projectId === project.id).length}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Small badge row used by the workspace header to summarise the roadmap. */
export function RoadmapSummary({ projects }: { projects: ProjectDto[] }) {
  const red = projects.filter((p) => p.health === "red").length;
  const amber = projects.filter((p) => p.health === "amber").length;
  return (
    <>
      <Badge tone="neutral">
        {projects.length} {t("timeline.roadmap.rowsLabel")}
      </Badge>
      {red > 0 ? <Badge tone="danger">{red} {tk("health", "red")}</Badge> : null}
      {amber > 0 ? <Badge tone="warn">{amber} {tk("health", "amber")}</Badge> : null}
    </>
  );
}

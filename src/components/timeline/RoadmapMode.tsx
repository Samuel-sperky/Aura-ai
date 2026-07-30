"use client";

// Roadmap mode (spec Q7): one row per PROJECT, grouped by `area`. No team rows —
// teams are out of scope. The bar spans start_date…end_date with the computed
// progress filled in, and the project's checkpoints sit on the axis as markers.

import { useMemo } from "react";
import { Flag, Layers, Milestone } from "lucide-react";
import Link from "next/link";
import type { CheckpointDto } from "@/lib/domain/contracts/checkpoints";
import type { ProjectDto } from "@/lib/domain/contracts/projects";
import {
  barGeometry,
  columnLabel,
  columnTitle,
  dayPhase,
  formatDay,
  groupProjectsByArea,
  markerPercent,
  type TimeScale,
} from "@/lib/timeline";
import { Badge, Pill, cx } from "@/components/ui";
import { EmptyState } from "@/components/states";
import { useIsNarrow } from "@/lib/client/useIsNarrow";
import { t, tk } from "./text";
import { LegendItem } from "./TimelineChart";
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

export interface RoadmapModeProps {
  scale: TimeScale;
  projects: ProjectDto[];
  checkpoints: CheckpointDto[];
  /** Opens the checkpoint modal (deep-linked through `?checkpoint=`). */
  onOpenCheckpoint: (id: string) => void;
}

export function RoadmapMode({
  scale,
  projects,
  checkpoints,
  onOpenCheckpoint,
}: RoadmapModeProps) {
  const groups = useMemo(() => groupProjectsByArea(projects), [projects]);

  const byProject = useMemo(() => {
    const map = new Map<string, CheckpointDto[]>();
    for (const cp of checkpoints) {
      const list = map.get(cp.projectId);
      if (list) list.push(cp);
      else map.set(cp.projectId, [cp]);
    }
    return map;
  }, [checkpoints]);

  const isNarrow = useIsNarrow();

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

  // Height of one time unit. The horizon is 12 months, so this sets the whole
  // axis: 12 × 58 ≈ 700 px, which is roughly the vertical room a laptop has below
  // the toolbar. Bars are positioned in PERCENT of that height, so the number only
  // decides how airy the axis is — never whether a bar lands in the right month.
  const unitPx = 58;
  const axisHeight = Math.max(360, scale.columns.length * unitPx);

  return (
    <div className={styles.vt}>
      <div className={styles.vtLegend}>
        <LegendItem kind="bar">{t("timeline.roadmap.legendProject")}</LegendItem>
        <LegendItem kind="line">{t("timeline.today")}</LegendItem>
        <LegendItem kind="icon">
          <Milestone size={13} aria-hidden="true" />
          {t("timeline.roadmap.legendCheckpoint")}
        </LegendItem>
        <span>{t("timeline.phase.past")} · {t("timeline.phase.future")}</span>
      </div>

      <div className={styles.vtScroll}>
        {/* Header and body repeat the SAME nested flex structure (group → lane), so
            a lane header always sits above its own lane without any width maths. */}
        <div className={styles.vtHead}>
          <div className={styles.vtAxisHead}>
            <span className={styles.vtAxisHeadLabel}>{t("timeline.horizon")}</span>
            <span className={styles.vtAxisHeadHint}>{t("timeline.horizonRoadmap")}</span>
          </div>
          {groups.map((group) => (
            <div key={group.area} className={styles.vtGroupHead}>
              <span className={styles.vtGroupLabel} title={group.area}>
                <Layers size={12} aria-hidden="true" />
                <span className="truncate">{group.area}</span>
                <span className="tnum">{group.projects.length}</span>
              </span>
              <div className={styles.vtLaneHeads}>
                {group.projects.map((project) => (
                  <div key={project.id} className={styles.vtLaneHead}>
                    <Pill tone="neutral" dot={false} className="tnum">
                      {project.code}
                    </Pill>
                    <Link
                      href={`/projects?project=${encodeURIComponent(project.id)}`}
                      className={styles.vtLaneName}
                      title={project.name}
                    >
                      {project.name}
                    </Link>
                    <span className={styles.vtLaneMeta}>
                      {tk("health", project.health)} · {project.progress} %
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
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
          {/* Time axis: months top to bottom. Each cell's HEIGHT is its share of the
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

            {groups.map((group) => (
              <div key={group.area} className={styles.vtGroupLanes}>
                {group.projects.map((project) => {
                  const geometry = barGeometry(scale, project.startDate, project.endDate);
                  const projectCheckpoints = byProject.get(project.id) ?? [];
                  const barTitle = [
                    `${project.code} · ${project.name}`,
                    `${formatDay(project.startDate)} – ${formatDay(project.endDate)}`,
                    `${t("timeline.roadmap.progress")}: ${project.progress} %`,
                  ].join(" · ");
                  const tone = HEALTH_TONE[project.health] ?? "grey";

                  return (
                    <div key={project.id} className={styles.vtLane}>
                      {geometry.visible ? (
                        <div
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
                        >
                          {/* Progress grows downward, the same direction as time. */}
                          <span
                            className={styles.vtBarFill}
                            style={{ height: pct(project.progress) }}
                            aria-hidden="true"
                          />
                          <span className={styles.vtBarLabel}>
                            {project.nextCheckpoint ?? project.name}
                          </span>
                        </div>
                      ) : (
                        <span className={styles.vtNoDates}>
                          {t("timeline.roadmap.noDates")}
                        </span>
                      )}

                      {projectCheckpoints.map((cp) => {
                        const top = markerPercent(scale, cp.dueDate);
                        if (top === null) return null;
                        return (
                          <button
                            key={cp.id}
                            type="button"
                            className={cx(
                              styles.vtMarker,
                              variant("vtMarker", dayPhase(cp.dueDate, scale.todayIso)),
                              variant("vtMarker", cp.lifecycle),
                            )}
                            style={{ top: pct(top) }}
                            title={`${cp.name} · ${formatDay(cp.dueDate)} · ${tk(
                              "checkpointState",
                              cp.lifecycle,
                            )} · ${t("checkpointModal.readiness")} ${cp.readiness} %`}
                            onClick={() => onOpenCheckpoint(cp.id)}
                          >
                            {cp.checkpointType === "gate" ? (
                              <Flag size={11} aria-hidden="true" />
                            ) : (
                              <Milestone size={11} aria-hidden="true" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <ScreenReaderSummary projects={projects} checkpoints={checkpoints} scale={scale} />
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
              <Link
                href={`/projects?project=${encodeURIComponent(project.id)}`}
                className={styles.vtLaneName}
              >
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
                {checkpoints.map((cp) => (
                  <li key={cp.id}>
                    <button
                      type="button"
                      className={styles.vtListCp}
                      onClick={() => onOpenCheckpoint(cp.id)}
                    >
                      <span
                        className={cx(
                          styles.vtListCpDot,
                          variant("vtMarker", dayPhase(cp.dueDate, scale.todayIso)),
                          variant("vtMarker", cp.lifecycle),
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
                      <span className={styles.vtListCpState}>
                        {tk("checkpointState", cp.lifecycle)}
                      </span>
                    </button>
                  </li>
                ))}
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
 * from the same props as the bars.
 */
function ScreenReaderSummary({
  projects,
  checkpoints,
  scale,
}: {
  projects: ProjectDto[];
  checkpoints: CheckpointDto[];
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

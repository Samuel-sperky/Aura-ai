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
  dayPhase,
  formatDay,
  groupProjectsByArea,
  markerPercent,
  type TimeScale,
} from "@/lib/timeline";
import { Badge, Pill } from "@/components/ui";
import { EmptyState } from "@/components/states";
import { t, tk } from "./text";
import {
  LegendItem,
  TimelineBar,
  TimelineChart,
  TimelineGroupHead,
  TimelineMarker,
  TimelineNoDates,
  TimelineRow,
} from "./TimelineChart";
import styles from "./timeline.module.css";

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

  return (
    <TimelineChart
      scale={scale}
      ariaLabel={t("timeline.roadmap.rowsLabel")}
      identityLabel={t("timeline.roadmap.rowsLabel")}
      identityHint={`${t("timeline.horizon")}: ${t("timeline.horizonRoadmap")}`}
      legend={
        <>
          <LegendItem kind="bar">{t("timeline.roadmap.legendProject")}</LegendItem>
          <LegendItem kind="line">{t("timeline.today")}</LegendItem>
          <LegendItem kind="icon">
            <Milestone size={13} aria-hidden="true" />
            {t("timeline.roadmap.legendCheckpoint")}
          </LegendItem>
          <span>{t("timeline.phase.past")} · {t("timeline.phase.future")}</span>
        </>
      }
    >
      {groups.map((group) => (
        <div key={group.area}>
          <TimelineGroupHead>
            <Layers size={13} aria-hidden="true" />
            <span className="truncate">{group.area}</span>
            <span className="tnum">{group.projects.length}</span>
          </TimelineGroupHead>
          {group.projects.map((project) => {
            const geometry = barGeometry(scale, project.startDate, project.endDate);
            const projectCheckpoints = byProject.get(project.id) ?? [];
            const barTitle = [
              `${project.code} · ${project.name}`,
              `${formatDay(project.startDate)} – ${formatDay(project.endDate)}`,
              `${t("timeline.roadmap.progress")}: ${project.progress} %`,
            ].join(" · ");
            return (
              <TimelineRow
                key={project.id}
                scale={scale}
                identity={
                  <>
                    <Pill tone="neutral" dot={false} className="tnum">
                      {project.code}
                    </Pill>
                    <span className={styles.identityMain}>
                      <Link
                        href={`/projects?project=${encodeURIComponent(project.id)}`}
                        className={styles.identityLink}
                        title={project.name}
                      >
                        {project.name}
                      </Link>
                      <span className={styles.identityMeta}>
                        {tk("health", project.health)} · {project.progress} %
                        {projectCheckpoints.length > 0
                          ? ` · ${projectCheckpoints.length}×`
                          : ""}
                      </span>
                    </span>
                  </>
                }
              >
                {geometry.visible ? (
                  <TimelineBar
                    geometry={geometry}
                    tone={HEALTH_TONE[project.health] ?? "grey"}
                    fillPercent={project.progress}
                    label={project.nextCheckpoint ?? project.name}
                    title={barTitle}
                  />
                ) : (
                  <TimelineNoDates />
                )}
                {projectCheckpoints.map((cp) => (
                  <TimelineMarker
                    key={cp.id}
                    percent={markerPercent(scale, cp.dueDate)}
                    phase={dayPhase(cp.dueDate, scale.todayIso)}
                    variant={cp.lifecycle}
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
                  </TimelineMarker>
                ))}
              </TimelineRow>
            );
          })}
        </div>
      ))}
      <ScreenReaderSummary projects={projects} checkpoints={checkpoints} scale={scale} />
    </TimelineChart>
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

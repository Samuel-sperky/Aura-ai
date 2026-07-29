"use client";

// The card representation of the project list (spec Q19: the table is the
// default, cards are the alternative). Same data, same ordering — only the
// layout changes, which is why the switch is a `Segmented` and not a `Tabs`.
//
// Each card is a real <button> so the whole tile is one keyboard stop with a
// proper accessible name; a clickable <div> would be invisible to a screen reader.

import {
  Avatar,
  Badge,
  Panel,
  PanelBody,
  Pill,
  ProgressBar,
  healthTone,
} from "@/components/ui";
import { HEALTH_TONE, PRIORITY_TONE, healthKey } from "@/lib/client/domain";
import { EM_DASH, dueLabel, fmtDate, fmtPercent } from "@/lib/client/format";
import { t } from "@/lib/i18n";
import type { ProjectDto } from "@/lib/domain/contracts/projects";

export interface ProjectCardsProps {
  projects: ReadonlyArray<ProjectDto>;
  onOpen: (project: ProjectDto) => void;
}

export function ProjectCards({ projects, onOpen }: ProjectCardsProps) {
  return (
    <div className="cards-grid">
      {/* One <style> for the whole grid — never one per card. */}
      <style>{PROJECT_CARDS_CSS}</style>
      {projects.map((p) => (
        <Panel key={p.id} className="pc-card">
          <PanelBody>
            <button
              type="button"
              className="pc-hit"
              onClick={() => onOpen(p)}
              aria-label={`${p.code} ${p.name}`}
            >
              <span className="pc-head">
                <span className="pc-code">{p.code}</span>
                <Pill tone={HEALTH_TONE[p.health]}>{t(healthKey(p.health))}</Pill>
              </span>
              <span className="pc-name">{p.name}</span>
            </button>

            <div className="row row-wrap pc-meta">
              {p.area ? <Badge>{p.area}</Badge> : null}
              <Badge tone={PRIORITY_TONE[p.priority]}>{p.priority}</Badge>
            </div>

            <div className="pc-progress">
              <div className="row">
                <span className="meta">{t("projects.field.progress")}</span>
                <span className="spacer" />
                <span className="tnum">{fmtPercent(p.progress)}</span>
              </div>
              <ProgressBar
                value={p.progress}
                tone={healthTone(p.progress)}
                label={`${t("projects.field.progress")} ${p.code}`}
              />
            </div>

            <div className="pc-next">
              <span className="meta">{t("projects.field.nextCheckpoint")}</span>
              {p.nextCheckpoint ? (
                <>
                  <span className="truncate">{p.nextCheckpoint}</span>
                  <span className="meta">
                    {fmtDate(p.nextCheckpointDate)} ·{" "}
                    {dueLabel(p.nextCheckpointDate)}
                  </span>
                </>
              ) : (
                <span className="muted">{EM_DASH}</span>
              )}
            </div>

            {p.owner ? (
              <div className="row pc-owner">
                <Avatar size="sm" name={p.owner} initials={p.ownerInitials} />
                <span className="truncate">{p.owner}</span>
              </div>
            ) : null}
          </PanelBody>
        </Panel>
      ))}
    </div>
  );
}

const PROJECT_CARDS_CSS = `
.pc-card .panel-body { display: flex; flex-direction: column; gap: var(--space-3); }
.pc-hit {
  display: flex; flex-direction: column; gap: 4px;
  width: 100%; padding: 0; text-align: left; color: inherit;
  border-radius: var(--radius-sm);
}
.pc-hit:hover .pc-name { color: var(--accent-ink); }
.pc-head { display: flex; align-items: center; gap: var(--space-2); }
.pc-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: var(--text-xs); letter-spacing: 0.02em; color: var(--muted);
}
.pc-head .pill { margin-left: auto; }
.pc-name {
  font-size: var(--text-lg); font-weight: 600; letter-spacing: -0.005em;
  color: var(--ink); transition: color var(--transition);
}
.pc-meta { gap: var(--space-2); }
.pc-progress { display: flex; flex-direction: column; gap: 5px; }
.pc-next {
  display: flex; flex-direction: column; gap: 2px; min-width: 0;
  padding-top: var(--space-3); border-top: 1px solid var(--border-soft);
}
.pc-owner { padding-top: var(--space-1); }
`;

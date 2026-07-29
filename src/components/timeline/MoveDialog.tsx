"use client";

// Spec Q13 — the keyboard alternative to drag & drop, and the ONLY way to move an
// item on a phone (contract §3.2/72 makes dragging desktop-only). Opened with `M`
// on a focused item or with the item's Move button; picks a target sprint from a
// plain <select> and posts to `POST /api/work-items/[id]/move`.
//
// WCAG 2.2 AA depends on this dialog existing: a drag-only planner is unusable
// without a pointer, so this is not a nice-to-have.

import { useState } from "react";
import { Move } from "lucide-react";
import type { SprintWithMetricsDto } from "@/lib/domain/contracts/sprints";
import type { WorkItemDto } from "@/lib/domain/contracts/workItems";
import { formatRange } from "@/lib/timeline";
import { Button, Field, Modal, Select } from "@/components/ui";
import { moveTargets } from "./moveTargets";
import { t } from "./text";

/** Sentinel `<option>` value for "no sprint" (an empty value is the placeholder). */
const BACKLOG = "__backlog__";

export interface MoveDialogProps {
  /** The item being moved; null closes the dialog. */
  item: WorkItemDto | null;
  /**
   * Sprints in the planner's horizon — ACROSS projects, because the planner axis
   * is not filtered to one. They are narrowed to the item's own project below.
   */
  sprints: SprintWithMetricsDto[];
  busy?: boolean;
  onClose: () => void;
  /** `null` means "back to the backlog". */
  onMove: (item: WorkItemDto, sprintId: string | null) => void;
}

/**
 * Mounts the body only while open and KEYED BY ITEM, so the target select is
 * seeded from the item currently being moved. A reset effect would be the other
 * way to do it, and the wrong one — it renders once with the previous item's
 * target still selected.
 */
export function MoveDialog(props: MoveDialogProps) {
  if (!props.item) return null;
  return <MoveDialogBody key={props.item.id} {...props} />;
}

function MoveDialogBody({
  item,
  sprints,
  busy = false,
  onClose,
  onMove,
}: MoveDialogProps) {
  const [target, setTarget] = useState<string>(item?.sprintId ?? BACKLOG);

  if (!item) return null;

  const unchanged = (item.sprintId ?? BACKLOG) === target;

  // Only the item's OWN project — see ./moveTargets for why the whole horizon was
  // wrong (the API rejects a cross-project target with 400, so those options could
  // only ever end in an error toast).
  const targets = moveTargets(sprints, item);

  return (
    <Modal
      open
      onClose={onClose}
      title={t("planner.move.title")}
      subtitle={item.title}
      size="sm"
      dismissible={!busy}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t("action.cancel")}
          </Button>
          <Button
            variant="accent"
            icon={Move}
            loading={busy}
            disabled={unchanged}
            onClick={() => onMove(item, target === BACKLOG ? null : target)}
          >
            {t("planner.move.confirm")}
          </Button>
        </>
      }
    >
      <Field
        label={t("planner.move.target")}
        htmlFor="move-target"
        hint={t("planner.keyboardHint")}
      >
        <Select
          id="move-target"
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          options={[
            { value: BACKLOG, label: t("planner.move.toBacklog") },
            ...targets.map((sprint) => ({
              value: sprint.id,
              label: `${sprint.name} · ${formatRange(sprint.startDate, sprint.endDate)}`,
            })),
          ]}
        />
      </Field>
    </Modal>
  );
}

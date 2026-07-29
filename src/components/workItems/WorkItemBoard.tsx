"use client";

// The board representation, grouped by `status_category` (spec Q28 — the list is
// the default, this is the switch).
//
// Dragging a card between columns performs the STATUS TRANSITION
// (`POST …/transition`), which is the only thing a board can express that the list
// cannot. Ordering is NOT draggable here: `rank_value` is a single global order,
// and letting a board column rewrite it would silently reorder the backlog.
//
// KEYBOARD PARITY: every card carries a status <select>, so the transition is
// reachable without a pointer. Dragging is the shortcut, never the only route.

import { useMemo } from "react";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Avatar, Badge, Panel, PanelBody, PanelHead, Select } from "@/components/ui";
import { EmptyState } from "@/components/states";
import {
  ITEM_TYPE_ICON,
  PRIORITY_TONE,
  WORK_ITEM_STATUS_ORDER,
  itemTypeKey,
  statusKey,
} from "@/lib/client/domain";
import { EM_DASH, daysUntil, fmtDate, fmtInt } from "@/lib/client/format";
import { t } from "@/lib/i18n";
import type { WorkItemDto, WorkItemStatus } from "@/lib/domain/contracts/workItems";

export interface WorkItemBoardProps {
  items: ReadonlyArray<WorkItemDto>;
  onOpen: (item: WorkItemDto) => void;
  onTransition: (item: WorkItemDto, status: WorkItemStatus) => void;
  canWrite: boolean;
}

export function WorkItemBoard({
  items,
  onOpen,
  onTransition,
  canWrite,
}: WorkItemBoardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const columns = useMemo(() => {
    const grouped = new Map<WorkItemStatus, WorkItemDto[]>();
    for (const status of WORK_ITEM_STATUS_ORDER) grouped.set(status, []);
    for (const item of items) {
      grouped.get(item.statusCategory)?.push(item);
    }
    return grouped;
  }, [items]);

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  function onDragEnd(event: DragEndEvent): void {
    const { active, over } = event;
    if (!over) return;
    const status = String(over.id) as WorkItemStatus;
    if (!WORK_ITEM_STATUS_ORDER.includes(status)) return;
    const item = byId.get(String(active.id));
    if (!item || item.statusCategory === status) return;
    onTransition(item, status);
  }

  return (
    <div className="wb-root">
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="wb-columns">
          {WORK_ITEM_STATUS_ORDER.map((status) => (
            <BoardColumn
              key={status}
              status={status}
              rows={columns.get(status) ?? []}
              onOpen={onOpen}
              onTransition={onTransition}
              canWrite={canWrite}
            />
          ))}
        </div>
      </DndContext>
      <style>{WORK_ITEM_BOARD_CSS}</style>
    </div>
  );
}

function BoardColumn({
  status,
  rows,
  onOpen,
  onTransition,
  canWrite,
}: {
  status: WorkItemStatus;
  rows: ReadonlyArray<WorkItemDto>;
  onOpen: (item: WorkItemDto) => void;
  onTransition: (item: WorkItemDto, status: WorkItemStatus) => void;
  canWrite: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status, disabled: !canWrite });
  const points = rows.reduce((sum, r) => sum + r.storyPoints, 0);

  return (
    <Panel soft className={isOver ? "wb-col wb-col-over" : "wb-col"}>
      <PanelHead
        as="h3"
        title={t(statusKey(status))}
        subtitle={`${fmtInt(rows.length)} · ${fmtInt(points)} SP`}
      />
      <PanelBody className="wb-body">
        {/* The droppable is this inner element, not PanelBody: A7's component
            takes no ref, and wrapping keeps the drop target the full column. */}
        <div ref={setNodeRef} className="wb-drop">
          {rows.length === 0 ? (
            <EmptyState
              bare
              canAct={false}
              tone="muted"
              title={t("workItems.empty")}
            />
          ) : (
            <ul className="wb-cards">
              {rows.map((item) => (
                <BoardCard
                  key={item.id}
                  item={item}
                  onOpen={onOpen}
                  onTransition={onTransition}
                  canWrite={canWrite}
                />
              ))}
            </ul>
          )}
        </div>
      </PanelBody>
    </Panel>
  );
}

function BoardCard({
  item,
  onOpen,
  onTransition,
  canWrite,
}: {
  item: WorkItemDto;
  onOpen: (item: WorkItemDto) => void;
  onTransition: (item: WorkItemDto, status: WorkItemStatus) => void;
  canWrite: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: item.id, disabled: !canWrite });
  const Icon = ITEM_TYPE_ICON[item.itemType];
  const overdue =
    item.status !== "done" &&
    item.dueDate !== null &&
    (daysUntil(item.dueDate) ?? 0) < 0;

  return (
    // The drag attributes go on the GRIP, never on the <li>: dnd-kit's attributes
    // include role="button", and a role="button" wrapping a button and a select is
    // a real `nested-interactive` axe violation, not a styling detail.
    <li
      ref={setNodeRef}
      className={isDragging ? "wb-card wb-card-dragging" : "wb-card"}
      style={{ transform: CSS.Translate.toString(transform) }}
    >
      <div className="wb-card-top">
        <Icon size={14} aria-hidden="true" className="muted" />
        <span className="sr-only">{t(itemTypeKey(item.itemType))}</span>
        {item.projectCode ? (
          <span className="wb-code">{item.projectCode}</span>
        ) : null}
        <span className="spacer" />
        <Badge tone={PRIORITY_TONE[item.priority]}>{item.priority}</Badge>
        {canWrite ? (
          <button
            type="button"
            ref={setActivatorNodeRef}
            className="wb-grip"
            aria-label={`${t("workItems.action.move")} — ${item.title}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical size={13} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <button type="button" className="wb-card-hit" onClick={() => onOpen(item)}>
        <span className="wb-card-title">{item.title}</span>
      </button>

      <div className="wb-card-foot">
        {item.assigneeId && item.assigneeName ? (
          <Avatar
            size="sm"
            name={item.assigneeName}
            initials={item.assigneeInitials ?? undefined}
          />
        ) : (
          <span className="meta">{t("workItems.unassigned")}</span>
        )}
        <span className="spacer" />
        <span className="tnum meta">{fmtInt(item.storyPoints)} SP</span>
        <span className={overdue ? "wl-late tnum meta" : "meta tnum"}>
          {item.dueDate ? fmtDate(item.dueDate) : EM_DASH}
        </span>
      </div>

      {canWrite ? (
        <Select
          className="wb-card-status"
          aria-label={`${t("workItems.field.status")} — ${item.title}`}
          value={item.statusCategory}
          options={WORK_ITEM_STATUS_ORDER.map((s) => ({
            value: s,
            label: t(statusKey(s)),
          }))}
          onChange={(e) => onTransition(item, e.target.value as WorkItemStatus)}
          // The card is draggable; a pointerdown on the select must not start a drag.
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        />
      ) : null}
    </li>
  );
}

const WORK_ITEM_BOARD_CSS = `
.wb-root { width: 100%; overflow-x: auto; }
.wb-columns {
  display: grid;
  grid-template-columns: repeat(4, minmax(240px, 1fr));
  gap: var(--grid-gap);
  min-width: 1000px;
  align-items: start;
}
.wb-col { display: flex; flex-direction: column; }
.wb-col-over { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-tint); }
.wb-body { display: flex; flex-direction: column; }
.wb-drop { display: flex; flex-direction: column; min-height: 120px; }
.wb-cards { list-style: none; display: flex; flex-direction: column; gap: var(--space-2); }
.wb-card {
  display: flex; flex-direction: column; gap: var(--space-2);
  padding: var(--space-3);
  background: var(--panel); border: 1px solid var(--border);
  border-radius: var(--radius-md); box-shadow: var(--shadow-sm);
  touch-action: none;
}
.wb-card-dragging { box-shadow: var(--shadow-pop); border-color: var(--accent); }
.wb-card-hit {
  display: flex; flex-direction: column; gap: 5px;
  padding: 0; text-align: left; color: inherit; border-radius: var(--radius-sm);
}
.wb-card-top { display: flex; align-items: center; gap: var(--space-2); }
.wb-grip {
  display: inline-flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border-radius: var(--radius-sm);
  color: var(--muted); cursor: grab; touch-action: none;
}
.wb-grip:hover { color: var(--accent); background: var(--accent-tint); }
.wb-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: var(--text-xs); color: var(--muted);
}
.wb-card-title { font-weight: 500; color: var(--ink); }
.wb-card-hit:hover .wb-card-title { color: var(--accent-ink); }
.wb-card-foot { display: flex; align-items: center; gap: var(--space-2); }
.wb-card-status { min-height: 26px; padding: 2px 24px 2px 8px; font-size: var(--text-xs); }
@media (max-width: 700px) {
  .wb-columns { grid-template-columns: repeat(4, minmax(220px, 1fr)); min-width: 900px; }
  .wb-card { touch-action: auto; }
}
`;

"use client";

// The DEFAULT work-item view (spec Q28): a list, because two levels of hierarchy
// read better indented than spread across board columns.
//
// ORDERING (spec Q27) is manual `rank_value`, and it is reachable three ways:
//   1. drag & drop — a pointer gesture, and therefore DESKTOP ONLY (contract
//      §3.2/72). The handle is hidden under 900 px, which disables dragging on a
//      phone instead of offering a gesture that cannot be performed reliably.
//   2. ↑ / ↓ buttons on every row — a one-step swap with the neighbour
//      (`POST …/rank` with `direction`), the keyboard-and-touch equivalent.
//   3. the "Presunúť" dialog for moving between sprints.
// Only top-level rows reorder: a subtask's position inside its parent is not a
// product concept here.
//
// SUBTASKS are loaded lazily per expanded parent — opening a 200-row backlog must
// not fetch everybody's children. Parent points render as "5 (3+2)" (spec Q26).

import { useCallback, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  GripVertical,
  MoveRight,
  Plus,
} from "lucide-react";
import { Avatar, Badge, Button, Pill, Spinner, tooltipProps } from "@/components/ui";
import {
  ITEM_TYPE_ICON,
  PRIORITY_TONE,
  WORK_ITEM_STATUS_TONE,
  itemTypeKey,
  statusKey,
} from "@/lib/client/domain";
import {
  EM_DASH,
  daysUntil,
  fmtDate,
  fmtMinutes,
  fmtRollupPoints,
} from "@/lib/client/format";
import { t } from "@/lib/i18n";
// The ONE typing guard for the `M` shortcut, shared with the sprint planner.
// A local `closest("input, textarea, select")` check used to live here and missed
// `contenteditable`, so the two keyboard surfaces disagreed about what counts as
// typing.
import { isTypingTarget } from "@/lib/timeline";
import type { WorkItemDto } from "@/lib/domain/contracts/workItems";
import { arrayMove, rankForMove } from "./rank";

export interface WorkItemListProps {
  /** Top-level rows in server order (`rank_value` ascending). */
  items: ReadonlyArray<WorkItemDto>;
  /** Loaded subtasks per parent id; a missing key means "not loaded yet". */
  childrenByParent: ReadonlyMap<string, WorkItemDto[]>;
  expanded: ReadonlySet<string>;
  onToggleExpand: (id: string) => void;
  onOpen: (item: WorkItemDto) => void;
  onAddSubtask: (parent: WorkItemDto) => void;
  onMove: (item: WorkItemDto) => void;
  /** Absolute reposition after a drop. */
  onRank: (item: WorkItemDto, rankValue: number) => void;
  /** One-step swap with the neighbour — the keyboard path. */
  onNudge: (item: WorkItemDto, direction: "up" | "down") => void;
  canWrite: boolean;
  /** Blocks reordering while a rank request is in flight. */
  busyId?: string | null;
}

export function WorkItemList({
  items,
  childrenByParent,
  expanded,
  onToggleExpand,
  onOpen,
  onAddSubtask,
  onMove,
  onRank,
  onNudge,
  canWrite,
  busyId = null,
}: WorkItemListProps) {
  // Optimistic order so a drop does not wait for the round trip to redraw.
  const [order, setOrder] = useState<string[] | null>(null);

  const ids = useMemo(() => items.map((i) => i.id), [items]);
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const view = useMemo(() => {
    if (!order) return items;
    const seen = new Set(order);
    const known = order
      .map((id) => byId.get(id))
      .filter((i): i is WorkItemDto => i !== undefined);
    // Anything the server added since the drop still has to render.
    return [...known, ...items.filter((i) => !seen.has(i.id))];
  }, [order, items, byId]);

  const sensors = useSensors(
    // A small distance threshold so a click on a row action is never read as a
    // drag — the single most common complaint about sortable lists.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const current = view.map((i) => i.id);
      const from = current.indexOf(String(active.id));
      const to = current.indexOf(String(over.id));
      if (from === -1 || to === -1) return;

      const ranks = view.map((i) => i.rankValue);
      const rank = rankForMove(ranks, from, to);
      setOrder(arrayMove(current, from, to));
      const moved = byId.get(String(active.id));
      if (moved && rank !== null) onRank(moved, rank);
    },
    [view, byId, onRank],
  );

  return (
    <div className="wl-root">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ul className="wl-list">
            {view.map((item, index) => (
              <SortableRow
                key={item.id}
                item={item}
                index={index}
                lastIndex={view.length - 1}
                expanded={expanded.has(item.id)}
                childRows={childrenByParent.get(item.id)}
                onToggleExpand={onToggleExpand}
                onOpen={onOpen}
                onAddSubtask={onAddSubtask}
                onMove={onMove}
                onNudge={onNudge}
                canWrite={canWrite}
                busy={busyId === item.id}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <style>{WORK_ITEM_LIST_CSS}</style>
    </div>
  );
}

interface SortableRowProps {
  item: WorkItemDto;
  index: number;
  lastIndex: number;
  expanded: boolean;
  childRows: WorkItemDto[] | undefined;
  onToggleExpand: (id: string) => void;
  onOpen: (item: WorkItemDto) => void;
  onAddSubtask: (parent: WorkItemDto) => void;
  onMove: (item: WorkItemDto) => void;
  onNudge: (item: WorkItemDto, direction: "up" | "down") => void;
  canWrite: boolean;
  busy: boolean;
}

function SortableRow({
  item,
  index,
  lastIndex,
  expanded,
  childRows,
  onToggleExpand,
  onOpen,
  onAddSubtask,
  onMove,
  onNudge,
  canWrite,
  busy,
}: SortableRowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, disabled: !canWrite });

  const hasChildren = item.childCount > 0;

  return (
    <li
      ref={setNodeRef}
      className={isDragging ? "wl-item wl-dragging" : "wl-item"}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      // `M` opens the move dialog (spec Q13). Ignored while a field has focus so
      // typing an "m" into a filter never moves anything.
      onKeyDown={(event) => {
        if (!canWrite) return;
        if (event.key !== "m" && event.key !== "M") return;
        if (isTypingTarget(event.target as HTMLElement)) return;
        event.preventDefault();
        onMove(item);
      }}
    >
      <div className="wl-row">
        {canWrite ? (
          <button
            type="button"
            ref={setActivatorNodeRef}
            className="wl-grip"
            aria-label={`${t("workItems.action.move")} ${item.title}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical size={15} aria-hidden="true" />
          </button>
        ) : (
          <span className="wl-grip wl-grip-empty" aria-hidden="true" />
        )}

        {hasChildren ? (
          <button
            type="button"
            className="wl-twisty"
            aria-expanded={expanded}
            aria-label={`${t("workItems.subtasks")} ${item.title}`}
            onClick={() => onToggleExpand(item.id)}
          >
            {expanded ? (
              <ChevronDown size={15} aria-hidden="true" />
            ) : (
              <ChevronRight size={15} aria-hidden="true" />
            )}
          </button>
        ) : (
          <span className="wl-twisty wl-grip-empty" aria-hidden="true" />
        )}

        <WorkItemCells item={item} onOpen={onOpen} />

        <div className="wl-actions">
          {busy ? <Spinner size={14} label={t("state.loading")} /> : null}
          {canWrite ? (
            <>
              <Button
                size="xs"
                variant="ghost"
                iconOnly
                icon={ArrowUp}
                aria-label={`${t("workItems.action.moveUp")} — ${item.title}`}
                {...tooltipProps(t("workItems.action.moveUp"))}
                disabled={index === 0 || busy}
                onClick={() => onNudge(item, "up")}
              />
              <Button
                size="xs"
                variant="ghost"
                iconOnly
                icon={ArrowDown}
                aria-label={`${t("workItems.action.moveDown")} — ${item.title}`}
                {...tooltipProps(t("workItems.action.moveDown"))}
                disabled={index === lastIndex || busy}
                onClick={() => onNudge(item, "down")}
              />
              <Button
                size="xs"
                variant="ghost"
                iconOnly
                icon={MoveRight}
                aria-label={`${t("workItems.move.title")} — ${item.title}`}
                {...tooltipProps(t("workItems.move.title"))}
                onClick={() => onMove(item)}
              />
              {item.parentId === null ? (
                <Button
                  size="xs"
                  variant="ghost"
                  iconOnly
                  icon={Plus}
                  aria-label={`${t("workItems.addSubtask")} — ${item.title}`}
                  {...tooltipProps(t("workItems.addSubtask"))}
                  onClick={() => onAddSubtask(item)}
                />
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      {expanded ? (
        <ul className="wl-children">
          {childRows === undefined ? (
            <li className="wl-child-loading">
              <Spinner size={14} label={t("state.loading")} />
              <span className="meta">{t("state.loading")}</span>
            </li>
          ) : childRows.length === 0 ? (
            <li className="wl-child-loading">
              <span className="meta">{t("workItems.subtasksNone")}</span>
            </li>
          ) : (
            childRows.map((child) => (
              <li key={child.id} className="wl-child">
                <div className="wl-row">
                  <span className="wl-grip wl-grip-empty" aria-hidden="true" />
                  <WorkItemCells item={child} onOpen={onOpen} />
                </div>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </li>
  );
}

function WorkItemCells({
  item,
  onOpen,
}: {
  item: WorkItemDto;
  onOpen: (item: WorkItemDto) => void;
}) {
  const Icon = ITEM_TYPE_ICON[item.itemType];
  const overdue =
    item.status !== "done" &&
    item.dueDate !== null &&
    (daysUntil(item.dueDate) ?? 0) < 0;

  return (
    <>
      <button type="button" className="wl-title" onClick={() => onOpen(item)}>
        <span className="wl-type" title={t(itemTypeKey(item.itemType))}>
          <Icon size={14} aria-hidden="true" />
          <span className="sr-only">{t(itemTypeKey(item.itemType))}</span>
        </span>
        <span className="wl-title-text truncate">{item.title}</span>
      </button>

      <span className="wl-meta">
        {item.projectCode ? (
          <span className="wl-code">{item.projectCode}</span>
        ) : null}
        {item.sprintName ? (
          <Badge>{item.sprintName}</Badge>
        ) : (
          <span className="meta">{t("workItems.noSprint")}</span>
        )}
      </span>

      <span className="wl-col wl-col-status">
        <Pill tone={WORK_ITEM_STATUS_TONE[item.status]}>{t(statusKey(item.status))}</Pill>
      </span>

      <span className="wl-col wl-col-priority">
        <Badge tone={PRIORITY_TONE[item.priority]}>{item.priority}</Badge>
      </span>

      <span className="wl-col wl-col-points tnum">
        {fmtRollupPoints(item.storyPoints, item.childStoryPoints, item.childCount)}
      </span>

      <span className="wl-col wl-col-due">
        {item.dueDate ? (
          <span className={overdue ? "wl-late tnum" : "tnum"}>
            {fmtDate(item.dueDate)}
          </span>
        ) : (
          <span className="muted">{EM_DASH}</span>
        )}
      </span>

      <span className="wl-col wl-col-time meta tnum">
        {item.loggedMinutes > 0 ? fmtMinutes(item.loggedMinutes) : ""}
      </span>

      <span className="wl-col wl-col-assignee">
        {item.assigneeId && item.assigneeName ? (
          <span className="row">
            <Avatar
              size="sm"
              name={item.assigneeName}
              initials={item.assigneeInitials ?? undefined}
            />
            <span className="truncate wl-assignee-name">{item.assigneeName}</span>
          </span>
        ) : (
          <span className="meta">{t("workItems.unassigned")}</span>
        )}
      </span>
    </>
  );
}

const WORK_ITEM_LIST_CSS = `
.wl-root { width: 100%; overflow-x: auto; }
.wl-list, .wl-children { list-style: none; }
.wl-list { min-width: 900px; }
.wl-item { border-bottom: 1px solid var(--border-soft); background: var(--panel); }
.wl-item:last-child { border-bottom: 0; }
.wl-dragging { position: relative; z-index: 5; box-shadow: var(--shadow-pop); }
.wl-row {
  display: grid;
  grid-template-columns: 24px 24px minmax(200px, 1fr) minmax(120px, 200px) 116px 56px 74px 104px 74px minmax(120px, 170px) auto;
  align-items: center;
  gap: var(--space-2);
  padding: var(--row-pad-y) var(--row-pad-x);
}
.wl-row > * { min-width: 0; }
.wl-item:hover > .wl-row { background: color-mix(in srgb, var(--ink) 3%, transparent); }
.wl-grip, .wl-twisty {
  display: flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; border-radius: var(--radius-sm);
  color: var(--muted);
}
.wl-grip { cursor: grab; touch-action: none; }
.wl-grip:hover, .wl-twisty:hover { color: var(--accent); background: var(--accent-tint); }
.wl-grip-empty { cursor: default; }
.wl-title {
  display: flex; align-items: center; gap: var(--space-2);
  min-width: 0; padding: 0; text-align: left; color: var(--ink);
  border-radius: var(--radius-sm);
}
.wl-title:hover .wl-title-text { color: var(--accent-ink); }
.wl-title-text { font-weight: 500; transition: color var(--transition); }
.wl-type { display: inline-flex; flex-shrink: 0; color: var(--muted); }
.wl-meta { display: flex; align-items: center; gap: var(--space-2); min-width: 0; }
.wl-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: var(--text-xs); color: var(--muted); white-space: nowrap;
}
.wl-col { display: flex; align-items: center; }
.wl-col-points, .wl-col-due, .wl-col-time { justify-content: flex-end; text-align: right; }
.wl-late { color: var(--danger); font-weight: 600; }
.wl-assignee-name { font-size: var(--text-sm); }
.wl-actions {
  display: flex; align-items: center; justify-content: flex-end; gap: 2px;
  opacity: 0; transition: opacity var(--transition);
}
.wl-item:hover .wl-actions, .wl-item:focus-within .wl-actions { opacity: 1; }
.wl-children { background: var(--panel2); border-top: 1px solid var(--border-soft); }
.wl-child { border-bottom: 1px solid var(--border-soft); }
.wl-child:last-child { border-bottom: 0; }
.wl-child .wl-row { padding-left: calc(var(--row-pad-x) + var(--space-6)); }
.wl-child-loading {
  display: flex; align-items: center; gap: var(--space-2);
  padding: var(--row-pad-y) calc(var(--row-pad-x) + var(--space-6));
}
/* Drag & drop is a desktop gesture (contract §3.2/72): hide the handle where it
   would compete with scrolling, and always keep the arrow buttons visible there. */
@media (max-width: 900px) {
  .wl-grip { display: none; }
  .wl-actions { opacity: 1; }
}
`;

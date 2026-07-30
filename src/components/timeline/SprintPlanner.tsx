"use client";

// The sprint planner: backlog on the left, one column per sprint on the right,
// the per-person capacity panel underneath (contract §3.2/53 — a panel, not a
// route).
//
// INTERACTIONS
//   * drag & drop (`@dnd-kit`) between and inside columns — DESKTOP ONLY
//   * keyboard: `M` opens the Move dialog, `↑`/`↓` reorder (spec Q13). This path
//     is mandatory for WCAG 2.2 AA and is also the mobile path.
//   * every mutation carries the row `version`; a 409 shows the SERVER's Slovak
//     message and refetches — the UI never invents its own conflict wording.
//
// Sprint lifecycle actions live in the column header. `commit` is blocked in the
// UI until the sprint has a goal, mirroring the server rule so the user is not
// sent into a 422.

import { useCallback, useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowUp,
  Ban,
  CheckCheck,
  CornerUpRight,
  GripVertical,
  Inbox,
  Lock,
  Move,
  Play,
  Search,
  Target,
} from "lucide-react";
import type {
  CapacityBreakdownDto,
  SprintAction,
  SprintWithMetricsDto,
} from "@/lib/domain/contracts/sprints";
import type { WorkItemDto } from "@/lib/domain/contracts/workItems";
import {
  capacityTone,
  formatRange,
  isTypingTarget,
  rankForInsert,
} from "@/lib/timeline";
import {
  Badge,
  Button,
  ConfirmDialog,
  Panel,
  PanelBody,
  PanelHead,
  Pill,
  ProgressBar,
  Tooltip,
  cx,
} from "@/components/ui";
import { EmptyState } from "@/components/states";
import { CapacityPanel } from "./CapacityPanel";
import { MoveDialog } from "./MoveDialog";
import { droppableBuckets } from "./moveTargets";
import { t, tk } from "./text";
import styles from "./timeline.module.css";

/** Droppable id of the backlog column. */
export const BACKLOG_ID = "backlog";

/** Buckets keyed by sprint id, plus `BACKLOG_ID` for the unassigned items. */
export type ItemBuckets = Record<string, WorkItemDto[]>;

export interface SprintPlannerProps {
  /** Columns to render, in axis order. */
  sprints: SprintWithMetricsDto[];
  buckets: ItemBuckets;
  /** Capacity of the selected sprint, fetched by the caller. */
  capacity: CapacityBreakdownDto | null;
  selectedSprintId: string | null;
  onSelectSprint: (id: string) => void;
  loading?: boolean;
  /** Drag & drop and the write actions are hidden without `work_items.write`. */
  canWriteItems: boolean;
  canWriteSprints: boolean;
  /** True under 700 px / on a coarse pointer: dragging off, dialog on. */
  dragDisabled: boolean;
  onMoveItem: (item: WorkItemDto, sprintId: string | null, rankValue?: number) => void;
  /** One-step neighbour swap — the keyboard path. */
  onRankItem: (item: WorkItemDto, direction: "up" | "down") => void;
  /** Absolute landing position — the drag & drop path inside one bucket. */
  onRankTo: (item: WorkItemDto, rankValue: number) => void;
  onSprintAction: (
    sprint: SprintWithMetricsDto,
    action: SprintAction,
    targetSprintId?: string | null,
  ) => void;
  busyItemId: string | null;
}

export function SprintPlanner({
  sprints,
  buckets,
  capacity,
  selectedSprintId,
  onSelectSprint,
  loading = false,
  canWriteItems,
  canWriteSprints,
  dragDisabled,
  onMoveItem,
  onRankItem,
  onRankTo,
  onSprintAction,
  busyItemId,
}: SprintPlannerProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [moveItem, setMoveItem] = useState<WorkItemDto | null>(null);
  const [confirm, setConfirm] = useState<{
    sprint: SprintWithMetricsDto;
    action: SprintAction;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const dndEnabled = canWriteItems && !dragDisabled;

  const allItems = useMemo(
    () => Object.values(buckets).flat(),
    [buckets],
  );
  const dragged = dragId ? allItems.find((i) => i.id === dragId) ?? null : null;

  // Which columns the dragged card may actually land in. The axis spans projects,
  // but the move API refuses a cross-project sprint, so a drop on a foreign column
  // could only ever come back 400 — the exact rule the Presunúť dialog applies.
  // Null while nothing is being dragged: no column is dimmed at rest.
  const validBuckets = useMemo(
    () => (dragged ? droppableBuckets(sprints, dragged, BACKLOG_ID) : null),
    [dragged, sprints],
  );

  /** Which bucket an item currently sits in. */
  const bucketOf = useCallback(
    (item: WorkItemDto) => item.sprintId ?? BACKLOG_ID,
    [],
  );

  function onDragEnd(event: DragEndEvent) {
    setDragId(null);
    const { active, over } = event;
    if (!over) return;
    const item = allItems.find((i) => i.id === String(active.id));
    if (!item) return;

    // The drop target is either a column (its droppable id) or another card.
    const overId = String(over.id);
    if (overId === item.id) return;
    const overItem = allItems.find((i) => i.id === overId);
    const targetBucket = overItem ? bucketOf(overItem) : overId;
    if (!(targetBucket in buckets)) return;

    // Belt and braces. The foreign column is already non-droppable, but a keyboard
    // drag or a future collision strategy must not be able to fire a request the
    // server is going to reject — the user would get an error toast for a gesture
    // the UI appeared to invite.
    if (!droppableBuckets(sprints, item, BACKLOG_ID).has(targetBucket)) return;

    const sourceBucket = bucketOf(item);
    const sameBucket = targetBucket === sourceBucket;

    // Ranks of the destination WITHOUT the dragged item — the list the landing
    // index must be resolved against.
    const rest = (buckets[targetBucket] ?? []).filter((i) => i.id !== item.id);
    const overIndex = overItem ? rest.findIndex((i) => i.id === overItem.id) : -1;

    // Dropping ON a card means "take its place". Dragging DOWNWARDS that means
    // landing AFTER it, because the card shifts up once ours leaves — the classic
    // off-by-one of every sortable list.
    let index = rest.length;
    if (overItem && overIndex >= 0) {
      const source = buckets[sourceBucket] ?? [];
      const from = source.findIndex((i) => i.id === item.id);
      const to = source.findIndex((i) => i.id === overItem.id);
      const movingDown = sameBucket && from >= 0 && to > from;
      index = overIndex + (movingDown ? 1 : 0);
    }

    const rankValue = rankForInsert(
      rest.map((i) => i.rankValue),
      index,
    );

    // A reorder inside one bucket is a `rank` change, not a `move` — same result
    // on screen, but the audit row then says what actually happened.
    if (sameBucket) {
      onRankTo(item, rankValue);
      return;
    }
    onMoveItem(item, targetBucket === BACKLOG_ID ? null : targetBucket, rankValue);
  }

  function onItemKeyDown(event: KeyboardEvent<HTMLLIElement>, item: WorkItemDto) {
    // The row itself must be the target: a keystroke inside a nested control
    // (or any typing surface) belongs to that control.
    if (event.target !== event.currentTarget) return;
    if (isTypingTarget(event.target as HTMLElement)) return;
    if (!canWriteItems) return;
    if (event.key === "m" || event.key === "M") {
      event.preventDefault();
      setMoveItem(item);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      onRankItem(item, "up");
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      onRankItem(item, "down");
    }
  }

  const columnsNode = (
    <div className={styles.board}>
      <PlannerColumn
        id={BACKLOG_ID}
        title={t("planner.backlog")}
        subtitle={t("planner.backlogHint")}
        items={buckets[BACKLOG_ID] ?? []}
        backlog
        dndEnabled={dndEnabled}
        canWriteItems={canWriteItems}
        busyItemId={busyItemId}
        onKeyDown={onItemKeyDown}
        onRequestMove={setMoveItem}
        onRankItem={onRankItem}
      />
      {sprints.map((sprint) => (
        <PlannerColumn
          key={sprint.id}
          id={sprint.id}
          title={sprint.name}
          subtitle={sprint.goal || t("planner.goalMissing")}
          sprint={sprint}
          selected={sprint.id === selectedSprintId}
          onSelect={() => onSelectSprint(sprint.id)}
          items={buckets[sprint.id] ?? []}
          dndEnabled={dndEnabled}
          dropDisabled={validBuckets ? !validBuckets.has(sprint.id) : false}
          canWriteItems={canWriteItems}
          canWriteSprints={canWriteSprints}
          busyItemId={busyItemId}
          onKeyDown={onItemKeyDown}
          onRequestMove={setMoveItem}
          onRankItem={onRankItem}
          onSprintAction={(action) => {
            // Everything except `start` and `review` either freezes scope, ends
            // the sprint or moves other people's items — those ask first.
            if (action === "start" || action === "review") {
              onSprintAction(sprint, action);
              return;
            }
            setConfirm({ sprint, action });
          }}
        />
      ))}
    </div>
  );

  return (
    <div className="page-stack">
      <Panel soft>
        <PanelHead
          icon={Target}
          as="h3"
          title={t("planner.title")}
          subtitle={
            dragDisabled ? t("planner.dragDisabled") : t("planner.keyboardHint")
          }
        />
        <PanelBody>
          {sprints.length === 0 ? (
            <EmptyState
              bare
              icon={Inbox}
              title={t("timeline.sprints.emptyTitle")}
              description={t("timeline.sprints.emptyDesc")}
              canAct={false}
            />
          ) : dndEnabled ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={(event: DragStartEvent) => setDragId(String(event.active.id))}
              onDragCancel={() => setDragId(null)}
              onDragEnd={onDragEnd}
              accessibility={{
                screenReaderInstructions: {
                  draggable:
                    "Stlačte medzerník alebo Enter a šípkami vyberte cieľ. Opätovným stlačením položku uložíte, klávesom Escape presun zrušíte. Alternatívne stlačte M pre dialóg Presunúť.",
                },
              }}
            >
              {columnsNode}
              <DragOverlay>
                {dragged ? (
                  <div className={cx(styles.item, styles.itemDragging)}>
                    <span className={styles.itemMain}>
                      <span className={styles.itemTitle}>{dragged.title}</span>
                    </span>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          ) : (
            columnsNode
          )}
        </PanelBody>
      </Panel>

      <CapacityPanel capacity={capacity} loading={loading} />

      <MoveDialog
        item={moveItem}
        sprints={sprints}
        busy={busyItemId !== null && busyItemId === moveItem?.id}
        onClose={() => setMoveItem(null)}
        onMove={(item, sprintId) => {
          setMoveItem(null);
          onMoveItem(item, sprintId);
        }}
      />

      <ConfirmDialog
        open={confirm !== null}
        title={confirm ? sprintActionLabel(confirm.action) : ""}
        message={confirm ? confirmMessage(confirm.action) : ""}
        tone={confirm?.action === "cancel" ? "danger" : "accent"}
        confirmLabel={confirm ? sprintActionLabel(confirm.action) : t("action.confirm")}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return;
          onSprintAction(confirm.sprint, confirm.action);
          setConfirm(null);
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Column
// ---------------------------------------------------------------------------

interface PlannerColumnProps {
  id: string;
  title: string;
  subtitle: string;
  items: WorkItemDto[];
  sprint?: SprintWithMetricsDto;
  backlog?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  dndEnabled: boolean;
  /**
   * True while a card is being dragged that this column cannot accept (it belongs
   * to another project and the move API would reject it). The backlog never sets
   * this — returning an item to it carries no relational constraint.
   */
  dropDisabled?: boolean;
  canWriteItems: boolean;
  canWriteSprints?: boolean;
  busyItemId: string | null;
  onKeyDown: (event: KeyboardEvent<HTMLLIElement>, item: WorkItemDto) => void;
  onRequestMove: (item: WorkItemDto) => void;
  onRankItem: (item: WorkItemDto, direction: "up" | "down") => void;
  onSprintAction?: (action: SprintAction) => void;
}

function PlannerColumn({
  id,
  title,
  subtitle,
  items,
  dropDisabled = false,
  sprint,
  backlog = false,
  selected = false,
  onSelect,
  dndEnabled,
  canWriteItems,
  canWriteSprints = false,
  busyItemId,
  onKeyDown,
  onRequestMove,
  onRankItem,
  onSprintAction,
}: PlannerColumnProps) {
  // `dropDisabled` makes @dnd-kit skip this column in collision detection, so the
  // card cannot be released here at all — better than accepting the drop and then
  // surfacing the server's 400.
  const { setNodeRef, isOver } = useDroppable({
    id,
    disabled: !dndEnabled || dropDisabled,
  });
  const points = items.reduce((sum, item) => sum + item.storyPoints, 0);
  const load = sprint && sprint.capacityPoints > 0
    ? Math.round((points / sprint.capacityPoints) * 100)
    : 0;

  return (
    <section
      className={cx(
        styles.column,
        backlog && styles.columnBacklog,
        selected && styles.columnActive,
      )}
      aria-label={title}
    >
      <header className={styles.columnHead}>
        <div className={styles.columnTitleRow}>
          {backlog ? (
            <Inbox size={15} aria-hidden="true" />
          ) : (
            <Target size={15} aria-hidden="true" />
          )}
          {onSelect ? (
            <button
              type="button"
              className={cx(styles.columnTitle, styles.identityLink)}
              onClick={onSelect}
              aria-pressed={selected}
              title={title}
            >
              {title}
            </button>
          ) : (
            <span className={styles.columnTitle} title={title}>
              {title}
            </span>
          )}
          {sprint ? (
            <Pill tone={sprint.status === "active" ? "accent" : "neutral"} dot={false}>
              {tk("sprintStatus", sprint.status)}
            </Pill>
          ) : null}
        </div>
        <p className={styles.columnGoal}>{subtitle}</p>
        <div className={styles.columnMeta}>
          <span className="tnum">
            {items.length} · {points} {t("planner.points")}
          </span>
          {sprint ? (
            <>
              <span>{formatRange(sprint.startDate, sprint.endDate)}</span>
              {sprint.capacityPoints > 0 ? (
                <span className="tnum">
                  {load} % {t("planner.commitedOfCapacity")}
                </span>
              ) : null}
            </>
          ) : null}
        </div>
        {sprint && sprint.capacityPoints > 0 ? (
          <ProgressBar
            value={Math.min(load, 100)}
            tone={capacityTone(load)}
            label={`${t("capacity.load")} ${sprint.name} ${load} %`}
          />
        ) : null}
        {sprint && sprint.metrics.scopeChangePoints !== 0 ? (
          <span className="meta">
            {t("planner.scopeChange")}: {sprint.metrics.scopeChangePoints > 0 ? "+" : ""}
            {sprint.metrics.scopeChangePoints} {t("planner.points")} (
            {sprint.metrics.scopeChangePercent} %)
          </span>
        ) : null}
        {sprint && canWriteSprints && onSprintAction ? (
          <SprintActions sprint={sprint} onAction={onSprintAction} />
        ) : null}
      </header>

      <SortableContext
        items={items.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
        disabled={!dndEnabled}
      >
        <ul
          ref={setNodeRef}
          className={cx(
            styles.items,
            isOver && styles.itemsOver,
            dropDisabled && styles.itemsBlocked,
          )}
          aria-label={`${title} — ${t("timeline.sprints.itemsInSprint")}`}
        >
          {items.map((item) => (
            <PlannerItem
              key={item.id}
              item={item}
              dndEnabled={dndEnabled}
              canWriteItems={canWriteItems}
              busy={busyItemId === item.id}
              onKeyDown={onKeyDown}
              onRequestMove={onRequestMove}
              onRankItem={onRankItem}
            />
          ))}
          {items.length === 0 ? (
            <li className={styles.dropEmpty}>
              <Move size={16} aria-hidden="true" />
              <span>{dndEnabled ? t("planner.dropHere") : t("planner.emptyItemsDesc")}</span>
            </li>
          ) : null}
        </ul>
      </SortableContext>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Item card
// ---------------------------------------------------------------------------

interface PlannerItemProps {
  item: WorkItemDto;
  dndEnabled: boolean;
  canWriteItems: boolean;
  busy: boolean;
  onKeyDown: (event: KeyboardEvent<HTMLLIElement>, item: WorkItemDto) => void;
  onRequestMove: (item: WorkItemDto) => void;
  onRankItem: (item: WorkItemDto, direction: "up" | "down") => void;
}

function PlannerItem({
  item,
  dndEnabled,
  canWriteItems,
  busy,
  onKeyDown,
  onRequestMove,
  onRankItem,
}: PlannerItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, disabled: !dndEnabled });

  // "5 (3+2)" — the effective points with the subtask split (spec Q26).
  const pointsLabel =
    item.childCount > 0 && item.childStoryPoints !== item.storyPoints
      ? `${item.storyPoints} (${item.ownStoryPoints}+${item.childStoryPoints})`
      : String(item.storyPoints);

  return (
    <li
      ref={setNodeRef}
      className={cx(styles.item, isDragging && styles.itemDragging)}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      // The row is the shortcut host: focusable, named, and it advertises `M`.
      tabIndex={0}
      aria-label={item.title}
      aria-keyshortcuts={canWriteItems ? "M ArrowUp ArrowDown" : undefined}
      aria-busy={busy || undefined}
      onKeyDown={(event) => onKeyDown(event, item)}
    >
      {dndEnabled ? (
        <button
          type="button"
          className={styles.handle}
          aria-label={`${t("planner.dragHandle")}: ${item.title}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={15} aria-hidden="true" />
        </button>
      ) : null}
      <span className={styles.itemMain}>
        <span className={styles.itemTitle} title={item.title}>
          {item.title}
        </span>
        <span className={styles.itemMeta}>
          <Badge tone="neutral">{tk("itemType", item.itemType)}</Badge>
          <Badge tone={item.priority === "P1" ? "warn" : "neutral"}>{item.priority}</Badge>
          <span className="tnum">
            {pointsLabel} {t("planner.points")}
          </span>
          <span className="truncate">
            {item.assigneeName ?? t("common.unassigned")}
          </span>
          <span>{tk("status", item.status)}</span>
        </span>
      </span>
      {canWriteItems ? (
        <span className={styles.itemActions}>
          <Tooltip tip={`${t("planner.move.title")} · ${t("planner.move.shortcut")}`}>
            <Button
              size="xs"
              variant="ghost"
              iconOnly
              icon={Move}
              aria-label={`${t("planner.move.title")}: ${item.title}`}
              disabled={busy}
              onClick={() => onRequestMove(item)}
            />
          </Tooltip>
          <Button
            size="xs"
            variant="ghost"
            iconOnly
            icon={ArrowUp}
            aria-label={`Posunúť vyššie: ${item.title}`}
            disabled={busy}
            onClick={() => onRankItem(item, "up")}
          />
          <Button
            size="xs"
            variant="ghost"
            iconOnly
            icon={ArrowDown}
            aria-label={`Posunúť nižšie: ${item.title}`}
            disabled={busy}
            onClick={() => onRankItem(item, "down")}
          />
        </span>
      ) : null}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Sprint lifecycle
// ---------------------------------------------------------------------------

const ACTION_ICON = {
  commit: Lock,
  start: Play,
  review: Search,
  close: CheckCheck,
  cancel: Ban,
  "carry-over": CornerUpRight,
} as const;

/** Which actions the current status offers. Mirrors `nextSprintStatus` server-side. */
function availableActions(status: SprintWithMetricsDto["status"]): SprintAction[] {
  switch (status) {
    case "draft":
      return ["commit", "cancel"];
    case "planned":
      return ["start", "cancel"];
    case "active":
      return ["review", "cancel"];
    case "review":
      return ["close", "carry-over", "cancel"];
    default:
      return [];
  }
}

function sprintActionLabel(action: SprintAction): string {
  if (action === "carry-over") return t("planner.action.carryOver");
  return t(`planner.action.${action}`);
}

function confirmMessage(action: SprintAction): string {
  if (action === "commit") return t("planner.confirm.commit");
  if (action === "close") return t("planner.confirm.close");
  if (action === "cancel") return t("planner.confirm.cancel");
  return t("planner.confirm.carryOver");
}

function SprintActions({
  sprint,
  onAction,
}: {
  sprint: SprintWithMetricsDto;
  onAction: (action: SprintAction) => void;
}) {
  const actions = availableActions(sprint.status);
  if (actions.length === 0) return null;
  // The server refuses a commit without a goal (422). Blocking it here turns a
  // failed request into an explained disabled button.
  const goalMissing = !sprint.goal || sprint.goal.trim().length === 0;

  return (
    <div className="row row-wrap">
      {actions.map((action) => {
        const blocked = action === "commit" && goalMissing;
        const button = (
          <Button
            key={action}
            size="xs"
            variant={action === "cancel" ? "danger" : "outline"}
            icon={ACTION_ICON[action]}
            disabled={blocked}
            onClick={() => onAction(action)}
          >
            {sprintActionLabel(action)}
          </Button>
        );
        return blocked ? (
          <Tooltip key={action} tip={t("planner.goalRequired")}>
            {button}
          </Tooltip>
        ) : (
          button
        );
      })}
    </div>
  );
}

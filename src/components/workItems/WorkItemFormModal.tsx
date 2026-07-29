"use client";

// Create / edit a work item (spec Q23).
//
// TWO RULES THIS FORM ENCODES:
//   * `storyPoints` binds to `ownStoryPoints`, NEVER to the effective
//     `storyPoints`. For a parent the effective value is the sum of its subtasks
//     (spec Q26); binding it would write the rollup back onto the parent row and
//     double the project's points on the next recompute. A parent that has
//     children therefore shows the field read-only with the rollup explained.
//   * the hierarchy is TWO levels. `parentId` is offered only for items that
//     could legally be a parent; the server rejects a third level anyway (400),
//     and its message is surfaced verbatim.

import { useCallback, useId, useMemo, useState } from "react";
import {
  Button,
  Field,
  FieldRow,
  Input,
  Modal,
  Select,
  Textarea,
  useToast,
} from "@/components/ui";
import { ApiError, apiPatch, apiPost } from "@/lib/api";
import {
  PRIORITIES,
  WORK_ITEM_STATUSES,
  WORK_ITEM_TYPES,
  workItemCreateSchema,
  workItemUpdateSchema,
} from "@/lib/domain/contracts/workItems";
import type {
  Priority,
  WorkItemDto,
  WorkItemStatus,
  WorkItemType,
} from "@/lib/domain/contracts/workItems";
import type { ProjectDto } from "@/lib/domain/contracts/projects";
import type { SprintWithMetricsDto } from "@/lib/domain/contracts/sprints";
import type { DirectoryUser } from "@/lib/client/useDirectory";
import { itemTypeKey, priorityKey, statusKey } from "@/lib/client/domain";
import { fmtRollupPoints } from "@/lib/client/format";
import { t } from "@/lib/i18n";

export interface WorkItemFormModalProps {
  open: boolean;
  onClose: () => void;
  /** null = create. */
  item: WorkItemDto | null;
  /** Pre-selected project for a new item (the active filter). */
  defaultProjectId?: string;
  /** Pre-selected parent for "Pridať podúlohu". */
  defaultParentId?: string | null;
  projects: ReadonlyArray<ProjectDto>;
  sprints: ReadonlyArray<SprintWithMetricsDto>;
  users: ReadonlyArray<DirectoryUser>;
  /** Candidate parents (top-level items of the chosen project). */
  parentCandidates: ReadonlyArray<WorkItemDto>;
  onSaved: (item: WorkItemDto) => void;
}

interface FormState {
  projectId: string;
  sprintId: string;
  parentId: string;
  itemType: WorkItemType;
  title: string;
  description: string;
  status: WorkItemStatus;
  priority: Priority;
  storyPoints: string;
  assigneeId: string;
  dueDate: string;
}

function initialState(
  item: WorkItemDto | null,
  defaultProjectId: string,
  defaultParentId: string | null,
): FormState {
  return {
    projectId: item?.projectId ?? defaultProjectId,
    sprintId: item?.sprintId ?? "",
    parentId: item?.parentId ?? defaultParentId ?? "",
    itemType: item?.itemType ?? "task",
    title: item?.title ?? "",
    description: item?.description ?? "",
    status: item?.status ?? "backlog",
    priority: item?.priority ?? "P2",
    // Bind the OWN value — see the module header.
    storyPoints: String(item?.ownStoryPoints ?? 0),
    assigneeId: item?.assigneeId ?? "",
    dueDate: item?.dueDate ?? "",
  };
}

function nullable(value: string): string | null {
  return value.trim() === "" ? null : value.trim();
}

export function WorkItemFormModal(props: WorkItemFormModalProps) {
  if (!props.open) return null;
  return <WorkItemFormBody {...props} />;
}

function WorkItemFormBody({
  onClose,
  item,
  defaultProjectId = "",
  defaultParentId = null,
  projects,
  sprints,
  users,
  parentCandidates,
  onSaved,
}: WorkItemFormModalProps) {
  const toast = useToast();
  const ids = {
    project: useId(),
    parent: useId(),
    type: useId(),
    title: useId(),
    description: useId(),
    status: useId(),
    priority: useId(),
    points: useId(),
    assignee: useId(),
    due: useId(),
    sprint: useId(),
  };

  const editing = item !== null;
  const [form, setForm] = useState<FormState>(() =>
    initialState(item, defaultProjectId, defaultParentId),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) =>
      setForm((f) => ({ ...f, [key]: value })),
    [],
  );

  /** A parent's points are the sum of its children — the field must stay locked. */
  const pointsLocked = editing && item.childCount > 0;

  const projectOptions = useMemo(
    () => projects.map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` })),
    [projects],
  );

  const sprintOptions = useMemo(
    () =>
      sprints
        .filter((s) => !form.projectId || s.projectId === form.projectId)
        .map((s) => ({ value: s.id, label: s.name })),
    [sprints, form.projectId],
  );

  const parentOptions = useMemo(
    () =>
      parentCandidates
        .filter((c) => c.id !== item?.id && c.projectId === form.projectId)
        .map((c) => ({ value: c.id, label: c.title })),
    [parentCandidates, item?.id, form.projectId],
  );

  const userOptions = useMemo(
    () => users.map((u) => ({ value: u.id, label: u.displayName })),
    [users],
  );

  async function submit(): Promise<void> {
    setError(null);

    const shared = {
      title: form.title,
      description: nullable(form.description),
      itemType: form.itemType,
      status: form.status,
      priority: form.priority,
      storyPoints: pointsLocked ? undefined : Number(form.storyPoints || 0),
      assigneeId: nullable(form.assigneeId),
      dueDate: nullable(form.dueDate),
      sprintId: nullable(form.sprintId),
      parentId: nullable(form.parentId),
    };

    if (editing) {
      const parsed = workItemUpdateSchema.safeParse({
        ...shared,
        version: item.version,
      });
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Skontrolujte zadané údaje.");
        return;
      }
      setBusy(true);
      try {
        const res = await apiPatch<{ workItem: WorkItemDto }>(
          `/api/work-items/${item.id}`,
          parsed.data,
        );
        toast.success(t("action.save"));
        onSaved(res.workItem);
        onClose();
      } catch (err) {
        handleError(err);
      } finally {
        setBusy(false);
      }
      return;
    }

    const parsed = workItemCreateSchema.safeParse({
      ...shared,
      storyPoints: Number(form.storyPoints || 0),
      projectId: form.projectId,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Skontrolujte zadané údaje.");
      return;
    }
    setBusy(true);
    try {
      const res = await apiPost<{ workItem: WorkItemDto }>(
        "/api/work-items",
        parsed.data,
      );
      toast.success(t("action.create"));
      onSaved(res.workItem);
      onClose();
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  }

  function handleError(err: unknown): void {
    if (err instanceof ApiError) {
      if (err.isVersionConflict) {
        toast.error(err.message);
        onClose();
        return;
      }
      setError(err.message);
      return;
    }
    setError("Uloženie zlyhalo. Skúste to prosím znova.");
  }

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={!busy}
      title={editing ? t("workItems.action.edit") : t("workItems.action.create")}
      subtitle={editing ? item.title : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t("action.cancel")}
          </Button>
          <Button variant="accent" loading={busy} onClick={() => void submit()}>
            {t("action.save")}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        noValidate
      >
        <Field label={t("workItems.field.title")} htmlFor={ids.title} required>
          <Input
            id={ids.title}
            value={form.title}
            autoFocus
            onChange={(e) => set("title", e.target.value)}
          />
        </Field>

        <FieldRow>
          <Field label={t("workItems.filter.project")} htmlFor={ids.project} required>
            <Select
              id={ids.project}
              value={form.projectId}
              placeholder={projectOptions.length === 0 ? undefined : "—"}
              options={projectOptions}
              disabled={editing}
              onChange={(e) => {
                // Changing the project invalidates the sprint and the parent.
                setForm((f) => ({
                  ...f,
                  projectId: e.target.value,
                  sprintId: "",
                  parentId: "",
                }));
              }}
            />
          </Field>
          <Field
            label={t("workItems.field.parent")}
            htmlFor={ids.parent}
            hint={t("workItems.error.depth")}
          >
            <Select
              id={ids.parent}
              value={form.parentId}
              placeholder={t("workItems.subtasksNone")}
              options={parentOptions}
              onChange={(e) => set("parentId", e.target.value)}
            />
          </Field>
        </FieldRow>

        <Field label={t("workItems.field.description")} htmlFor={ids.description}>
          <Textarea
            id={ids.description}
            value={form.description}
            rows={4}
            onChange={(e) => set("description", e.target.value)}
          />
        </Field>

        <FieldRow>
          <Field label={t("workItems.field.type")} htmlFor={ids.type}>
            <Select
              id={ids.type}
              value={form.itemType}
              options={WORK_ITEM_TYPES.map((v) => ({
                value: v,
                label: t(itemTypeKey(v)),
              }))}
              onChange={(e) => set("itemType", e.target.value as WorkItemType)}
            />
          </Field>
          <Field label={t("workItems.field.status")} htmlFor={ids.status}>
            <Select
              id={ids.status}
              value={form.status}
              options={WORK_ITEM_STATUSES.map((v) => ({
                value: v,
                label: t(statusKey(v)),
              }))}
              onChange={(e) => set("status", e.target.value as WorkItemStatus)}
            />
          </Field>
        </FieldRow>

        <FieldRow>
          <Field label={t("workItems.field.priority")} htmlFor={ids.priority}>
            <Select
              id={ids.priority}
              value={form.priority}
              options={PRIORITIES.map((v) => ({ value: v, label: t(priorityKey(v)) }))}
              onChange={(e) => set("priority", e.target.value as Priority)}
            />
          </Field>
          <Field
            label={t("workItems.field.storyPoints")}
            htmlFor={ids.points}
            hint={
              pointsLocked
                ? `${t("workItems.points.rollupHint")} · ${fmtRollupPoints(
                    item.storyPoints,
                    item.childStoryPoints,
                    item.childCount,
                  )}`
                : t("workItems.points.ownHint")
            }
          >
            <Input
              id={ids.points}
              type="number"
              min={0}
              max={999}
              step={1}
              inputMode="numeric"
              value={pointsLocked ? String(item.storyPoints) : form.storyPoints}
              readOnly={pointsLocked}
              disabled={pointsLocked}
              onChange={(e) => set("storyPoints", e.target.value)}
            />
          </Field>
        </FieldRow>

        <FieldRow>
          <Field label={t("workItems.field.assignee")} htmlFor={ids.assignee}>
            <Select
              id={ids.assignee}
              value={form.assigneeId}
              placeholder={t("workItems.unassigned")}
              options={userOptions}
              onChange={(e) => set("assigneeId", e.target.value)}
            />
          </Field>
          <Field label={t("workItems.field.dueDate")} htmlFor={ids.due}>
            <Input
              id={ids.due}
              type="date"
              value={form.dueDate}
              onChange={(e) => set("dueDate", e.target.value)}
            />
          </Field>
        </FieldRow>

        <Field label={t("workItems.field.sprint")} htmlFor={ids.sprint}>
          <Select
            id={ids.sprint}
            value={form.sprintId}
            placeholder={t("workItems.noSprint")}
            options={sprintOptions}
            onChange={(e) => set("sprintId", e.target.value)}
          />
        </Field>

        {error ? (
          <p className="field-error" role="alert">
            {error}
          </p>
        ) : null}

        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true">
          {t("action.save")}
        </button>
      </form>
    </Modal>
  );
}

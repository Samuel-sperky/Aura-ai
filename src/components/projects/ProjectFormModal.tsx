"use client";

// Create / edit a project.
//
// WHAT IS DELIBERATELY NOT EDITABLE (spec Q16/Q17):
//   * `progress` — computed from the story points of the project's leaf items
//   * `nextCheckpoint` / `nextCheckpointDate` — cached from the nearest undecided
//     checkpoint
// Both are shown read-only in the detail modal instead. Putting them in the form
// would let a human overwrite a derived value that the server recomputes on the
// next write, which reads as "the app lost my edit".
//
// `health` IS manual (spec Q18) — the owner knows more than the data — but the
// server's `suggestedHealth` is offered as a one-click fill.
//
// Validation runs the SHARED zod contract before the request, so a bad field is
// reported in Slovak without a round trip; the server validates again regardless.

import { useCallback, useId, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
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
  PROJECT_HEALTHS,
  PROJECT_STATUSES,
  projectCreateSchema,
  projectUpdateSchema,
} from "@/lib/domain/contracts/projects";
import type {
  ProjectDto,
  ProjectHealth,
  ProjectStatus,
  Priority,
} from "@/lib/domain/contracts/projects";
import { healthKey, projectStatusKey } from "@/lib/client/domain";
import { t } from "@/lib/i18n";

export interface ProjectFormModalProps {
  open: boolean;
  onClose: () => void;
  /** null = create, a project = edit. */
  project: ProjectDto | null;
  /** Server proposal for `health` (edit only); enables "Použiť návrh". */
  suggestedHealth?: ProjectHealth | null;
  /** Existing areas, offered as a datalist so the free-text field stays tidy. */
  areas?: ReadonlyArray<string>;
  /** Called with the saved project so the caller can refresh in place. */
  onSaved: (project: ProjectDto) => void;
}

interface FormState {
  code: string;
  name: string;
  description: string;
  area: string;
  status: ProjectStatus;
  health: ProjectHealth;
  owner: string;
  startDate: string;
  endDate: string;
  priority: Priority;
}

function initialState(project: ProjectDto | null): FormState {
  return {
    code: project?.code ?? "",
    name: project?.name ?? "",
    description: project?.description ?? "",
    area: project?.area ?? "",
    status: project?.status ?? "planned",
    health: project?.health ?? "grey",
    owner: project?.owner ?? "",
    startDate: project?.startDate ?? "",
    endDate: project?.endDate ?? "",
    priority: project?.priority ?? "P2",
  };
}

/** `""` from an empty date input means "no date", i.e. an explicit null. */
function dateOrNull(value: string): string | null {
  return value.trim() === "" ? null : value.trim();
}

export function ProjectFormModal(props: ProjectFormModalProps) {
  // Remount on every open so the fields always start from the current row.
  if (!props.open) return null;
  return <ProjectFormBody {...props} />;
}

function ProjectFormBody({
  onClose,
  project,
  suggestedHealth,
  areas = [],
  onSaved,
}: ProjectFormModalProps) {
  const toast = useToast();
  const ids = {
    code: useId(),
    name: useId(),
    description: useId(),
    area: useId(),
    status: useId(),
    health: useId(),
    owner: useId(),
    start: useId(),
    end: useId(),
    priority: useId(),
    areaList: useId(),
  };

  const editing = project !== null;
  const [form, setForm] = useState<FormState>(() => initialState(project));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) =>
      setForm((f) => ({ ...f, [key]: value })),
    [],
  );

  const statusOptions = useMemo(
    () => PROJECT_STATUSES.map((s) => ({ value: s, label: t(projectStatusKey(s)) })),
    [],
  );
  const healthOptions = useMemo(
    () => PROJECT_HEALTHS.map((h) => ({ value: h, label: t(healthKey(h)) })),
    [],
  );
  const priorityOptions = useMemo(
    () => PRIORITIES.map((p) => ({ value: p, label: p })),
    [],
  );

  async function submit(): Promise<void> {
    setError(null);

    const shared = {
      name: form.name,
      description: form.description.trim() === "" ? null : form.description,
      area: form.area,
      status: form.status,
      health: form.health,
      owner: form.owner,
      startDate: dateOrNull(form.startDate),
      endDate: dateOrNull(form.endDate),
      priority: form.priority,
    };

    if (editing) {
      const payload = { ...shared, code: form.code, version: project.version };
      const parsed = projectUpdateSchema.safeParse(payload);
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Skontrolujte zadané údaje.");
        return;
      }
      setBusy(true);
      try {
        const res = await apiPatch<{ project: ProjectDto }>(
          `/api/projects/${project.id}`,
          parsed.data,
        );
        toast.success(t("projects.form.updated"));
        onSaved(res.project);
        onClose();
      } catch (err) {
        handleError(err);
      } finally {
        setBusy(false);
      }
      return;
    }

    const payload = { ...shared, code: form.code };
    const parsed = projectCreateSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Skontrolujte zadané údaje.");
      return;
    }
    setBusy(true);
    try {
      const res = await apiPost<{ project: ProjectDto }>(
        "/api/projects",
        parsed.data,
      );
      toast.success(t("projects.form.created"));
      onSaved(res.project);
      onClose();
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  }

  function handleError(err: unknown): void {
    if (err instanceof ApiError) {
      // A concurrent edit is not a validation problem: the row moved on, so the
      // form has to be reopened over fresh data rather than retried as-is.
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
      title={editing ? t("projects.form.editTitle") : t("projects.form.createTitle")}
      subtitle={editing ? `${project.code} · ${project.name}` : undefined}
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
        <FieldRow>
          <Field
            label={t("projects.field.code")}
            htmlFor={ids.code}
            required
            hint={t("projects.hint.code")}
          >
            <Input
              id={ids.code}
              value={form.code}
              autoComplete="off"
              spellCheck={false}
              autoFocus={!editing}
              onChange={(e) => set("code", e.target.value.toUpperCase())}
            />
          </Field>
          <Field
            label={t("projects.field.area")}
            htmlFor={ids.area}
            hint={t("projects.hint.area")}
          >
            <Input
              id={ids.area}
              value={form.area}
              list={areas.length > 0 ? ids.areaList : undefined}
              autoComplete="off"
              onChange={(e) => set("area", e.target.value)}
            />
            {areas.length > 0 ? (
              <datalist id={ids.areaList}>
                {areas.map((a) => (
                  <option key={a} value={a} />
                ))}
              </datalist>
            ) : null}
          </Field>
        </FieldRow>

        <Field label={t("projects.field.name")} htmlFor={ids.name} required>
          <Input
            id={ids.name}
            value={form.name}
            autoFocus={editing}
            onChange={(e) => set("name", e.target.value)}
          />
        </Field>

        <Field label={t("projects.field.description")} htmlFor={ids.description}>
          <Textarea
            id={ids.description}
            value={form.description}
            rows={3}
            onChange={(e) => set("description", e.target.value)}
          />
        </Field>

        <FieldRow>
          <Field label={t("projects.field.status")} htmlFor={ids.status}>
            <Select
              id={ids.status}
              value={form.status}
              options={statusOptions}
              onChange={(e) => set("status", e.target.value as ProjectStatus)}
            />
          </Field>
          <Field label={t("projects.field.priority")} htmlFor={ids.priority}>
            <Select
              id={ids.priority}
              value={form.priority}
              options={priorityOptions}
              onChange={(e) => set("priority", e.target.value as Priority)}
            />
          </Field>
        </FieldRow>

        <Field
          label={t("projects.field.health")}
          htmlFor={ids.health}
          hint={t("projects.hint.healthManual")}
        >
          <div className="pf-health">
            <Select
              id={ids.health}
              value={form.health}
              options={healthOptions}
              onChange={(e) => set("health", e.target.value as ProjectHealth)}
            />
            {suggestedHealth && suggestedHealth !== form.health ? (
              <Button
                size="sm"
                variant="outline"
                icon={Sparkles}
                onClick={() => set("health", suggestedHealth)}
              >
                {t("projects.health.useSuggested")} ·{" "}
                {t(healthKey(suggestedHealth))}
              </Button>
            ) : null}
          </div>
        </Field>

        <Field label={t("projects.field.owner")} htmlFor={ids.owner}>
          <Input
            id={ids.owner}
            value={form.owner}
            autoComplete="off"
            onChange={(e) => set("owner", e.target.value)}
          />
        </Field>

        <FieldRow>
          <Field label={t("projects.field.startDate")} htmlFor={ids.start}>
            <Input
              id={ids.start}
              type="date"
              value={form.startDate}
              onChange={(e) => set("startDate", e.target.value)}
            />
          </Field>
          <Field label={t("projects.field.endDate")} htmlFor={ids.end}>
            <Input
              id={ids.end}
              type="date"
              value={form.endDate}
              onChange={(e) => set("endDate", e.target.value)}
            />
          </Field>
        </FieldRow>

        {error ? (
          <p className="field-error" role="alert">
            {error}
          </p>
        ) : null}

        {/* Submit on Enter without a visible duplicate of the footer button. */}
        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true">
          {t("action.save")}
        </button>
      </form>

      <style>{PROJECT_FORM_CSS}</style>
    </Modal>
  );
}

const PROJECT_FORM_CSS = `
.pf-health { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
.pf-health .select { flex: 1 1 180px; min-width: 0; }
`;

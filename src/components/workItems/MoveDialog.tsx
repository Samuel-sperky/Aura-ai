"use client";

// The KEYBOARD alternative to drag & drop (spec Q13, contract §3.2/55).
//
// Dragging is a desktop-only pointer gesture. Everything it can do must also be
// reachable without a mouse, so this dialog moves an item between sprints (and
// back to the backlog) from a plain <select>, and the list rows carry ↑/↓ buttons
// for the ordering half. Opened by the row action or by pressing `M` on a row.

import { useCallback, useId, useState } from "react";
import { Button, Field, Modal, Select, useToast } from "@/components/ui";
import { ApiError, apiPost } from "@/lib/api";
import type { SprintWithMetricsDto } from "@/lib/domain/contracts/sprints";
import type { WorkItemDto } from "@/lib/domain/contracts/workItems";
import { t } from "@/lib/i18n";

/** Landing position inside the target bucket. */
const TOP_RANK = 0;

export interface MoveDialogProps {
  /** null closes the dialog. */
  item: WorkItemDto | null;
  onClose: () => void;
  /** Sprints of the item's project; the backlog is offered as the empty value. */
  sprints: ReadonlyArray<SprintWithMetricsDto>;
  onMoved: (item: WorkItemDto) => void;
}

export function MoveDialog({ item, onClose, sprints, onMoved }: MoveDialogProps) {
  if (!item) return null;
  return (
    <MoveDialogBody
      item={item}
      onClose={onClose}
      sprints={sprints}
      onMoved={onMoved}
    />
  );
}

function MoveDialogBody({
  item,
  onClose,
  sprints,
  onMoved,
}: MoveDialogProps & { item: WorkItemDto }) {
  const toast = useToast();
  const sprintId = useId();
  const positionId = useId();

  const [target, setTarget] = useState(item.sprintId ?? "");
  const [position, setPosition] = useState<"keep" | "top">("keep");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = sprints
    .filter((s) => s.projectId === item.projectId)
    .map((s) => ({ value: s.id, label: s.name }));

  const submit = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await apiPost<{ workItem: WorkItemDto }>(
        `/api/work-items/${item.id}/move`,
        {
          version: item.version,
          sprintId: target === "" ? null : target,
          ...(position === "top" ? { rankValue: TOP_RANK } : {}),
        },
      );
      toast.success(t("workItems.action.move"));
      onMoved(res.workItem);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        // A stale version means the row moved elsewhere already: close and let the
        // caller refetch rather than retrying against a version that is gone.
        if (err.isVersionConflict) {
          toast.error(err.message);
          onClose();
          return;
        }
        setError(err.message);
        return;
      }
      setError("Presun zlyhal. Skúste to prosím znova.");
    } finally {
      setBusy(false);
    }
  }, [item, target, position, toast, onMoved, onClose]);

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      dismissible={!busy}
      title={t("workItems.move.title")}
      subtitle={item.title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t("action.cancel")}
          </Button>
          <Button variant="accent" loading={busy} onClick={() => void submit()}>
            {t("workItems.action.move")}
          </Button>
        </>
      }
    >
      <Field
        label={t("workItems.field.sprint")}
        htmlFor={sprintId}
        hint={t("workItems.move.help")}
      >
        <Select
          id={sprintId}
          value={target}
          autoFocus
          placeholder={t("workItems.action.moveToBacklog")}
          options={options}
          onChange={(e) => setTarget(e.target.value)}
        />
      </Field>

      <Field label={t("workItems.field.rank")} htmlFor={positionId}>
        <Select
          id={positionId}
          value={position}
          options={[
            { value: "keep", label: t("workItems.move.atBottom") },
            { value: "top", label: t("workItems.move.atTop") },
          ]}
          onChange={(e) => setPosition(e.target.value === "top" ? "top" : "keep")}
        />
      </Field>

      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </Modal>
  );
}

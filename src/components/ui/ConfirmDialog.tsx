"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "./Button";
import { Field } from "./Field";
import { Input } from "./Input";
import { Modal } from "./Modal";

export interface ConfirmDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: ReactNode;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger = destructive (default), accent = a merely significant action. */
  tone?: "danger" | "accent";
  /**
   * Type-to-confirm guard. When set, Confirm stays disabled until the user types
   * this exact string — the project-delete flow requires the project `code`.
   */
  confirmCode?: string;
  /** Label above the code field, e.g. "Napíšte kód projektu ALFA". */
  confirmCodeLabel?: string;
  /** Keeps the dialog locked and the button busy while the request runs. */
  busy?: boolean;
}

/**
 * Destructive-action confirmation. Hard delete is the family rule (no soft
 * delete), so anything irreversible goes through here — optionally behind a
 * type-the-code gate.
 */
export function ConfirmDialog(props: ConfirmDialogProps) {
  // Mount the body only while open, so the type-to-confirm field starts empty on
  // every open — no reset effect, no chance of a pre-armed confirm button.
  if (!props.open) return null;
  return <ConfirmDialogBody {...props} />;
}

function ConfirmDialogBody({
  onCancel,
  onConfirm,
  title,
  message,
  confirmLabel = "Potvrdiť",
  cancelLabel = "Zrušiť",
  tone = "danger",
  confirmCode,
  confirmCodeLabel,
  busy = false,
}: ConfirmDialogProps) {
  const inputId = useId();
  const [typed, setTyped] = useState("");

  const gated = typeof confirmCode === "string" && confirmCode.length > 0;
  const unlocked = !gated || typed.trim() === confirmCode;

  return (
    <Modal
      open
      onClose={onCancel}
      title={title}
      size="sm"
      dismissible={!busy}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "accent"}
            onClick={onConfirm}
            disabled={!unlocked}
            loading={busy}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p>{message}</p>
      {gated ? (
        <div style={{ marginTop: "var(--space-4)" }}>
          <Field
            label={confirmCodeLabel ?? `Napíšte „${confirmCode}" na potvrdenie`}
            htmlFor={inputId}
          >
            <Input
              id={inputId}
              value={typed}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => setTyped(e.target.value)}
            />
          </Field>
        </div>
      ) : null}
    </Modal>
  );
}

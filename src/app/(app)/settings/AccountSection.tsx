"use client";

// Nastavenia → Účet: who am I, and self-service password change (contract #78).
//
// The current password is required, so a hijacked tab cannot silently rotate the
// credential. The repeat field is client-side only — the API takes
// `{ currentPassword, newPassword }` and a mismatch is a typo, not a server
// concern, so it is caught before the request.
//
// Nothing here ever renders a secret: the fields are `type="password"` with the
// correct `autoComplete` tokens so a password manager can help instead of the user
// inventing something weak.

import { useCallback, useId, useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Field,
  Input,
  Panel,
  PanelBody,
  PanelHead,
  useToast,
} from "@/components/ui";
import { ApiError, apiPost } from "@/lib/api";
import { ROLE_LABEL } from "@/components/shellUser";
import { MIN_PASSWORD_LENGTH, changePasswordSchema } from "@/lib/domain/contracts/auth";
import type { PublicUserDto } from "@/lib/domain/contracts/auth";
import { EM_DASH, fmtDateTime } from "@/lib/client/format";
import { t } from "@/lib/i18n";

export interface AccountSectionProps {
  user: PublicUserDto | null;
}

export function AccountSection({ user }: AccountSectionProps) {
  const toast = useToast();
  const ids = { current: useId(), next: useId(), repeat: useId() };

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = useCallback(async () => {
    setError(null);

    if (next !== repeat) {
      setError(t("settings.account.mismatch"));
      return;
    }

    const parsed = changePasswordSchema.safeParse({
      currentPassword: current,
      newPassword: next,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Skontrolujte zadané údaje.");
      return;
    }

    setBusy(true);
    try {
      await apiPost("/api/auth/change-password", parsed.data);
      toast.success(t("auth.password.success"));
      setCurrent("");
      setNext("");
      setRepeat("");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Zmena hesla zlyhala.",
      );
    } finally {
      setBusy(false);
    }
  }, [current, next, repeat, toast]);

  return (
    <Panel>
      <PanelHead
        icon={ShieldCheck}
        title={t("settings.section.account")}
        subtitle={t("settings.account.hint")}
      />
      <PanelBody>
        <div className="row row-wrap as-identity">
          <Avatar size="lg" name={user?.displayName ?? "?"} />
          <span className="as-stack">
            <strong>{user?.displayName ?? EM_DASH}</strong>
            <span className="meta">{user?.email ?? EM_DASH}</span>
          </span>
          <span className="spacer" />
          {user ? <Badge tone="gold">{ROLE_LABEL[user.role]}</Badge> : null}
          <span className="meta">
            {t("auth.users.lastLogin")}:{" "}
            {user?.lastLogin ? fmtDateTime(user.lastLogin) : t("auth.users.neverLoggedIn")}
          </span>
        </div>

        <form
          className="as-form"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          noValidate
        >
          <Field label={t("auth.password.current")} htmlFor={ids.current} required>
            <Input
              id={ids.current}
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </Field>
          <Field
            label={t("auth.password.new")}
            htmlFor={ids.next}
            required
            hint={`${t("auth.password.hint")} (min. ${MIN_PASSWORD_LENGTH})`}
          >
            <Input
              id={ids.next}
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          </Field>
          <Field label={t("settings.account.repeat")} htmlFor={ids.repeat} required>
            <Input
              id={ids.repeat}
              type="password"
              autoComplete="new-password"
              invalid={repeat !== "" && repeat !== next}
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
            />
          </Field>

          {error ? (
            <p className="field-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="row">
            <span className="spacer" />
            <Button
              type="submit"
              variant="accent"
              icon={KeyRound}
              loading={busy}
              disabled={current === "" || next === ""}
            >
              {t("auth.password.submit")}
            </Button>
          </div>
        </form>
      </PanelBody>

      <style>{ACCOUNT_CSS}</style>
    </Panel>
  );
}

const ACCOUNT_CSS = `
.as-identity {
  gap: var(--space-3);
  padding-bottom: var(--space-4);
  margin-bottom: var(--space-4);
  border-bottom: 1px solid var(--border-soft);
}
.as-stack { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.as-form { max-width: 32rem; display: flex; flex-direction: column; gap: var(--space-3); }
`;

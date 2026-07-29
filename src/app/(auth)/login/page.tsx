"use client";

// /login — the only page reachable without a session.
//
// After a successful POST we do a FULL navigation (`window.location.assign`)
// rather than a client-side router push: the proxy and the server components must
// see the freshly-set session cookie on a real request.
//
// The `next` parameter is attacker-influenced (the proxy puts it there, but so can
// anyone). It is honoured only when it is an internal absolute path — `//evil.com`
// and `/\evil.com` are browser-legal protocol-relative forms and would turn this
// into an open redirect.
//
// Styling: A7's Field/Input/Button primitives plus a small scoped block for the
// centred card. Tokens only — no raw hex (see globals.css).

import { Suspense, useId, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { t } from "@/lib/i18n";

/** Only an internal absolute path is a safe redirect target. */
function safeNext(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  return raw;
}

function LoginForm() {
  const params = useSearchParams();
  const nextPath = safeNext(params.get("next"));

  const emailId = useId();
  const passwordId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        window.location.assign(nextPath);
        return;
      }
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(data?.error ?? t("auth.login.error.generic"));
    } catch {
      setError(t("auth.login.error.network"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <header className="login-head">
          <p className="login-brand">
            Aura <span className="serif-italic">Roadmap</span>
          </p>
          <h1 className="login-title">{t("auth.login.title")}</h1>
          <p className="login-sub">{t("auth.login.subtitle")}</p>
        </header>

        <form onSubmit={onSubmit} noValidate>
          <Field label={t("auth.login.email")} htmlFor={emailId} required>
            <Input
              id={emailId}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              autoFocus
              value={email}
              invalid={!!error}
              placeholder={t("auth.login.emailPlaceholder")}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>

          <Field label={t("auth.login.password")} htmlFor={passwordId} required>
            <div className="login-secret">
              <Input
                id={passwordId}
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                invalid={!!error}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="login-reveal"
                aria-label={
                  showPassword
                    ? t("auth.login.hidePassword")
                    : t("auth.login.showPassword")
                }
                aria-pressed={showPassword}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? (
                  <EyeOff size={16} aria-hidden="true" />
                ) : (
                  <Eye size={16} aria-hidden="true" />
                )}
              </button>
            </div>
          </Field>

          {/* role="alert" so a screen reader announces the failure immediately. */}
          {error ? (
            <p className="login-error" role="alert">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            variant="accent"
            icon={LogIn}
            block
            loading={busy}
          >
            {busy ? t("auth.login.submitting") : t("auth.login.submit")}
          </Button>
        </form>
      </section>

      <style>{LOGIN_CSS}</style>
    </main>
  );
}

export default function LoginPage() {
  // useSearchParams needs a Suspense boundary in the App Router.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

// Scoped to this screen only. Tokens exclusively — tints via color-mix, never a
// raw hex or rgba (globals.css owns the palette).
const LOGIN_CSS = `
.login-page {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: var(--space-5);
  background:
    radial-gradient(
      70% 55% at 50% 0%,
      color-mix(in srgb, var(--accent) 12%, transparent),
      transparent 70%
    ),
    var(--bg);
}
.login-card {
  width: 100%;
  max-width: 25rem;
  padding: var(--space-6);
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: 0 1px 2px color-mix(in srgb, var(--ink) 6%, transparent);
}
.login-head { margin-bottom: var(--space-5); }
.login-brand {
  margin: 0 0 var(--space-3);
  font-size: 0.9375rem;
  letter-spacing: 0.02em;
  color: var(--gold-text);
}
.login-title {
  margin: 0 0 var(--space-2);
  font-size: 1.375rem;
  line-height: 1.2;
  color: var(--ink);
}
.login-sub {
  margin: 0;
  font-size: 0.875rem;
  color: var(--muted);
}
.login-secret { position: relative; }
.login-secret .input { padding-right: 2.75rem; }
.login-reveal {
  position: absolute;
  top: 50%;
  right: var(--space-2);
  transform: translateY(-50%);
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  transition: color var(--transition), background var(--transition);
}
.login-reveal:hover {
  color: var(--ink2);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
}
.login-reveal:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.login-error {
  margin: 0 0 var(--space-4);
  padding: var(--space-3);
  font-size: 0.875rem;
  color: var(--danger);
  background: color-mix(in srgb, var(--danger) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--danger) 32%, transparent);
  border-radius: var(--radius-md);
}
@media (max-width: 700px) {
  .login-page { padding: var(--space-4); align-content: start; padding-top: var(--space-7); }
  .login-card { padding: var(--space-5); border: 0; background: transparent; box-shadow: none; }
}
@media (prefers-reduced-motion: reduce) {
  .login-reveal { transition: none; }
}
`;

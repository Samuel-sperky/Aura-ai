"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { cx } from "./cx";

export type ToastTone = "info" | "ok" | "warn" | "error";

export interface ToastOptions {
  tone?: ToastTone;
  /** Auto-dismiss after N ms. 0 keeps it until dismissed. Default 4500. */
  duration?: number;
}

interface ToastRecord {
  id: number;
  message: string;
  tone: ToastTone;
}

export interface ToastApi {
  /** Neutral message. Returns the toast id. */
  show: (message: string, options?: ToastOptions) => number;
  success: (message: string, options?: ToastOptions) => number;
  warn: (message: string, options?: ToastOptions) => number;
  /** Errors default to 8 s so the Slovak message can actually be read. */
  error: (message: string, options?: ToastOptions) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TONE_CLASS: Record<ToastTone, string> = {
  info: "",
  ok: "toast-ok",
  warn: "toast-warn",
  error: "toast-error",
};

const TONE_ICON = {
  info: Info,
  ok: CircleCheck,
  warn: TriangleAlert,
  error: CircleAlert,
} as const;

/**
 * Mount ONCE near the root (already done in AppShell). Renders a
 * `role="status" aria-live="polite"` region, so messages are announced without
 * stealing focus.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message: string, tone: ToastTone, duration: number) => {
      const id = nextId.current++;
      setToasts((list) => [...list, { id, message, tone }]);
      if (duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration),
        );
      }
      return id;
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      show: (m, o) => push(m, o?.tone ?? "info", o?.duration ?? 4500),
      success: (m, o) => push(m, o?.tone ?? "ok", o?.duration ?? 4500),
      warn: (m, o) => push(m, o?.tone ?? "warn", o?.duration ?? 6000),
      error: (m, o) => push(m, o?.tone ?? "error", o?.duration ?? 8000),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => {
          const Icon = TONE_ICON[t.tone];
          return (
            <div key={t.id} className={cx("toast", TONE_CLASS[t.tone])}>
              <Icon size={16} aria-hidden="true" />
              <span>{t.message}</span>
              <button
                type="button"
                className="toast-close"
                aria-label="Zavrieť správu"
                onClick={() => dismiss(t.id)}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Toast API. Throws when used outside `ToastProvider` — a silent no-op would
 * hide failed saves, which is worse than a loud dev error.
 */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) {
    throw new Error("useToast musí byť použitý vnútri <ToastProvider>.");
  }
  return api;
}

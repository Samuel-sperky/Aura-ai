"use client";

import type { ReactNode } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DensityPicker, ThemeToggle } from "./ThemeControls";

export interface TopbarProps {
  /** Page title mirrored in the bar; falls back to the app name. */
  title?: ReactNode;
  /** Extra controls injected by a page (search, notifications bell). */
  actions?: ReactNode;
  onOpenNav: () => void;
  navOpen: boolean;
}

/**
 * Sticky, blurred top bar. Holds the mobile nav trigger, the page title and the
 * global appearance controls. Page-specific toolbars belong in the page, not here.
 */
export function Topbar({ title, actions, onOpenNav, navOpen }: TopbarProps) {
  return (
    <header className="topbar">
      <Button
        className="hamburger"
        variant="ghost"
        size="sm"
        iconOnly
        icon={Menu}
        aria-label="Otvoriť navigáciu"
        aria-expanded={navOpen}
        aria-controls="app-sidebar"
        onClick={onOpenNav}
      />
      <span className="topbar-title">{title ?? "Aura Roadmap"}</span>
      <div className="top-actions">
        {actions}
        <span className="no-print" style={{ display: "inline-flex" }}>
          <DensityPicker />
        </span>
        <ThemeToggle />
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crown, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { cx } from "@/components/ui/cx";
import { isNavItemActive, visibleNavItems } from "./nav";
import { ROLE_LABEL } from "./shellUser";
import type { ShellUser } from "./shellUser";

export interface SidebarProps {
  user: ShellUser | null;
  /** Mobile off-canvas state (ignored above 900 px, where the rail is static). */
  open: boolean;
  onClose: () => void;
}

/**
 * Left rail: brand → six nav items → user + role.
 *
 * Colour grammar, strictly:
 *   hover  = teal tint  ("you can click this")
 *   active = gold wash + 3 px gold rail ("you are here")
 */
export function Sidebar({ user, open, onClose }: SidebarProps) {
  const pathname = usePathname() ?? "/";
  const items = visibleNavItems(user?.rights, user?.role === "admin");

  return (
    <aside
      id="app-sidebar"
      className={cx("sidebar", open && "open")}
      aria-label="Hlavná navigácia"
    >
      <div className="side-brand">
        <span className="brand-mark" aria-hidden="true">
          <Crown size={19} />
        </span>
        <span className="brand-text">
          <strong>Aura</strong>
          <span>Roadmap</span>
        </span>
        <span className="spacer" />
        <Button
          className="hamburger"
          variant="ghost"
          size="sm"
          iconOnly
          icon={X}
          aria-label="Zavrieť navigáciu"
          onClick={onClose}
        />
      </div>

      <nav className="nav">
        {items.map((item) => {
          const active = isNavItemActive(item, pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              aria-current={active ? "page" : undefined}
              className={cx("nav-item", active && "active")}
            >
              <Icon size={17} aria-hidden="true" />
              <span className="nav-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {user ? (
        <div className="side-foot">
          <div className="side-user">
            <Avatar name={user.displayName} />
            <div style={{ minWidth: 0 }}>
              <p className="side-user-name">{user.displayName}</p>
              <p className="side-user-mail">{user.email}</p>
            </div>
          </div>
          <Pill tone="gold" dot={false} style={{ marginTop: "var(--space-2)" }}>
            {ROLE_LABEL[user.role]}
          </Pill>
        </div>
      ) : null}
    </aside>
  );
}

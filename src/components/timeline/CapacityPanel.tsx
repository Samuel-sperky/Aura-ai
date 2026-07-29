"use client";

// The capacity panel — a PANEL INSIDE Sprints, not a route (the contract deleted
// /capacity). Capacity is per PERSON: `capacityByAssignee` splits the sprint's
// planned points across the people who actually hold items, because there are no
// teams in this app.

import { AlertTriangle, Users } from "lucide-react";
import type { CapacityBreakdownDto } from "@/lib/domain/contracts/sprints";
import { capacityTone } from "@/lib/timeline";
import {
  Avatar,
  Badge,
  Panel,
  PanelBody,
  PanelHead,
  ProgressBar,
  Table,
  type TableColumn,
} from "@/components/ui";
import { EmptyState } from "@/components/states";
import { t } from "./text";

type Row = CapacityBreakdownDto["rows"][number];

export interface CapacityPanelProps {
  capacity: CapacityBreakdownDto | null;
  loading?: boolean;
}

export function CapacityPanel({ capacity, loading = false }: CapacityPanelProps) {
  const rows = capacity?.rows ?? [];
  const overloaded = rows.filter((row) => row.loadPercent > 100).length;

  const columns: ReadonlyArray<TableColumn<Row>> = [
    {
      key: "person",
      header: t("capacity.person"),
      render: (row) => (
        <span className="row">
          <Avatar
            size="sm"
            name={row.assigneeName ?? t("common.unassigned")}
            initials={row.assigneeInitials ?? undefined}
          />
          <span className="truncate">
            {row.assigneeName ?? t("common.unassigned")}
          </span>
        </span>
      ),
    },
    {
      key: "items",
      header: t("capacity.items"),
      align: "right",
      render: (row) => `${row.openItemCount} / ${row.itemCount}`,
    },
    {
      key: "committed",
      header: t("capacity.committed"),
      align: "right",
      render: (row) => `${row.committedPoints} ${t("planner.points")}`,
    },
    {
      key: "completed",
      header: t("capacity.completed"),
      align: "right",
      render: (row) => `${row.completedPoints} ${t("planner.points")}`,
    },
    {
      key: "capacity",
      header: t("capacity.capacity"),
      align: "right",
      render: (row) =>
        row.assigneeId === null ? t("common.noValue") : `${row.capacityPoints} ${t("planner.points")}`,
    },
    {
      key: "load",
      header: t("capacity.load"),
      width: "180px",
      render: (row) =>
        row.assigneeId === null ? (
          <span className="muted">{t("common.noValue")}</span>
        ) : (
          <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="tnum">
              {row.loadPercent} %{" "}
              {row.loadPercent > 100 ? (
                <Badge tone="danger">{t("capacity.overloaded")}</Badge>
              ) : null}
            </span>
            <ProgressBar
              value={Math.min(row.loadPercent, 100)}
              tone={capacityTone(row.loadPercent)}
              label={`${t("capacity.load")} ${row.assigneeName ?? t("common.unassigned")} ${row.loadPercent} %`}
            />
          </span>
        ),
    },
  ];

  return (
    <Panel>
      <PanelHead
        icon={Users}
        as="h3"
        title={t("capacity.title")}
        subtitle={t("capacity.subtitle")}
        actions={
          overloaded > 0 ? (
            <Badge tone="danger">
              <AlertTriangle size={12} aria-hidden="true" />
              {overloaded}× {t("capacity.overloaded")}
            </Badge>
          ) : capacity ? (
            <Badge tone="neutral" className="tnum">
              {capacity.capacityPoints} {t("planner.points")} ·{" "}
              {capacity.capacityPerPerson} / {t("capacity.person").toLowerCase()}
            </Badge>
          ) : null
        }
      />
      <PanelBody flush>
        <Table<Row>
          columns={columns}
          rows={rows}
          rowKey={(row) => row.assigneeId ?? "unassigned"}
          loading={loading}
          loadingRows={3}
          caption={t("capacity.title")}
          empty={
            <EmptyState
              bare
              icon={Users}
              tone="muted"
              title={t("capacity.emptyTitle")}
              description={t("capacity.emptyDesc")}
            />
          }
        />
      </PanelBody>
    </Panel>
  );
}

"use client";

// The ONE chart on the Overview (spec Q4): completed story points per week over
// the last 12 weeks.
//
// Design rules this component exists to satisfy:
//   * `ChartCard` is the only wrapper — it owns the panel, the height token and
//     the loading/error/empty family
//   * series 1 is `--chart-1`, read at RUNTIME from `useChartTheme()` so the
//     colour flips with the theme (a hard-coded hex would stay light in dark)
//   * the area under the line is a 14 % tint via `areaFill`, never a solid fill
//   * the chart is invisible to assistive tech, so the same numbers go out as an
//     `srSummary` table

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard, areaFill, useChartTheme } from "@/components/charts";
import { fmtInt } from "@/lib/client/format";
import { t } from "@/lib/i18n";
import type { WeekBucket } from "./weeks";

export interface DonePointsChartProps {
  buckets: ReadonlyArray<WeekBucket>;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  /** Rendered in the panel head (the "Kopírovať súhrn" button lives elsewhere). */
  actions?: React.ReactNode;
}

export function DonePointsChart({
  buckets,
  loading = false,
  error = null,
  onRetry,
  actions,
}: DonePointsChartProps) {
  const theme = useChartTheme();
  const series = theme.series[0];

  const data = useMemo(
    () => buckets.map((b) => ({ label: b.label, points: b.points })),
    [buckets],
  );

  const empty = data.length === 0 || data.every((d) => d.points === 0);

  return (
    <ChartCard
      title={t("overview.chart.title")}
      subtitle={t("overview.chart.subtitle")}
      actions={actions}
      loading={loading}
      error={error}
      onRetry={onRetry}
      empty={empty}
      emptyLabel={t("state.noChartData")}
      legend={[{ label: t("overview.chart.series"), color: series }]}
      srSummary={
        <table>
          <caption>{t("overview.chart.srSummary")}</caption>
          <thead>
            <tr>
              <th scope="col">{t("overview.chart.week")}</th>
              <th scope="col">{t("overview.chart.series")}</th>
            </tr>
          </thead>
          <tbody>
            {buckets.map((b) => (
              <tr key={b.weekStart}>
                <th scope="row">{b.label}</th>
                <td>{fmtInt(b.points)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid stroke={theme.grid} vertical={false} />
          <XAxis
            dataKey="label"
            stroke={theme.axis}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={8}
          />
          <YAxis
            stroke={theme.axis}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={44}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: theme.tooltipBg,
              border: `1px solid ${theme.tooltipBorder}`,
              borderRadius: 10,
              color: theme.tooltipInk,
              fontSize: 12,
            }}
            labelFormatter={(label) => `${t("overview.chart.week")} ${String(label)}`}
            formatter={(value: unknown) => [
              fmtInt(value),
              t("overview.chart.series"),
            ]}
          />
          <Area
            type="monotone"
            dataKey="points"
            name={t("overview.chart.series")}
            stroke={series}
            strokeWidth={2}
            // The family rule verbatim: a 14 % `color-mix` tint, never a solid
            // fill and never an opacity hack that would also fade the grid.
            fill={areaFill(series)}
            fillOpacity={1}
            activeDot={{ r: 4, fill: series, stroke: theme.tooltipBg }}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

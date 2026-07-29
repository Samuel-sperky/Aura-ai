// Every chart in the app goes through ChartCard, and every colour through
// useChartTheme() — recharts needs literal colour strings, so a hard-coded
// palette would silently keep the LIGHT colours in dark mode.
//
//   const theme = useChartTheme();
//   <ChartCard title="Dokončené story pointy" legend={[{ label: "Hotovo", color: theme.series[0] }]}>
//     <ResponsiveContainer width="100%" height="100%">
//       <AreaChart data={data}>
//         <CartesianGrid stroke={theme.grid} vertical={false} />
//         <Area dataKey="points" stroke={theme.series[0]} fill={areaFill(theme.series[0])} />
//       </AreaChart>
//     </ResponsiveContainer>
//   </ChartCard>

export { ChartCard } from "./ChartCard";
export type { ChartCardProps, ChartLegendEntry } from "./ChartCard";
export { useChartTheme } from "./useChartTheme";
export {
  AXIS_TICK,
  CHART_SERIES_VARS,
  LIGHT_FALLBACK,
  areaFill,
  chartTheme,
  cssVar,
  seriesColor,
  token,
} from "@/lib/chartTheme";
export type { ChartSeriesVar, ChartTheme, ChartVar } from "@/lib/chartTheme";

"use client";

import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import { formatMonth, formatPct, formatRatio, formatScore, formatSigned } from "@/lib/utils/format";
import { axisTick, ChartTooltipCard, type TooltipRow } from "./chart-parts";

const ANIMATION_MS = 500;
const cursorLine = { stroke: "var(--chart-axis)", strokeWidth: 1 } as const;
const cursorBand = { fill: "var(--muted)", opacity: 0.5 } as const;

function Frame({ height, children, label }: { height: number; children: ReactNode; label: string }) {
  return (
    <div role="img" aria-label={label} style={{ height }} className="w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}

/* ── Donut ──────────────────────────────────────────────────────────────── */

export interface DonutDatum {
  name: string;
  value: number;
  fill: string;
}

/** Part-to-whole donut with a single centred figure. */
export function DonutChart({
  data,
  centerValue,
  centerLabel,
  formatValue,
  height = 220,
  label,
}: {
  data: DonutDatum[];
  centerValue: string;
  centerLabel: string;
  formatValue: (value: number) => string;
  height?: number;
  label: string;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <div className="relative">
      <Frame height={height} label={label}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="64%"
            outerRadius="92%"
            paddingAngle={data.length > 1 ? 1.5 : 0}
            cornerRadius={3}
            stroke="var(--card)"
            strokeWidth={2}
            startAngle={90}
            endAngle={-270}
            animationDuration={ANIMATION_MS}
          />
          <Tooltip
            content={({ active, payload }: TooltipContentProps) =>
              active && payload?.length ? (
                <ChartTooltipCard
                  rows={payload.map((item) => ({
                    label: String(item.name),
                    value: `${formatValue(Number(item.value))} · ${formatPct(total ? (Number(item.value) / total) * 100 : 0, 1)}`,
                    color: (item.payload as DonutDatum).fill,
                  }))}
                />
              ) : null
            }
          />
        </PieChart>
      </Frame>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl leading-7 font-semibold tracking-tight">{centerValue}</span>
        <span className="text-[11px] text-muted-foreground">{centerLabel}</span>
      </div>
    </div>
  );
}

/* ── Radar ──────────────────────────────────────────────────────────────── */

export interface RadarSeries {
  key: string;
  label: string;
  color: string;
}

/** Five-criterion profile. Every axis is 0–1 and lower is better, so a smaller shape is a safer supplier. */
export function CriteriaRadar({
  data,
  series,
  height = 250,
  label,
}: {
  data: Array<Record<string, string | number>>;
  series: RadarSeries[];
  height?: number;
  label: string;
}) {
  return (
    <Frame height={height} label={label}>
      <RadarChart data={data} outerRadius="72%" margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
        <PolarGrid stroke="var(--chart-axis)" />
        <PolarAngleAxis dataKey="criterion" tick={axisTick} />
        <PolarRadiusAxis domain={[0, 1]} tickCount={3} tick={false} axisLine={false} />
        {series.map((s) => (
          <Radar
            key={s.key}
            name={s.label}
            dataKey={s.key}
            stroke={s.color}
            strokeWidth={2}
            fill={s.color}
            fillOpacity={0.12}
            dot={{ r: 3, fill: s.color, stroke: "var(--card)", strokeWidth: 1.5 }}
            animationDuration={ANIMATION_MS}
          />
        ))}
        <Tooltip
          content={({ active, payload, label: axis }: TooltipContentProps) =>
            active && payload?.length ? (
              <ChartTooltipCard
                title={String(axis)}
                rows={payload.map((item) => ({
                  label: String(item.name),
                  value: formatScore(Number(item.value)),
                  color: item.color,
                  line: true,
                }))}
                footer="Lower is better"
              />
            ) : null
          }
        />
      </RadarChart>
    </Frame>
  );
}

/* ── Shortage trend (single series) ─────────────────────────────────────── */

export interface TrendDatum {
  month: string;
  active: number;
  new: number;
  resolved: number;
}

/** Active shortages over time: one series, so the title names it and no legend is needed. */
export function ActiveShortageArea({ data, height = 220 }: { data: TrendDatum[]; height?: number }) {
  return (
    <Frame height={height} label="Active shortages per month">
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey="month" tickFormatter={formatMonth} tick={axisTick} tickLine={false} axisLine={{ stroke: "var(--chart-axis)" }} minTickGap={24} />
        <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} width={44} />
        <Tooltip
          cursor={cursorLine}
          content={({ active, payload, label }: TooltipContentProps) => {
            const point = payload?.[0]?.payload as TrendDatum | undefined;
            return active && point ? (
              <ChartTooltipCard
                title={formatMonth(String(label))}
                rows={[
                  { label: "Active", value: point.active, color: "var(--series-1)", line: true },
                  { label: "New", value: point.new },
                  { label: "Resolved", value: point.resolved },
                ]}
              />
            ) : null;
          }}
        />
        <Area
          type="monotone"
          dataKey="active"
          stroke="var(--series-1)"
          strokeWidth={2}
          fill="var(--series-1)"
          fillOpacity={0.1}
          activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
          animationDuration={ANIMATION_MS}
        />
      </AreaChart>
    </Frame>
  );
}

/** New and resolved shortages as columns with the active total as a line. One shared count axis. */
export function ShortageFlowChart({ data, height = 260 }: { data: TrendDatum[]; height?: number }) {
  return (
    <Frame height={height} label="New, resolved and active shortages per month">
      <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }} barGap={2}>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey="month" tickFormatter={formatMonth} tick={axisTick} tickLine={false} axisLine={{ stroke: "var(--chart-axis)" }} minTickGap={16} />
        <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} width={44} />
        <Tooltip
          cursor={cursorBand}
          content={({ active, payload, label }: TooltipContentProps) => {
            const point = payload?.[0]?.payload as TrendDatum | undefined;
            return active && point ? (
              <ChartTooltipCard
                title={formatMonth(String(label))}
                rows={[
                  { label: "Active at month end", value: point.active, color: "var(--series-1)", line: true },
                  { label: "New", value: point.new, color: "var(--series-2)" },
                  { label: "Resolved", value: point.resolved, color: "var(--series-3)" },
                ]}
              />
            ) : null;
          }}
        />
        <Bar dataKey="new" name="New" fill="var(--series-2)" radius={[4, 4, 0, 0]} maxBarSize={14} animationDuration={ANIMATION_MS} />
        <Bar dataKey="resolved" name="Resolved" fill="var(--series-3)" radius={[4, 4, 0, 0]} maxBarSize={14} animationDuration={ANIMATION_MS} />
        <Line
          type="monotone"
          dataKey="active"
          name="Active"
          stroke="var(--series-1)"
          strokeWidth={2}
          dot={{ r: 3, fill: "var(--series-1)", stroke: "var(--card)", strokeWidth: 1.5 }}
          activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
          animationDuration={ANIMATION_MS}
        />
      </ComposedChart>
    </Frame>
  );
}

/* ── SHAP contributions (diverging) ─────────────────────────────────────── */

export interface ShapDatum {
  feature: string;
  value_label: string;
  contribution: number;
}

/**
 * Diverging bars around zero. Red extends right (raises predicted risk),
 * blue extends left (lowers it). Two series keep one colour per direction.
 */
export function ShapChart({ data }: { data: ShapDatum[] }) {
  const rows = data.map((d) => ({
    ...d,
    raises: d.contribution > 0 ? d.contribution : 0,
    lowers: d.contribution < 0 ? d.contribution : 0,
  }));
  const extent = Math.max(0.05, ...data.map((d) => Math.abs(d.contribution))) * 1.15;
  return (
    <Frame height={Math.max(160, rows.length * 34 + 36)} label="SHAP feature contributions to predicted risk">
      <BarChart data={rows} layout="vertical" stackOffset="sign" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
        <CartesianGrid stroke="var(--chart-grid)" horizontal={false} />
        <XAxis type="number" domain={[-extent, extent]} tickFormatter={(v: number) => formatSigned(v)} tick={axisTick} tickLine={false} axisLine={false} tickCount={5} />
        <YAxis type="category" dataKey="feature" tick={axisTick} tickLine={false} axisLine={false} width={158} />
        <ReferenceLine x={0} stroke="var(--chart-axis)" />
        <Tooltip
          cursor={cursorBand}
          content={({ active, payload }: TooltipContentProps) => {
            const row = payload?.[0]?.payload as ShapDatum | undefined;
            if (!active || !row) return null;
            const raises = row.contribution > 0;
            const rowsOut: TooltipRow[] = [
              { label: "Observed value", value: row.value_label },
              {
                label: raises ? "Raises risk by" : "Lowers risk by",
                value: formatSigned(row.contribution, 3),
                color: raises ? "var(--status-critical)" : "var(--series-1)",
              },
            ];
            return <ChartTooltipCard title={row.feature} rows={rowsOut} />;
          }}
        />
        <Bar dataKey="lowers" stackId="shap" fill="var(--series-1)" radius={[0, 4, 4, 0]} maxBarSize={14} animationDuration={ANIMATION_MS} />
        <Bar dataKey="raises" stackId="shap" fill="var(--status-critical)" radius={[0, 4, 4, 0]} maxBarSize={14} animationDuration={ANIMATION_MS} />
      </BarChart>
    </Frame>
  );
}

/* ── Delivery performance ───────────────────────────────────────────────── */

export function OnTimeLine({ data, height = 200 }: { data: Array<{ month: string; on_time_rate: number; lead_time_days: number }>; height?: number }) {
  const min = Math.min(...data.map((d) => d.on_time_rate));
  const floor = Math.max(0, Math.floor((min - 0.05) * 10) / 10);
  return (
    <Frame height={height} label="On-time delivery rate per month">
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey="month" tickFormatter={formatMonth} tick={axisTick} tickLine={false} axisLine={{ stroke: "var(--chart-axis)" }} minTickGap={24} />
        <YAxis domain={[floor, 1]} tickFormatter={(v: number) => formatRatio(v)} tick={axisTick} tickLine={false} axisLine={false} width={48} tickCount={4} />
        <Tooltip
          cursor={cursorLine}
          content={({ active, payload, label }: TooltipContentProps) => {
            const point = payload?.[0]?.payload as { on_time_rate: number; lead_time_days: number } | undefined;
            return active && point ? (
              <ChartTooltipCard
                title={formatMonth(String(label))}
                rows={[
                  { label: "On-time", value: formatRatio(point.on_time_rate), color: "var(--series-3)", line: true },
                  { label: "Lead time", value: `${point.lead_time_days} d` },
                ]}
              />
            ) : null;
          }}
        />
        <Line
          type="monotone"
          dataKey="on_time_rate"
          stroke="var(--series-3)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
          animationDuration={ANIMATION_MS}
        />
      </LineChart>
    </Frame>
  );
}

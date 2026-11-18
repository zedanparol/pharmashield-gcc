"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ChartLegend, SegmentedBar } from "@/components/charts/chart-parts";
import { QualificationBadge } from "@/components/shared/badges";
import { RankDelta, TopsisMeter } from "@/components/shared/meters";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CRITERIA, CRITERION_KEYS, ROLE_LABELS, SCENARIOS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { formatCurrency, formatNumber, formatPct, formatRatio, formatScore, formatSigned } from "@/lib/utils/format";
import type { AllocationResult, CriterionKey, SimulationResult } from "@/types";
import { MODE_VISUALS } from "./mode-switcher";

const MAX_WEIGHT = 0.4;
const spring = { type: "spring", stiffness: 170, damping: 26 } as const;

/* ── Criterion weights ──────────────────────────────────────────────────── */

export function WeightsPanel({ result }: { result: SimulationResult }) {
  const color = MODE_VISUALS[result.mode].color;
  const changed = CRITERION_KEYS.filter((key) => Math.abs(result.weights[key] - result.baseline_weights[key]) > 1e-9);
  const donor = changed.find((key) => result.weights[key] < result.baseline_weights[key]);
  const receiver = changed.find((key) => result.weights[key] > result.baseline_weights[key]);

  return (
    <div>
      <ul className="space-y-3.5">
        {CRITERION_KEYS.map((key) => {
          const weight = result.weights[key];
          const base = result.baseline_weights[key];
          const delta = weight - base;
          const moved = Math.abs(delta) > 1e-9;
          return (
            <li key={key} className="grid grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)_2.75rem_2.75rem] items-center gap-3">
              <span className="flex min-w-0 items-baseline gap-2 text-xs">
                <span className="tabular shrink-0 text-[10.5px] font-medium text-muted-foreground">{CRITERIA[key].code}</span>
                <span className={cn("truncate", moved && "font-medium")} title={CRITERIA[key].label}>
                  {CRITERIA[key].label}
                </span>
              </span>
              <span
                className="ticks relative block h-4"
                role="img"
                aria-label={`${CRITERIA[key].label}: weight ${formatScore(weight)}, baseline ${formatScore(base)}`}
              >
                <motion.span
                  className="absolute top-1/2 left-0 h-2 -translate-y-1/2 rounded-r-[2px]"
                  style={{ background: color }}
                  initial={false}
                  animate={{ width: `${(weight / MAX_WEIGHT) * 100}%` }}
                  transition={spring}
                />
                {/* Baseline marker: a thin tick at the Normal Mode weight. */}
                <span
                  aria-hidden
                  className="absolute top-0 h-full w-[2px] -translate-x-1/2 bg-foreground"
                  style={{ left: `${(base / MAX_WEIGHT) * 100}%` }}
                />
              </span>
              <span className="tabular text-right text-[13px] font-medium">{formatScore(weight)}</span>
              <span className={cn("tabular text-right text-[11px]", moved ? "font-medium" : "text-faint")} title={`Baseline ${formatScore(base)}`}>
                {moved ? formatSigned(delta) : "—"}
              </span>
            </li>
          );
        })}
      </ul>
      <ChartLegend
        className="mt-4"
        items={[
          { label: `${SCENARIOS[result.mode].shortLabel} weight`, color },
          { label: "Normal baseline (tick)", color: "var(--foreground)", line: true },
        ]}
      />

      <div className="mt-4 border-t border-border pt-3.5">
        <p className="eyebrow">Weight transfer</p>
        <AnimatePresence mode="wait" initial={false}>
          {donor && receiver ? (
            <motion.div
              key={result.mode}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mt-2.5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2"
            >
              <TransferNode criterion={donor} from={result.baseline_weights[donor]} to={result.weights[donor]} />
              <div className="flex flex-col items-center px-1">
                <span className="tabular text-xs font-medium">{formatScore(Math.abs(result.weights[donor] - result.baseline_weights[donor]))}</span>
                <svg width="72" height="12" viewBox="0 0 72 12" aria-hidden>
                  <motion.path
                    d="M2 6h64"
                    stroke={color}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                  <motion.path
                    d="M61 1.5l6 4.5-6 4.5"
                    stroke={color}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  />
                </svg>
                <span className="eyebrow text-[9.5px]">moved</span>
              </div>
              <TransferNode criterion={receiver} from={result.baseline_weights[receiver]} to={result.weights[receiver]} highlight={color} />
            </motion.div>
          ) : (
            <motion.p key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-2 text-xs leading-5 text-muted-foreground">
              Baseline weights are in force. No weight is transferred between criteria in Normal Mode.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function TransferNode({ criterion, from, to, highlight }: { criterion: CriterionKey; from: number; to: number; highlight?: string }) {
  return (
    <div className="relative rounded-[4px] border border-border p-2.5">
      {highlight ? <span aria-hidden className="absolute inset-x-0 top-0 h-[2px] rounded-t-[4px]" style={{ background: highlight }} /> : null}
      <p className="truncate text-xs">
        <span className="tabular mr-1.5 text-[10.5px] text-muted-foreground">{CRITERIA[criterion].code}</span>
        <span className="font-medium">{CRITERIA[criterion].label}</span>
      </p>
      <p className="tabular mt-1.5 flex items-center gap-1.5 text-[15px]">
        <span className="text-muted-foreground line-through decoration-muted-foreground/50">{formatScore(from)}</span>
        <ArrowRight aria-hidden className="size-3 text-muted-foreground" />
        <span className="font-medium">{formatScore(to)}</span>
      </p>
    </div>
  );
}

/* ── Rank shift ─────────────────────────────────────────────────────────── */

const ROW = 40;
const rowGrid = "grid grid-cols-[1.75rem_minmax(0,1fr)_6rem_2.25rem] items-center gap-2.5";

/**
 * Baseline order on the left, scenario order on the right, one line per
 * manufacturer between them. Rows and lines move together when the scenario
 * changes, so a re-rank is seen rather than read.
 */
export function RankingPanel({ result }: { result: SimulationResult }) {
  const rows = [...result.rankings].sort((a, b) => a.rank - b.rank);
  const [hover, setHover] = useState<string | null>(null);
  const height = rows.length * ROW;
  const hovered = rows.find((row) => row.manufacturer_id === hover);

  return (
    <div>
      <div className="grid grid-cols-[1.5rem_3rem_minmax(0,1fr)] gap-x-2 pb-2 sm:grid-cols-[1.5rem_5rem_minmax(0,1fr)]">
        <span className="eyebrow col-span-2 text-[9.5px]">Normal rank</span>
        <span className={cn(rowGrid, "eyebrow text-[9.5px]")}>
          <span>#</span>
          <span>{SCENARIOS[result.mode].shortLabel} order</span>
          <span>
            TOPSIS <span className="text-signal">↑</span>
          </span>
          <span className="text-right">Move</span>
        </span>
      </div>

      <div className="grid grid-cols-[1.5rem_3rem_minmax(0,1fr)] gap-x-2 sm:grid-cols-[1.5rem_5rem_minmax(0,1fr)]">
        <ol aria-hidden className="tabular text-[11px]">
          {rows.map((_, i) => (
            <li
              key={i}
              className={cn("flex items-center transition-colors", hovered?.baseline_rank === i + 1 ? "font-medium text-foreground" : "text-faint")}
              style={{ height: ROW }}
            >
              {String(i + 1).padStart(2, "0")}
            </li>
          ))}
        </ol>

        <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }} aria-hidden>
          {rows.map((row) => {
            const from = (row.baseline_rank - 0.5) * ROW;
            const to = (row.rank - 0.5) * ROW;
            const delta = row.baseline_rank - row.rank;
            const stroke = delta > 0 ? "var(--status-good)" : delta < 0 ? "var(--status-critical)" : "var(--faint)";
            const active = hover === row.manufacturer_id;
            return (
              <motion.path
                key={row.manufacturer_id}
                fill="none"
                stroke={stroke}
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                initial={false}
                animate={{
                  d: `M0 ${from} C50 ${from} 50 ${to} 100 ${to}`,
                  opacity: hover ? (active ? 1 : 0.15) : delta === 0 ? 0.45 : 0.95,
                  strokeWidth: active ? 2.5 : delta === 0 ? 1 : 1.75,
                }}
                transition={{ d: spring, opacity: { duration: 0.2 }, strokeWidth: { duration: 0.2 } }}
              />
            );
          })}
        </svg>

        <ol>
          {rows.map((row) => (
            <motion.li
              key={row.manufacturer_id}
              layout
              transition={{ type: "spring", stiffness: 300, damping: 34 }}
              style={{ height: ROW }}
              className="border-b border-border last:border-b-0"
              onMouseEnter={() => setHover(row.manufacturer_id)}
              onMouseLeave={() => setHover(null)}
            >
              <Link
                href={`/suppliers/${row.manufacturer_id}`}
                onFocus={() => setHover(row.manufacturer_id)}
                onBlur={() => setHover(null)}
                className={cn(rowGrid, "h-full px-1 outline-none transition-colors hover:bg-accent/60 focus-visible:bg-accent/60")}
              >
                <span className="tabular text-xs font-medium">{String(row.rank).padStart(2, "0")}</span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[13px] font-medium">{row.manufacturer_name}</span>
                    {row.qualification_status !== "qualified" ? (
                      <QualificationBadge status={row.qualification_status} className="hidden h-4 px-1 text-[9px] sm:inline-flex" />
                    ) : null}
                  </span>
                  <span className="block truncate text-[11px] leading-4 text-muted-foreground">{row.manufacturing_country}</span>
                </span>
                <TopsisMeter value={row.topsis_score} />
                <RankDelta from={row.baseline_rank} to={row.rank} className="justify-end text-right" />
              </Link>
            </motion.li>
          ))}
        </ol>
      </div>

      <ChartLegend
        className="mt-3 border-t border-border pt-3"
        items={[
          { label: "Moved up", color: "var(--status-good)", line: true },
          { label: "Moved down", color: "var(--status-critical)", line: true },
          { label: "Unchanged", color: "var(--faint)", line: true },
        ]}
      />
      <p className="mt-2 text-[11px] leading-4 text-faint">
        Lines join each manufacturer&apos;s Normal Mode rank to its rank in this scenario. Manufacturers that are not qualified are ranked but
        excluded from allocation.
      </p>
    </div>
  );
}

/* ── Route exposure ─────────────────────────────────────────────────────── */

export function RouteExposurePanel({ result }: { result: SimulationResult }) {
  const rows = [...result.rankings].sort((a, b) => b.C5_route_exposure_effective - a.C5_route_exposure_effective);
  const stressed = result.stress.applied;
  return (
    <div>
      <ul className="space-y-2.5">
        {rows.map((row) => {
          const base = row.C5_route_exposure_baseline;
          const effective = row.C5_route_exposure_effective;
          const capped = stressed && effective >= result.stress.cap - 1e-9 && base * result.stress.hormuz_factor > result.stress.cap;
          return (
            <li key={row.manufacturer_id} className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)_5.25rem] items-center gap-3">
              <span className="min-w-0">
                <span className="block truncate text-xs font-medium">{row.manufacturer_name}</span>
                <span className="tabular block text-[10.5px] text-faint">{formatRatio(row.hormuz_air_share)} Gulf air</span>
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    tabIndex={0}
                    role="img"
                    aria-label={`${row.manufacturer_name}: route exposure ${formatScore(base)} at baseline, ${formatScore(effective)} in this scenario`}
                    className="ticks relative block h-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[var(--chart-axis)]" />
                    <motion.span
                      className="absolute top-1/2 h-[3px] -translate-y-1/2 bg-status-critical"
                      initial={false}
                      animate={{ left: `${base * 100}%`, width: `${Math.max(0, effective - base) * 100}%` }}
                      transition={spring}
                    />
                    <span className="absolute top-0 h-full w-[2px] -translate-x-1/2 bg-muted-foreground" style={{ left: `${base * 100}%` }} />
                    <motion.span
                      className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 ring-2 ring-card"
                      style={{ background: stressed ? "var(--status-critical)" : "var(--signal)" }}
                      initial={false}
                      animate={{ left: `${effective * 100}%` }}
                      transition={spring}
                    />
                  </span>
                </TooltipTrigger>
                <TooltipContent className="text-xs leading-5">
                  Baseline C5 {formatScore(base)}
                  {stressed ? (
                    <>
                      <br />× {result.stress.hormuz_factor} stress = {formatScore(base * result.stress.hormuz_factor)}
                      {capped ? ` → capped at ${formatScore(result.stress.cap)}` : ""}
                    </>
                  ) : (
                    <>
                      <br />
                      No stress factor in this mode
                    </>
                  )}
                </TooltipContent>
              </Tooltip>
              <span className="tabular text-right text-xs">
                <span className="font-medium">{formatScore(effective)}</span>
                {stressed ? <span className="text-muted-foreground"> {formatSigned(effective - base)}</span> : null}
                {capped ? <span className="ml-1 rounded-[2px] border border-rule px-0.5 text-[9px] uppercase">cap</span> : null}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-2 grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)_5.25rem] gap-3">
        <span />
        <span className="eyebrow flex justify-between text-[9.5px] text-faint">
          <span>0 resilient</span>
          <span>exposed 1.0</span>
        </span>
        <span />
      </div>
      <ChartLegend
        className="mt-3 border-t border-border pt-3"
        items={[
          { label: "Baseline C5 (tick)", color: "var(--muted-foreground)", line: true },
          { label: stressed ? "Stressed C5 in this scenario" : "C5 in this scenario", color: stressed ? "var(--status-critical)" : "var(--signal)" },
        ]}
      />
    </div>
  );
}

/* ── Allocation comparison ──────────────────────────────────────────────── */

const SUPPLIER_COLORS = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)", "var(--series-5)", "var(--series-6)"];
const SPOT_COLOR = "var(--muted-foreground)";

/** Colour follows the manufacturer, not its role, so the same supplier keeps its colour in both bars. */
function supplierColors(a: AllocationResult, b: AllocationResult): Map<string, string> {
  const ids = [...new Set([...a.lines, ...b.lines].map((line) => line.manufacturer_id))].sort();
  return new Map(ids.map((id, i) => [id, SUPPLIER_COLORS[i % SUPPLIER_COLORS.length]]));
}

function allocationSegments(allocation: AllocationResult, colors: Map<string, string>) {
  return [
    ...allocation.lines.map((line) => ({
      key: line.manufacturer_id,
      label: line.manufacturer_name,
      value: line.allocated_units,
      color: colors.get(line.manufacturer_id)!,
      display: formatPct(line.allocation_pct),
      darkInk: colors.get(line.manufacturer_id) === "var(--series-4)",
    })),
    ...(allocation.spot_buy.units > 0
      ? [
          {
            key: "spot",
            label: "Emergency spot-buy",
            value: allocation.spot_buy.units,
            color: SPOT_COLOR,
            display: formatPct((allocation.spot_buy.units / allocation.monthly_demand_units) * 100),
          },
        ]
      : []),
  ];
}

const cell = "py-2 pr-4 last:pr-0";

export function AllocationComparePanel({ baseline, active }: { baseline: AllocationResult; active: AllocationResult }) {
  const colors = supplierColors(baseline, active);
  const names = new Map([...baseline.lines, ...active.lines].map((line) => [line.manufacturer_id, line.manufacturer_name]));
  const same = baseline.mode === active.mode;
  const rows = [...colors.keys()].map((id) => {
    const before = baseline.lines.find((line) => line.manufacturer_id === id);
    const after = active.lines.find((line) => line.manufacturer_id === id);
    return { id, name: names.get(id)!, before, after };
  });

  return (
    <div className="grid gap-x-10 gap-y-5 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div>
        <div className="space-y-3">
          <div>
            <p className="eyebrow mb-1.5">Normal · baseline</p>
            <SegmentedBar className="h-8" ariaLabel="Baseline allocation by manufacturer" segments={allocationSegments(baseline, colors)} total={baseline.monthly_demand_units} />
          </div>
          {same ? null : (
            <div>
              <p className="eyebrow mb-1.5 text-foreground">{SCENARIOS[active.mode].shortLabel}</p>
              <SegmentedBar
                className="h-8"
                ariaLabel={`${SCENARIOS[active.mode].label} allocation by manufacturer`}
                segments={allocationSegments(active, colors)}
                total={active.monthly_demand_units}
              />
            </div>
          )}
        </div>
        <ChartLegend className="mt-4" items={rows.map((row) => ({ label: row.name, color: colors.get(row.id)! }))} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] text-xs">
          <caption className="sr-only">Allocation by manufacturer in Normal Mode and the active scenario</caption>
          <thead>
            <tr className="eyebrow border-b border-rule text-left text-[9.5px]">
              <th className={cn(cell, "font-medium")}>Manufacturer</th>
              <th className={cn(cell, "font-medium")}>Normal</th>
              {same ? null : <th className={cn(cell, "font-medium")}>{SCENARIOS[active.mode].shortLabel}</th>}
              {same ? null : <th className={cn(cell, "text-right font-medium")}>Change</th>}
              <th className={cn(cell, "text-right font-medium")}>Landed cost</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ id, name, before, after }) => {
              const delta = (after?.allocation_pct ?? 0) - (before?.allocation_pct ?? 0);
              return (
                <tr key={id} className="border-b border-border">
                  <td className={cell}>
                    <span className="flex items-center gap-2 text-[13px]">
                      <span aria-hidden className="size-2 shrink-0 rounded-[1px]" style={{ background: colors.get(id) }} />
                      {name}
                    </span>
                  </td>
                  <td className={cn(cell, "tabular text-muted-foreground")}>{before ? `${formatPct(before.allocation_pct)} · ${ROLE_LABELS[before.role]}` : "—"}</td>
                  {same ? null : <td className={cn(cell, "tabular font-medium")}>{after ? `${formatPct(after.allocation_pct)} · ${ROLE_LABELS[after.role]}` : "—"}</td>}
                  {same ? null : (
                    <td className={cn(cell, "tabular text-right", Math.abs(delta) < 0.05 ? "text-faint" : "font-medium")}>
                      {Math.abs(delta) < 0.05 ? "—" : `${formatSigned(delta, 0)} pts`}
                    </td>
                  )}
                  <td className={cn(cell, "tabular text-right text-muted-foreground")}>
                    {formatCurrency((after ?? before)!.landed_cost_per_unit, active.currency, 2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="font-medium">
              <td className={cn(cell, "pt-2.5")}>Total procurement cost</td>
              <td className={cn(cell, "tabular pt-2.5")}>{formatCurrency(baseline.totals.total_cost, baseline.currency)}</td>
              {same ? null : <td className={cn(cell, "tabular pt-2.5")}>{formatCurrency(active.totals.total_cost, active.currency)}</td>}
              {same ? null : (
                <td className={cn(cell, "tabular pt-2.5 text-right")}>
                  {formatSigned(((active.totals.total_cost - baseline.totals.total_cost) / baseline.totals.total_cost) * 100, 1)}%
                </td>
              )}
              <td className={cn(cell, "tabular pt-2.5 text-right text-muted-foreground")}>{formatNumber(active.monthly_demand_units)} vials</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

/* ── Explanation ────────────────────────────────────────────────────────── */

export function ExplanationPanel({ result }: { result: SimulationResult }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={result.mode}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        className="grid gap-x-10 gap-y-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
      >
        <p className="font-serif text-[1.375rem] leading-8 font-light tracking-[-0.015em] text-pretty sm:text-[1.625rem] sm:leading-9">
          {result.explanation.headline}
        </p>
        <ol className="grid content-start gap-x-8 sm:grid-cols-2">
          {result.explanation.points.map((point, i) => (
            <li key={point} className="flex gap-3 border-t border-border py-2.5 text-[13px] leading-5 text-muted-foreground">
              <span className="tabular mt-px shrink-0 text-[11px] font-medium text-foreground">{String(i + 1).padStart(2, "0")}</span>
              {point}
            </li>
          ))}
        </ol>
      </motion.div>
    </AnimatePresence>
  );
}

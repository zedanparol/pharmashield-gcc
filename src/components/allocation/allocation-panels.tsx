"use client";

import { motion } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { RoleBadge } from "@/components/shared/badges";
import { RiskMeter } from "@/components/shared/meters";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ROLE_COLORS, ROLE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { formatCurrency, formatNumber, formatPct, formatScore } from "@/lib/utils/format";
import type { AllocationResult } from "@/types";

const spring = { type: "spring", stiffness: 160, damping: 26 } as const;

/* ── Demand-to-supplier flow ────────────────────────────────────────────── */

interface FlowNode {
  id: string;
  name: string;
  sub: string;
  href?: string;
  role?: AllocationResult["lines"][number]["role"];
  color: string;
  units: number;
  pct: number;
  capacity?: number;
  utilisation?: number;
}

const FLOW_SCALE = 250; // px of bar for 100% of demand
const SLOT_MIN = 62; // room each supplier label needs
const SLOT_GAP = 10;

/**
 * Sankey-style split of one month's demand. The left bar is total demand;
 * each ribbon is one supplier's share, as wide as the units it carries.
 */
export function AllocationFlow({ allocation }: { allocation: AllocationResult }) {
  const [hover, setHover] = useState<string | null>(null);
  const demand = allocation.monthly_demand_units;

  const nodes: FlowNode[] = [
    ...allocation.lines.map((line) => ({
      id: line.manufacturer_id,
      name: line.manufacturer_name,
      sub: line.manufacturing_country,
      href: `/suppliers/${line.manufacturer_id}`,
      role: line.role,
      color: ROLE_COLORS[line.role],
      units: line.allocated_units,
      pct: line.allocation_pct,
      capacity: line.monthly_capacity_units,
      utilisation: line.capacity_utilisation_pct,
    })),
    ...(allocation.spot_buy.units > 0
      ? [
          {
            id: "spot-buy",
            name: "Emergency spot-buy",
            sub: `Open market · ${formatCurrency(allocation.spot_buy.unit_cost, allocation.currency, 2)} per vial`,
            color: ROLE_COLORS.spot_buy,
            units: allocation.spot_buy.units,
            pct: (allocation.spot_buy.units / demand) * 100,
          },
        ]
      : []),
  ];

  // Geometry: source segments stack without gaps; each target bar is centred in a slot tall enough for its label.
  const heights = nodes.map((node) => Math.max(3, (node.units / demand) * FLOW_SCALE));
  const slots = heights.map((h) => Math.max(h, SLOT_MIN));
  const total = slots.reduce((sum, s) => sum + s, 0) + SLOT_GAP * Math.max(0, nodes.length - 1);
  const sourceHeight = heights.reduce((sum, h) => sum + h, 0);
  const sourceTop = (total - sourceHeight) / 2;

  let sourceY = sourceTop;
  let slotY = 0;
  const geometry = nodes.map((node, i) => {
    const s0 = sourceY;
    const s1 = sourceY + heights[i];
    const t0 = slotY + (slots[i] - heights[i]) / 2;
    const t1 = t0 + heights[i];
    const mid = slotY + slots[i] / 2;
    sourceY = s1;
    slotY += slots[i] + SLOT_GAP;
    return { node, s0, s1, t0, t1, mid };
  });

  return (
    <div className="flex items-stretch gap-3 sm:gap-4">
      <div className="flex w-20 shrink-0 flex-col justify-center text-right sm:w-28">
        <p className="eyebrow">Monthly demand</p>
        <p className="figure mt-2 text-[26px] sm:text-[34px]">{formatNumber(demand)}</p>
        <p className="mt-1.5 text-xs text-muted-foreground">vials</p>
      </div>

      <svg
        viewBox={`0 0 100 ${total}`}
        preserveAspectRatio="none"
        className="min-w-12 flex-1"
        style={{ height: total }}
        role="img"
        aria-label={`Monthly demand of ${formatNumber(demand)} vials split: ${nodes.map((n) => `${n.name} ${formatPct(n.pct, 1)}`).join(", ")}`}
      >
        <rect x="0" y={sourceTop} width="2.5" height={sourceHeight} fill="var(--foreground)" />
        {geometry.map(({ node, s0, s1, t0, t1 }) => {
          const active = hover === node.id;
          return (
            <g key={node.id} onMouseEnter={() => setHover(node.id)} onMouseLeave={() => setHover(null)}>
              <motion.path
                fill={node.color}
                initial={false}
                animate={{
                  d: `M2.5 ${s0}C50 ${s0} 50 ${t0} 97.5 ${t0}L97.5 ${t1}C50 ${t1} 50 ${s1} 2.5 ${s1}Z`,
                  opacity: hover ? (active ? 0.6 : 0.12) : 0.32,
                }}
                transition={{ d: spring, opacity: { duration: 0.2 } }}
              />
              <motion.rect x="97.5" width="2.5" fill={node.color} initial={false} animate={{ y: t0, height: t1 - t0 }} transition={spring} />
            </g>
          );
        })}
      </svg>

      <ol className="relative w-44 shrink-0 sm:w-72" style={{ height: total }}>
        {geometry.map(({ node, mid }) => (
          <motion.li
            key={node.id}
            initial={false}
            animate={{ top: mid }}
            transition={spring}
            onMouseEnter={() => setHover(node.id)}
            onMouseLeave={() => setHover(null)}
            className={cn("absolute inset-x-0 grid -translate-y-1/2 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 transition-opacity", hover && hover !== node.id && "opacity-40")}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {node.role ? (
                  <RoleBadge role={node.role} className="h-4.5 text-[9.5px]" />
                ) : (
                  <span className="inline-flex h-4.5 items-center gap-1.5 rounded-[3px] border border-border bg-muted/50 px-1.5 font-mono text-[9.5px] font-medium tracking-[0.06em] uppercase">
                    <span aria-hidden className="size-2 rounded-[1px]" style={{ background: node.color }} />
                    Spot-buy
                  </span>
                )}
                {node.utilisation !== undefined && node.utilisation >= 100 ? (
                  <span className="eyebrow hidden text-[9px] text-foreground sm:inline" title="The plant capacity constraint is binding">
                    At capacity
                  </span>
                ) : null}
              </div>
              {node.href ? (
                <Link
                  href={node.href}
                  className="mt-1 block truncate rounded-sm text-[13px] leading-4.5 font-medium outline-none hover:underline hover:underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {node.name}
                </Link>
              ) : (
                <p className="mt-1 truncate text-[13px] leading-4.5 font-medium">{node.name}</p>
              )}
              <p className="tabular truncate text-[10.5px] leading-4 text-muted-foreground">
                {formatNumber(node.units)} vials
                {node.capacity !== undefined ? ` · ${formatPct(node.utilisation ?? 0)} of ${formatNumber(node.capacity)} capacity` : ` · ${node.sub}`}
              </p>
            </div>
            <p className="figure text-[22px] sm:text-[26px]">{formatPct(node.pct)}</p>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

/* ── Allocation vs capacity bars ────────────────────────────────────────── */

/**
 * One row per supplier. The track length is the plant's monthly capacity
 * (scaled to the largest plant), and the fill is the allocated quantity, so
 * a full track means the capacity constraint is binding.
 */
export function CapacityBars({ allocation }: { allocation: AllocationResult }) {
  const maxCapacity = Math.max(1, ...allocation.lines.map((line) => line.monthly_capacity_units));
  return (
    <div>
      <ul className="space-y-4">
        {allocation.lines.map((line) => (
          <li key={line.manufacturer_id}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <span className="flex min-w-0 items-center gap-2 text-xs">
                <span aria-hidden className="size-2 shrink-0 rounded-[1px]" style={{ background: ROLE_COLORS[line.role] }} />
                <span className="truncate font-medium">{line.manufacturer_name}</span>
              </span>
              <span className="tabular text-xs">
                <span className="font-medium">{formatNumber(line.allocated_units)}</span>
                <span className="text-muted-foreground"> / {formatNumber(line.monthly_capacity_units)}</span>
              </span>
            </div>
            <div
              role="meter"
              aria-valuemin={0}
              aria-valuemax={line.monthly_capacity_units}
              aria-valuenow={line.allocated_units}
              aria-label={`${line.manufacturer_name}: ${formatNumber(line.allocated_units)} of ${formatNumber(line.monthly_capacity_units)} vials capacity allocated`}
              className="mt-1.5 h-2.5 rounded-r-[2px]"
              style={{
                width: `${(line.monthly_capacity_units / maxCapacity) * 100}%`,
                background: `color-mix(in oklab, ${ROLE_COLORS[line.role]} 18%, transparent)`,
              }}
            >
              <motion.div
                className="h-full rounded-r-[2px]"
                style={{ background: ROLE_COLORS[line.role] }}
                initial={false}
                animate={{ width: `${line.capacity_utilisation_pct}%` }}
                transition={spring}
              />
            </div>
            <p className="tabular mt-1 text-[10.5px] text-muted-foreground">
              {ROLE_LABELS[line.role]} · {formatPct(line.capacity_utilisation_pct)} of plant capacity
              {line.capacity_utilisation_pct >= 100 ? " · constraint binding" : ""}
            </p>
          </li>
        ))}
        {allocation.spot_buy.units > 0 ? (
          <li className="relative border border-border py-2.5 pr-3 pl-4">
            <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-status-serious" />
            <p className="flex items-center gap-2 text-xs font-medium">
              <ShoppingCart aria-hidden className="size-3.5 text-status-serious" strokeWidth={1.6} />
              Emergency spot-buy
              <span className="tabular ml-auto">{formatNumber(allocation.spot_buy.units)} vials</span>
            </p>
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
              Demand beyond eligible plant capacity, priced at {formatCurrency(allocation.spot_buy.unit_cost, allocation.currency, 2)} per vial.
            </p>
          </li>
        ) : null}
      </ul>
      <p className="mt-4 border-t border-border pt-2.5 text-[11px] text-faint">Track length is plant capacity. Fill is the allocated quantity.</p>
    </div>
  );
}

/* ── Cost build-up (waterfall) ──────────────────────────────────────────── */

/**
 * Each supplier's line cost steps up to the total procurement cost; the
 * final step is the uplift the allocation service adds for supplier risk.
 * Every bar shares one axis from zero to the risk-adjusted total.
 */
export function CostWaterfall({ allocation }: { allocation: AllocationResult }) {
  const currency = allocation.currency;
  const total = allocation.totals.total_cost;
  const adjusted = Math.max(allocation.totals.risk_adjusted_total_cost, total);
  const max = adjusted || 1;

  let running = 0;
  const steps = [
    ...allocation.lines.map((line) => ({ key: line.manufacturer_id, label: line.manufacturer_name, value: line.line_cost, color: ROLE_COLORS[line.role] })),
    ...(allocation.spot_buy.cost > 0 ? [{ key: "spot", label: "Emergency spot-buy", value: allocation.spot_buy.cost, color: ROLE_COLORS.spot_buy }] : []),
  ].map((step) => {
    const start = running;
    running += step.value;
    return { ...step, start };
  });

  const row = "grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_5.5rem] items-center gap-3";
  return (
    <div>
      <ul className="space-y-2">
        {steps.map((step) => (
          <li key={step.key} className={row}>
            <span className="truncate text-xs" title={step.label}>
              {step.label}
            </span>
            <span className="relative block h-4" role="img" aria-label={`${step.label}: ${formatCurrency(step.value, currency)}`}>
              <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[var(--chart-grid)]" />
              <motion.span
                className="absolute inset-y-0 rounded-[2px]"
                style={{ background: step.color }}
                initial={false}
                animate={{ left: `${(step.start / max) * 100}%`, width: `${Math.max(0.5, (step.value / max) * 100)}%` }}
                transition={spring}
              />
            </span>
            <span className="tabular text-right text-xs">{formatCurrency(step.value, currency)}</span>
          </li>
        ))}
        <li className={cn(row, "border-t border-rule pt-2")}>
          <span className="text-xs font-medium">Total procurement cost</span>
          <span className="relative block h-4">
            <motion.span className="absolute inset-y-0 left-0 rounded-[2px] bg-foreground" initial={false} animate={{ width: `${(total / max) * 100}%` }} transition={spring} />
          </span>
          <span className="tabular text-right text-xs font-medium">{formatCurrency(total, currency)}</span>
        </li>
        <li className={row}>
          <span className="text-xs text-muted-foreground">Risk uplift</span>
          <span className="relative block h-4" role="img" aria-label={`Risk uplift: ${formatCurrency(adjusted - total, currency)}`}>
            <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[var(--chart-grid)]" />
            <motion.span
              className="absolute inset-y-0 rounded-[2px] border border-foreground/60"
              style={{ background: "repeating-linear-gradient(135deg, color-mix(in oklab, var(--foreground) 45%, transparent) 0 2px, transparent 2px 5px)" }}
              initial={false}
              animate={{ left: `${(total / max) * 100}%`, width: `${Math.max(0.5, ((adjusted - total) / max) * 100)}%` }}
              transition={spring}
            />
          </span>
          <span className="tabular text-right text-xs text-muted-foreground">+{formatCurrency(adjusted - total, currency)}</span>
        </li>
        <li className={cn(row, "border-t border-border pt-2")}>
          <span className="text-xs font-medium">Risk-adjusted cost</span>
          <span />
          <span className="tabular text-right text-xs font-medium">{formatCurrency(adjusted, currency)}</span>
        </li>
      </ul>
      <p className="mt-4 border-t border-border pt-2.5 text-[11px] leading-4 text-faint">
        Bars share one axis from zero to the risk-adjusted cost. Both totals are supplied by the allocation service; the uplift is their
        difference.
      </p>
    </div>
  );
}

/* ── Supplier comparison table ──────────────────────────────────────────── */

const head = "h-9 font-mono text-[10px] font-medium tracking-[0.1em] text-muted-foreground uppercase";

export function AllocationTable({ allocation }: { allocation: AllocationResult }) {
  const currency = allocation.currency;
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className={cn(head, "pl-4")}>Role</TableHead>
          <TableHead className={head}>Manufacturer</TableHead>
          <TableHead className={cn(head, "text-right")}>Allocated</TableHead>
          <TableHead className={cn(head, "text-right")}>Share</TableHead>
          <TableHead className={cn(head, "text-right")}>Capacity</TableHead>
          <TableHead className={cn(head, "text-right")}>Landed cost</TableHead>
          <TableHead className={cn(head, "text-right")}>Risk-adjusted</TableHead>
          <TableHead className={cn(head, "text-right")}>Line cost</TableHead>
          <TableHead className={cn(head, "min-w-32 pr-4")}>Risk ↓</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {allocation.lines.map((line) => (
          <TableRow key={line.manufacturer_id}>
            <TableCell className="py-2.5 pl-4">
              <RoleBadge role={line.role} />
            </TableCell>
            <TableCell className="py-2.5">
              <Link
                href={`/suppliers/${line.manufacturer_id}`}
                className="rounded-sm text-[13px] font-medium outline-none hover:underline hover:underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring"
              >
                {line.manufacturer_name}
              </Link>
              <p className="text-[11px] text-muted-foreground">{line.manufacturing_country}</p>
            </TableCell>
            <TableCell className="tabular py-2.5 text-right font-medium">{formatNumber(line.allocated_units)}</TableCell>
            <TableCell className="tabular py-2.5 text-right">{formatPct(line.allocation_pct, 1)}</TableCell>
            <TableCell className="tabular py-2.5 text-right">
              {formatNumber(line.monthly_capacity_units)}
              <span className="block text-[10.5px] text-muted-foreground">{formatPct(line.capacity_utilisation_pct)} used</span>
            </TableCell>
            <TableCell className="tabular py-2.5 text-right">{formatCurrency(line.landed_cost_per_unit, currency, 2)}</TableCell>
            <TableCell className="tabular py-2.5 text-right">{formatCurrency(line.risk_adjusted_cost_per_unit, currency, 2)}</TableCell>
            <TableCell className="tabular py-2.5 text-right font-medium">{formatCurrency(line.line_cost, currency)}</TableCell>
            <TableCell className="py-2.5 pr-4">
              <RiskMeter value={line.overall_risk} />
            </TableCell>
          </TableRow>
        ))}
        {allocation.spot_buy.units > 0 ? (
          <TableRow>
            <TableCell className="py-2.5 pl-4">
              <span className="inline-flex h-5 items-center gap-1.5 rounded-[3px] border border-border bg-muted/50 px-1.5 font-mono text-[10.5px] font-medium tracking-[0.06em] uppercase">
                <span aria-hidden className="size-2 rounded-[1px]" style={{ background: ROLE_COLORS.spot_buy }} />
                Spot-buy
              </span>
            </TableCell>
            <TableCell className="py-2.5 text-[13px] font-medium">Emergency spot-buy (open market)</TableCell>
            <TableCell className="tabular py-2.5 text-right font-medium">{formatNumber(allocation.spot_buy.units)}</TableCell>
            <TableCell className="tabular py-2.5 text-right">{formatPct((allocation.spot_buy.units / allocation.monthly_demand_units) * 100, 1)}</TableCell>
            <TableCell className="py-2.5 text-right text-faint">—</TableCell>
            <TableCell className="tabular py-2.5 text-right">{formatCurrency(allocation.spot_buy.unit_cost, currency, 2)}</TableCell>
            <TableCell className="py-2.5 text-right text-faint">—</TableCell>
            <TableCell className="tabular py-2.5 text-right font-medium">{formatCurrency(allocation.spot_buy.cost, currency)}</TableCell>
            <TableCell className="py-2.5 pr-4 text-xs text-muted-foreground">Unscored</TableCell>
          </TableRow>
        ) : null}
      </TableBody>
      <TableFooter className="bg-transparent">
        <TableRow className="border-t border-rule hover:bg-transparent">
          <TableCell colSpan={2} className="py-2.5 pl-4 font-medium">
            Total
          </TableCell>
          <TableCell className="tabular py-2.5 text-right font-medium">{formatNumber(allocation.totals.allocated_units + allocation.spot_buy.units)}</TableCell>
          <TableCell className="tabular py-2.5 text-right font-medium">100.0%</TableCell>
          <TableCell />
          <TableCell className="tabular py-2.5 text-right text-xs text-muted-foreground">avg {formatCurrency(allocation.totals.avg_unit_cost, currency, 2)}</TableCell>
          <TableCell />
          <TableCell className="tabular py-2.5 text-right font-medium">{formatCurrency(allocation.totals.total_cost, currency)}</TableCell>
          <TableCell className="tabular py-2.5 pr-4 text-xs text-muted-foreground">weighted {formatScore(allocation.totals.weighted_risk)}</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}

/* ── Constraints ────────────────────────────────────────────────────────── */

export function ConstraintsList({ allocation }: { allocation: AllocationResult }) {
  return (
    <ul className="divide-y divide-border">
      {allocation.constraints.map((constraint) => (
        <li key={constraint.id} className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-3 py-2.5 first:pt-0 last:pb-0">
          <span
            className={cn(
              "mt-0.5 flex h-4.5 items-center justify-center rounded-[2px] border font-mono text-[9px] font-medium tracking-[0.1em] uppercase",
              constraint.satisfied ? "border-status-good/40 bg-status-good/10" : "border-status-critical/50 bg-status-critical/10",
            )}
          >
            {constraint.satisfied ? "Pass" : "Fail"}
          </span>
          <div className="min-w-0">
            <p className="text-[13px] leading-5 font-medium">{constraint.label}</p>
            <p className="text-xs leading-4.5 text-muted-foreground">{constraint.detail}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ── Summary ────────────────────────────────────────────────────────────── */

export function SummaryList({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="divide-y divide-border">
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-4 py-2 text-[13px] first:pt-0 last:pb-0">
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd className="tabular text-right font-medium">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

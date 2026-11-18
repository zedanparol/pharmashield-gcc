"use client";

import Link from "next/link";
import { SegmentedBar } from "@/components/charts/chart-parts";
import { SupplyMap, SupplyMapLegend, type SupplyMapPoint } from "@/components/charts/supply-map";
import { RoleBadge } from "@/components/shared/badges";
import { ROLE_COLORS, ROLE_LABELS } from "@/lib/constants";
import { formatCurrency, formatNumber, formatPct } from "@/lib/utils/format";
import type { AllocationResult, Supplier } from "@/types";

/** Joins the supplier pool with the allocation so each site knows its share of demand. */
export function toMapPoints(suppliers: Supplier[], allocation: AllocationResult | undefined): SupplyMapPoint[] {
  const lines = new Map((allocation?.lines ?? []).map((line) => [line.manufacturer_id, line]));
  return suppliers.map((supplier) => {
    const line = lines.get(supplier.manufacturer_id);
    return {
      id: supplier.manufacturer_id,
      name: supplier.manufacturer_name,
      country: supplier.manufacturing_country,
      rank: supplier.rank,
      riskCategory: supplier.risk_category,
      topsis: supplier.topsis_score,
      overallRisk: supplier.overall_risk,
      exposure: supplier.C5_route_exposure,
      gulfAirShare: supplier.hormuz_air_share,
      sharePct: line?.allocation_pct,
      role: line?.role,
      href: `/suppliers/${supplier.manufacturer_id}`,
    };
  });
}

export function NetworkMap({
  suppliers,
  allocation,
  stressed,
  activeId,
  onActiveChange,
}: {
  suppliers: Supplier[];
  allocation: AllocationResult | undefined;
  stressed: boolean;
  activeId: string | null;
  onActiveChange: (id: string | null) => void;
}) {
  const countries = new Map<string, number>();
  suppliers.forEach((s) => countries.set(s.manufacturing_country, (countries.get(s.manufacturing_country) ?? 0) + 1));
  const byCountry = [...countries.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  return (
    <div>
      <SupplyMap points={toMapPoints(suppliers, allocation)} stressed={stressed} activeId={activeId} onActiveChange={onActiveChange} />
      <div className="mt-3 flex flex-wrap items-start justify-between gap-x-8 gap-y-3 border-t border-border pt-3">
        <div>
          <SupplyMapLegend />
          <p className="mt-1.5 text-[11px] text-faint">
            Links are schematic: manufacturing country to the UAE. They are not shipping lanes or live shipments.
          </p>
        </div>
        <dl className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-[10px] tracking-[0.1em] uppercase" aria-label="Manufacturers by country">
          {byCountry.map(([country, count]) => (
            <div key={country} className="flex items-baseline gap-1.5">
              <dt className="text-muted-foreground">{country}</dt>
              <dd className="text-foreground">{count}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

/** The proposed split of monthly demand, one bar and one line per supplier. */
export function AllocationOverview({ allocation }: { allocation: AllocationResult }) {
  const spot = allocation.spot_buy.units;
  return (
    <div>
      <SegmentedBar
        className="h-9"
        ariaLabel="Monthly demand split by supplier role"
        total={allocation.monthly_demand_units}
        segments={[
          ...allocation.lines.map((line) => ({
            key: line.manufacturer_id,
            label: `${ROLE_LABELS[line.role]} · ${line.manufacturer_name}`,
            value: line.allocated_units,
            color: ROLE_COLORS[line.role],
            display: formatPct(line.allocation_pct),
            darkInk: line.role === "probation",
          })),
          ...(spot > 0
            ? [{ key: "spot", label: "Emergency spot-buy", value: spot, color: ROLE_COLORS.spot_buy, display: formatPct((spot / allocation.monthly_demand_units) * 100) }]
            : []),
        ]}
      />
      <ul className="mt-3 divide-y divide-border">
        {allocation.lines.map((line) => (
          <li key={line.manufacturer_id} className="grid grid-cols-[8.25rem_minmax(0,1fr)_auto_3rem] items-center gap-3 py-2">
            <RoleBadge role={line.role} />
            <Link
              href={`/suppliers/${line.manufacturer_id}`}
              className="truncate rounded-sm text-[13px] font-medium outline-none hover:underline hover:underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring"
            >
              {line.manufacturer_name}
            </Link>
            <span className="tabular text-xs text-muted-foreground">{formatNumber(line.allocated_units)}</span>
            <span className="tabular text-right text-[13px] font-medium">{formatPct(line.allocation_pct)}</span>
          </li>
        ))}
        {spot > 0 ? (
          <li className="grid grid-cols-[8.25rem_minmax(0,1fr)_auto_3rem] items-center gap-3 py-2">
            <span className="inline-flex h-5 w-fit items-center gap-1.5 rounded-[3px] border border-border bg-muted/50 px-1.5 font-mono text-[10.5px] font-medium tracking-[0.06em] uppercase">
              <span aria-hidden className="size-2 rounded-[1px]" style={{ background: ROLE_COLORS.spot_buy }} />
              Spot-buy
            </span>
            <span className="truncate text-[13px] text-muted-foreground">Open market · beyond plant capacity</span>
            <span className="tabular text-xs text-muted-foreground">{formatNumber(spot)}</span>
            <span className="tabular text-right text-[13px] font-medium">{formatPct((spot / allocation.monthly_demand_units) * 100)}</span>
          </li>
        ) : null}
      </ul>
      <dl className="mt-1 grid grid-cols-3 gap-4 border-t border-rule pt-3">
        <div>
          <dt className="eyebrow">Monthly demand</dt>
          <dd className="tabular mt-1 text-sm">{formatNumber(allocation.monthly_demand_units)} vials</dd>
        </div>
        <div>
          <dt className="eyebrow">Total cost</dt>
          <dd className="tabular mt-1 text-sm">{formatCurrency(allocation.totals.total_cost, allocation.currency)}</dd>
        </div>
        <div>
          <dt className="eyebrow">Engine</dt>
          <dd className="tabular mt-1 truncate text-sm" title={allocation.solver.note}>
            {allocation.solver.engine}
          </dd>
        </div>
      </dl>
    </div>
  );
}

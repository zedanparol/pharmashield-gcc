/**
 * DEMONSTRATION ALLOCATION PROVIDER — NOT THE OPTIMISER.
 *
 * The real dual-source allocation is a linear programme solved by the Python
 * backend. This file stands in for it while mock mode is on, so the interface
 * can react to demand and scenario changes. It is a transparent greedy fill:
 *
 *   1. Give the best-ranked probation supplier a small trial share.
 *   2. Give the best-ranked established supplier up to the 70% primary cap.
 *   3. Fill the remainder down the ranking, never exceeding plant capacity.
 *   4. Anything left over is reported as an emergency spot-buy.
 *
 * It optimises nothing and is labelled "mock-heuristic" in every response.
 */
import { ALLOCATION_RULES, DEFAULT_SKU } from "@/lib/constants";
import type { AllocationLine, AllocationResult, AllocationRole, ScenarioMode, Supplier } from "@/types";
import { getMockSuppliers } from "./suppliers";

const TRIAL_SHARE_PCT: Record<ScenarioMode, number> = { normal: 8, hormuz_crisis: 10, cost_focus: 5 };
const SPOT_BUY_PREMIUM = 1.6;

const round2 = (value: number) => Math.round(value * 100) / 100;

export function buildMockAllocation(mode: ScenarioMode, demand: number): AllocationResult {
  const suppliers = getMockSuppliers(mode);
  const established = suppliers.filter((s) => s.qualification_status === "qualified" && !s.is_probation);
  const probation = suppliers.filter((s) => s.qualification_status === "probation");

  const picks: { supplier: Supplier; role: AllocationRole; units: number }[] = [];
  let remaining = demand;

  const trial = probation[0];
  let trialUnits = 0;
  if (trial) {
    trialUnits = Math.min(Math.round((TRIAL_SHARE_PCT[mode] / 100) * demand), trial.monthly_capacity_units, remaining);
    remaining -= trialUnits;
  }

  const primaryCap = Math.floor((ALLOCATION_RULES.primaryMaxPct / 100) * demand);
  established.forEach((supplier, index) => {
    if (remaining <= 0) return;
    const units = Math.min(remaining, supplier.monthly_capacity_units, primaryCap);
    if (units <= 0) return;
    picks.push({ supplier, role: index === 0 ? "primary" : index === 1 ? "secondary" : "backup", units });
    remaining -= units;
  });

  if (trial && trialUnits > 0) picks.push({ supplier: trial, role: "probation", units: trialUnits });

  const lines: AllocationLine[] = picks.map(({ supplier, role, units }) => {
    const riskAdjusted = supplier.landed_cost_per_unit * (1 + supplier.overall_risk);
    return {
      manufacturer_id: supplier.manufacturer_id,
      manufacturer_name: supplier.manufacturer_name,
      manufacturing_country: supplier.manufacturing_country,
      role,
      allocated_units: units,
      allocation_pct: round2((units / demand) * 100),
      monthly_capacity_units: supplier.monthly_capacity_units,
      capacity_utilisation_pct: round2((units / supplier.monthly_capacity_units) * 100),
      landed_cost_per_unit: supplier.landed_cost_per_unit,
      risk_adjusted_cost_per_unit: round2(riskAdjusted),
      line_cost: round2(units * supplier.landed_cost_per_unit),
      overall_risk: supplier.overall_risk,
    };
  });

  const allocated = lines.reduce((sum, line) => sum + line.allocated_units, 0);
  const supplierCost = lines.reduce((sum, line) => sum + line.line_cost, 0);
  const avgEstablishedCost =
    established.reduce((sum, s) => sum + s.landed_cost_per_unit, 0) / Math.max(1, established.length);
  const spotUnits = Math.max(0, remaining);
  const spotUnitCost = round2(avgEstablishedCost * SPOT_BUY_PREMIUM);
  const spotCost = round2(spotUnits * spotUnitCost);
  const totalCost = round2(supplierCost + spotCost);
  const riskAdjustedTotal = round2(
    lines.reduce((sum, line) => sum + line.allocated_units * line.risk_adjusted_cost_per_unit, 0) + spotCost,
  );
  const primary = lines.find((line) => line.role === "primary");
  const trialLine = lines.find((line) => line.role === "probation");
  const establishedUsed = lines.filter((line) => line.role !== "probation").length;

  return {
    sku_id: DEFAULT_SKU.id,
    sku_name: DEFAULT_SKU.name,
    mode,
    monthly_demand_units: demand,
    currency: "USD",
    generated_at: "2026-11-15T08:00:00+04:00",
    solver: {
      engine: "mock-heuristic",
      status: "mock",
      note: "Illustrative greedy fill from the mock provider. Not an LP solution and not PuLP output.",
    },
    lines,
    spot_buy: { units: spotUnits, unit_cost: spotUnitCost, cost: spotCost },
    totals: {
      allocated_units: allocated,
      total_cost: totalCost,
      risk_adjusted_total_cost: riskAdjustedTotal,
      avg_unit_cost: round2(totalCost / demand),
      weighted_risk: allocated
        ? Number((lines.reduce((sum, l) => sum + l.overall_risk * l.allocated_units, 0) / allocated).toFixed(3))
        : 0,
      backup_coverage_pct: round2(((allocated - (primary?.allocated_units ?? 0)) / demand) * 100),
    },
    constraints: [
      {
        id: "primary_cap",
        label: `Primary supplier ≤ ${ALLOCATION_RULES.primaryMaxPct}% of demand`,
        satisfied: (primary?.allocation_pct ?? 0) <= ALLOCATION_RULES.primaryMaxPct,
        detail: primary ? `${primary.manufacturer_name} holds ${primary.allocation_pct.toFixed(1)}%.` : "No primary supplier assigned.",
      },
      {
        id: "probation_band",
        label: `Probation trial within ${ALLOCATION_RULES.probationMinPct}–${ALLOCATION_RULES.probationMaxPct}%`,
        satisfied:
          !!trialLine &&
          trialLine.allocation_pct >= ALLOCATION_RULES.probationMinPct &&
          trialLine.allocation_pct <= ALLOCATION_RULES.probationMaxPct,
        detail: trialLine
          ? `${trialLine.manufacturer_name} receives a ${trialLine.allocation_pct.toFixed(1)}% trial.`
          : "No probation supplier received a trial allocation.",
      },
      {
        id: "min_manufacturers",
        label: `At least ${ALLOCATION_RULES.minQualifiedManufacturers} qualified manufacturers (Tier 1)`,
        satisfied: establishedUsed >= ALLOCATION_RULES.minQualifiedManufacturers,
        detail: `${establishedUsed} established manufacturer${establishedUsed === 1 ? "" : "s"} allocated.`,
      },
      {
        id: "capacity",
        label: "Plant capacity respected",
        satisfied: lines.every((line) => line.allocated_units <= line.monthly_capacity_units),
        detail: lines.some((line) => line.capacity_utilisation_pct >= 100)
          ? `${lines.filter((line) => line.capacity_utilisation_pct >= 100).length} supplier(s) at full capacity.`
          : "No supplier is at its capacity limit.",
      },
      {
        id: "demand_covered",
        label: "Demand covered without spot-buy",
        satisfied: spotUnits === 0,
        detail:
          spotUnits === 0
            ? "Contracted suppliers cover the full monthly demand."
            : `${spotUnits.toLocaleString("en-GB")} vials exceed eligible capacity and would require an emergency spot-buy.`,
      },
    ],
  };
}

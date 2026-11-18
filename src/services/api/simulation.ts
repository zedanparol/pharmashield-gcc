import { DEFAULT_MONTHLY_DEMAND, DEFAULT_SKU } from "@/lib/constants";
import { getMockSimulation } from "@/lib/mock-data/simulation";
import { simulationResultSchema } from "@/lib/validation/contracts";
import type { ScenarioMode } from "@/types";
import { resolve } from "./client";

/**
 * GET /simulation?mode=&sku_id=&monthly_demand_units=
 * Scenario result: weights, stressed route exposure, re-ranked suppliers and
 * the resulting allocation, alongside the Normal Mode baseline for comparison.
 */
export function getSimulation(mode: ScenarioMode, demand: number = DEFAULT_MONTHLY_DEMAND, skuId: string = DEFAULT_SKU.id) {
  return resolve({
    path: "/simulation",
    query: { mode, sku_id: skuId, monthly_demand_units: demand },
    schema: simulationResultSchema,
    mock: () => getMockSimulation(mode, demand),
  });
}

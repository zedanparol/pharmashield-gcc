import { DEFAULT_SKU } from "@/lib/constants";
import { buildMockAllocation } from "@/lib/mock-data/allocation";
import { allocationResultSchema } from "@/lib/validation/contracts";
import type { ScenarioMode } from "@/types";
import { resolve } from "./client";

/**
 * POST /allocation { sku_id, mode, monthly_demand_units }
 * Dual-source order allocation. Live mode returns the LP optimiser's
 * solution; mock mode returns the illustrative greedy fill.
 */
export function getAllocation(mode: ScenarioMode, demand: number, skuId: string = DEFAULT_SKU.id) {
  return resolve({
    path: "/allocation",
    method: "POST",
    body: { sku_id: skuId, mode, monthly_demand_units: demand },
    schema: allocationResultSchema,
    mock: () => buildMockAllocation(mode, demand),
  });
}

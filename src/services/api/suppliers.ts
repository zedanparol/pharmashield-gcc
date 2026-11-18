import { z } from "zod";
import { DEFAULT_SKU } from "@/lib/constants";
import { getMockSupplierDetail, getMockSuppliers, mockSupplierUpdates } from "@/lib/mock-data/suppliers";
import { supplierDetailSchema, supplierSchema, supplierUpdateSchema } from "@/lib/validation/contracts";
import type { ScenarioMode } from "@/types";
import { ApiError, resolve } from "./client";

/** GET /suppliers?sku_id=&mode= — scored supplier matrix for a scenario. */
export function getSuppliers(mode: ScenarioMode, skuId: string = DEFAULT_SKU.id) {
  return resolve({
    path: "/suppliers",
    query: { sku_id: skuId, mode },
    schema: z.array(supplierSchema),
    mock: () => getMockSuppliers(mode),
  });
}

/** GET /suppliers/{manufacturer_id}?sku_id=&mode= — full supplier profile. */
export function getSupplierDetail(manufacturerId: string, mode: ScenarioMode, skuId: string = DEFAULT_SKU.id) {
  return resolve({
    path: `/suppliers/${encodeURIComponent(manufacturerId)}`,
    query: { sku_id: skuId, mode },
    schema: supplierDetailSchema,
    mock: () => {
      const detail = getMockSupplierDetail(manufacturerId, mode);
      if (!detail) throw new ApiError(`Manufacturer ${manufacturerId} was not found.`, "http", 404);
      return detail;
    },
  });
}

/** GET /suppliers/updates — recent supplier events for the overview feed. */
export function getSupplierUpdates() {
  return resolve({
    path: "/suppliers/updates",
    schema: z.array(supplierUpdateSchema),
    mock: () => mockSupplierUpdates,
  });
}

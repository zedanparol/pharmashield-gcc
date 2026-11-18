import { z } from "zod";
import { mockShortageTrend, mockShortages } from "@/lib/mock-data/shortages";
import { shortageSchema, shortageTrendPointSchema } from "@/lib/validation/contracts";
import type { ApiResult, Shortage } from "@/types";
import { fetchOpenFdaShortages } from "./adapters/openfda";
import { resolve } from "./client";
import { SHORTAGE_SOURCE, USE_MOCK_DATA } from "./config";

/**
 * GET /shortages — shortage records.
 * With NEXT_PUBLIC_SHORTAGE_SOURCE=openfda (and mock mode off) records are
 * read directly from openFDA through the adapter instead.
 */
export async function getShortages(): Promise<ApiResult<Shortage[]>> {
  if (!USE_MOCK_DATA && SHORTAGE_SOURCE === "openfda") {
    const data = await fetchOpenFdaShortages();
    return { data, meta: { source: "live", fetchedAt: new Date().toISOString(), origin: "openFDA drug shortages API" } };
  }
  return resolve({
    path: "/shortages",
    schema: z.array(shortageSchema),
    mock: () => mockShortages,
  });
}

/** GET /shortages/trend — monthly active / new / resolved counts. */
export function getShortageTrend() {
  return resolve({
    path: "/shortages/trend",
    schema: z.array(shortageTrendPointSchema),
    mock: () => mockShortageTrend,
  });
}

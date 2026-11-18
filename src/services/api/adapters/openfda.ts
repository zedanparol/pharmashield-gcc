/**
 * openFDA drug shortages adapter.
 *
 * Maps records from https://api.fda.gov/drug/shortages.json onto the
 * frontend's `Shortage` contract, so the Shortage Intelligence module can be
 * pointed at openFDA (directly or through the backend) without changing any
 * component. Field names below were checked against a live response.
 *
 * openFDA does not publish a severity. Records mapped here are marked
 * "unclassified" — the frontend never invents a severity. If the backend
 * classifies severity, it should return it through GET /shortages instead.
 */
import { z } from "zod";
import type { Shortage } from "@/types";
import { ApiError } from "../client";
import { REQUEST_TIMEOUT_MS } from "../config";

const OPENFDA_SHORTAGES_URL = "https://api.fda.gov/drug/shortages.json";

export const openFdaShortageSchema = z.object({
  generic_name: z.string().optional(),
  proprietary_name: z.string().optional(),
  company_name: z.string().optional(),
  presentation: z.string().optional(),
  package_ndc: z.string().optional(),
  status: z.string().optional(),
  shortage_reason: z.string().optional(),
  availability: z.string().optional(),
  related_info: z.string().optional(),
  update_type: z.string().optional(),
  therapeutic_category: z.array(z.string()).optional(),
  initial_posting_date: z.string().optional(),
  update_date: z.string().optional(),
  discontinued_date: z.string().optional(),
  openfda: z.object({ manufacturer_name: z.array(z.string()).optional() }).optional(),
});

export const openFdaResponseSchema = z.object({
  meta: z.object({ last_updated: z.string().optional() }).optional(),
  results: z.array(openFdaShortageSchema),
});

export type OpenFdaShortage = z.infer<typeof openFdaShortageSchema>;

/** openFDA dates are MM/DD/YYYY. Convert to ISO (YYYY-MM-DD). */
function toIsoDate(value: string | undefined): string {
  const match = value?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[1]}-${match[2]}` : (value ?? "");
}

export function mapOpenFdaShortage(record: OpenFdaShortage, index: number): Shortage {
  const manufacturer = record.company_name ?? record.openfda?.manufacturer_name?.[0] ?? "Unknown manufacturer";
  const others = (record.openfda?.manufacturer_name ?? []).filter((name) => name !== manufacturer);
  return {
    shortage_id: record.package_ndc ? `NDC-${record.package_ndc}` : `OPENFDA-${index + 1}`,
    drug_name: record.generic_name ?? record.proprietary_name ?? "Unnamed product",
    presentation: record.presentation ?? "",
    manufacturer_name: manufacturer,
    // openFDA statuses: "Current", "To Be Discontinued", "Resolved".
    status: record.status?.toLowerCase() === "resolved" ? "resolved" : "active",
    severity: "unclassified",
    reason: record.shortage_reason ?? record.related_info ?? "Reason not stated",
    therapeutic_category: record.therapeutic_category?.join(", ") ?? "",
    initial_posting_date: toIsoDate(record.initial_posting_date),
    last_updated: toIsoDate(record.update_date),
    availability_note: record.availability ?? record.related_info ?? "",
    affected_manufacturers: [manufacturer, ...others],
    regulatory_alerts: [],
  };
}

/** Fetches shortage records straight from openFDA (public API, no key required). */
export async function fetchOpenFdaShortages(search?: string, limit = 100): Promise<Shortage[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (search) params.set("search", search);

  let response: Response;
  try {
    response = await fetch(`${OPENFDA_SHORTAGES_URL}?${params}`, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch {
    throw new ApiError("Could not reach openFDA.", "network");
  }
  // openFDA answers 404 when a search matches nothing.
  if (response.status === 404) return [];
  if (!response.ok) throw new ApiError(`openFDA returned ${response.status}.`, "http", response.status);

  const parsed = openFdaResponseSchema.safeParse(await response.json());
  if (!parsed.success) throw new ApiError("The openFDA response did not match the expected shape.", "contract");
  return parsed.data.results.map(mapOpenFdaShortage);
}

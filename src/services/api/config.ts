/**
 * API configuration, read once from public environment variables.
 *
 * Only NEXT_PUBLIC_* values belong here: they are inlined into the browser
 * bundle and are visible to every visitor. Never put secrets or private API
 * keys in them — keep those on the Python backend.
 */

/** Mock mode is ON unless the variable is explicitly set to "false". */
export const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA !== "false";

/** Base URL of the Python backend, without a trailing slash. */
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, "");

/**
 * Where live shortage records come from when mock mode is off:
 *   "backend" — GET {API_BASE_URL}/shortages (default)
 *   "openfda" — fetched directly from api.fda.gov through the adapter
 */
export const SHORTAGE_SOURCE: "backend" | "openfda" =
  process.env.NEXT_PUBLIC_SHORTAGE_SOURCE === "openfda" ? "openfda" : "backend";

export const REQUEST_TIMEOUT_MS = 15_000;

/** Artificial latency in mock mode so loading states are visible in demos. */
export const MOCK_LATENCY_MS = 350;

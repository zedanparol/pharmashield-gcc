/**
 * API service layer — the only place the UI talks to data.
 *
 * Each function returns `{ data, meta }`. `meta.source` is "mock" or "live",
 * decided by NEXT_PUBLIC_USE_MOCK_DATA in `config.ts`. Swapping the backend in
 * requires no component changes.
 */
export * from "./allocation";
export * from "./audit";
export * from "./client";
export * from "./config";
export * from "./documents";
export * from "./health";
export * from "./shortages";
export * from "./simulation";
export * from "./suppliers";

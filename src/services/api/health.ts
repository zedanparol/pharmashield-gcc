import { healthSchema } from "@/lib/validation/contracts";
import { resolve } from "./client";

/** GET /health — backend liveness check used by the status indicator and Settings. */
export function getHealth() {
  return resolve({
    path: "/health",
    schema: healthSchema,
    mock: () => ({ status: "mock", version: "mock-provider" }),
  });
}

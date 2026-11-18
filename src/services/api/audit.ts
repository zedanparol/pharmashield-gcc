import { z } from "zod";
import {
  applyMockDecision,
  getMockAuditEvents,
  getMockRecommendations,
  recordMockEvent,
  submitMockRecommendation,
} from "@/lib/mock-data/audit";
import {
  auditEventSchema,
  decisionResponseSchema,
  recommendationSchema,
} from "@/lib/validation/contracts";
import type { AuditEvent, DecisionRequest, ScenarioMode } from "@/types";
import { resolve } from "./client";

/** GET /audit — audit trail, newest first. */
export function getAuditEvents() {
  return resolve({
    path: "/audit",
    schema: z.array(auditEventSchema),
    mock: () => getMockAuditEvents(),
  });
}

/** GET /recommendations — allocation recommendations awaiting or past human review. */
export function getRecommendations() {
  return resolve({
    path: "/recommendations",
    schema: z.array(recommendationSchema),
    mock: () => getMockRecommendations(),
  });
}

/**
 * POST /recommendations { mode, monthly_demand_units, user }
 * Sends the allocation currently on screen into the human review queue.
 */
export function submitForReview(mode: ScenarioMode, demand: number, user: AuditEvent["user"]) {
  return resolve({
    path: "/recommendations",
    method: "POST",
    body: { mode, monthly_demand_units: demand, user },
    schema: recommendationSchema,
    mock: () => submitMockRecommendation(mode, demand, user, new Date().toISOString()),
  });
}

/**
 * POST /audit/decisions — records a human approve / override / reject decision.
 * This writes an audit record only. It does not place a purchase order.
 */
export function submitDecision(request: DecisionRequest) {
  return resolve({
    path: "/audit/decisions",
    method: "POST",
    body: request,
    schema: decisionResponseSchema,
    mock: () => applyMockDecision(request, new Date().toISOString()),
  });
}

/** POST /audit/events — records a non-decision event such as a scenario change. */
export function recordAuditEvent(event: Omit<AuditEvent, "event_id" | "timestamp">) {
  return resolve({
    path: "/audit/events",
    method: "POST",
    body: event,
    schema: auditEventSchema,
    mock: () => recordMockEvent({ ...event, timestamp: new Date().toISOString() }),
  });
}

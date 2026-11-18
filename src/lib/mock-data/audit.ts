/**
 * DEMONSTRATION GOVERNANCE STATE — in-memory only.
 *
 * Decisions recorded here live for the browser session and are lost on
 * reload. Nothing is transmitted anywhere: no purchase order is created,
 * sent or scheduled by this prototype.
 */
import { DEFAULT_MONTHLY_DEMAND, DEFAULT_SKU } from "@/lib/constants";
import type {
  AllocationResult,
  AllocationShare,
  AuditEvent,
  DecisionRequest,
  DecisionResponse,
  Recommendation,
  ScenarioMode,
} from "@/types";
import { buildMockAllocation } from "./allocation";
import { getMockSuppliers } from "./suppliers";

export function toShares(allocation: AllocationResult): AllocationShare[] {
  return allocation.lines.map((line) => ({
    manufacturer_id: line.manufacturer_id,
    manufacturer_name: line.manufacturer_name,
    role: line.role,
    allocation_pct: line.allocation_pct,
    allocated_units: line.allocated_units,
  }));
}

/** Allocation in force from the previous cycle, before the pending recommendation. */
const previousCycle: AllocationShare[] = [
  { manufacturer_id: "MFR-001", manufacturer_name: "Norvane Sterile Injectables GmbH", role: "primary", allocation_pct: 60, allocated_units: 6000 },
  { manufacturer_id: "MFR-007", manufacturer_name: "Adriatica Farmaceutici S.p.A.", role: "secondary", allocation_pct: 30, allocated_units: 3000 },
  { manufacturer_id: "MFR-005", manufacturer_name: "Al Rayyan Pharma Industries", role: "backup", allocation_pct: 10, allocated_units: 1000 },
];

function buildRecommendation(
  id: string,
  mode: ScenarioMode,
  demand: number,
  createdAt: string,
  current: AllocationShare[],
): Recommendation {
  const allocation = buildMockAllocation(mode, demand);
  const primaryLine = allocation.lines.find((line) => line.role === "primary") ?? allocation.lines[0];
  const primary = getMockSuppliers(mode).find((s) => s.manufacturer_id === primaryLine.manufacturer_id)!;
  return {
    recommendation_id: id,
    created_at: createdAt,
    status: "pending",
    sku_id: DEFAULT_SKU.id,
    sku_name: DEFAULT_SKU.name,
    mode,
    monthly_demand_units: demand,
    primary_manufacturer_id: primary.manufacturer_id,
    primary_manufacturer_name: primary.manufacturer_name,
    rationale: `${primary.manufacturer_name} is the top-ranked eligible manufacturer for this scenario (TOPSIS ${primary.topsis_score.toFixed(
      2,
    )}, overall risk ${primary.overall_risk.toFixed(2)}). The remaining volume is split across the next-ranked qualified supplier and a probation trial.`,
    shap_summary: primary.shap_top3_reasons,
    current_allocation: current,
    proposed_allocation: toShares(allocation),
    total_cost: allocation.totals.total_cost,
    currency: allocation.currency,
  };
}

const analyst = { name: "PharmaShield Engine", role: "System (mock)" };
const layla = { name: "Layla Haddad", role: "Procurement Manager" };
const omar = { name: "Omar Al Suwaidi", role: "Supply Chain Analyst" };
const fatima = { name: "Dr. Fatima Al Mansoori", role: "Chief Pharmacist" };

let recommendations: Recommendation[] = [
  buildRecommendation("REC-2026-1114", "normal", DEFAULT_MONTHLY_DEMAND, "2026-11-14T08:30:00+04:00", previousCycle),
];

let events: AuditEvent[] = [
  {
    event_id: "AUD-00218",
    timestamp: "2026-11-14T08:30:00+04:00",
    user: analyst,
    action: "recommendation_generated",
    supplier: "Norvane Sterile Injectables GmbH",
    previous_allocation: previousCycle,
    new_allocation: recommendations[0].proposed_allocation,
    reason: "Monthly allocation cycle for December 2026.",
    scenario_mode: "normal",
    recommendation_id: "REC-2026-1114",
  },
  {
    event_id: "AUD-00217",
    timestamp: "2026-11-12T14:05:00+04:00",
    user: omar,
    action: "scenario_changed",
    supplier: null,
    previous_allocation: null,
    new_allocation: null,
    reason: "Returned to Normal Mode after reviewing the Hormuz stress test.",
    scenario_mode: "normal",
    recommendation_id: null,
  },
  {
    event_id: "AUD-00216",
    timestamp: "2026-11-12T13:40:00+04:00",
    user: omar,
    action: "scenario_changed",
    supplier: null,
    previous_allocation: null,
    new_allocation: null,
    reason: "Hormuz Crisis Mode activated for quarterly resilience stress test.",
    scenario_mode: "hormuz_crisis",
    recommendation_id: null,
  },
  {
    event_id: "AUD-00215",
    timestamp: "2026-11-10T10:16:00+04:00",
    user: layla,
    action: "document_analysed",
    supplier: "Sindhu Remedies Ltd",
    previous_allocation: null,
    new_allocation: null,
    reason: "FDA warning letter reviewed; disqualification upheld.",
    scenario_mode: "normal",
    recommendation_id: null,
  },
  {
    event_id: "AUD-00214",
    timestamp: "2026-10-15T11:22:00+04:00",
    user: fatima,
    action: "overridden",
    supplier: "Norvane Sterile Injectables GmbH",
    previous_allocation: [
      { manufacturer_id: "MFR-001", manufacturer_name: "Norvane Sterile Injectables GmbH", role: "primary", allocation_pct: 65, allocated_units: 6500 },
      { manufacturer_id: "MFR-007", manufacturer_name: "Adriatica Farmaceutici S.p.A.", role: "secondary", allocation_pct: 27, allocated_units: 2700 },
      { manufacturer_id: "MFR-008", manufacturer_name: "Gulf Meridian Pharmaceuticals LLC", role: "probation", allocation_pct: 8, allocated_units: 800 },
    ],
    new_allocation: previousCycle,
    reason:
      "Probation trial deferred one cycle pending Gulf Meridian's stability data. Volume reassigned to Al Rayyan as regional backup.",
    scenario_mode: "normal",
    recommendation_id: "REC-2026-1015",
  },
  {
    event_id: "AUD-00213",
    timestamp: "2026-10-14T08:30:00+04:00",
    user: analyst,
    action: "recommendation_generated",
    supplier: "Norvane Sterile Injectables GmbH",
    previous_allocation: null,
    new_allocation: null,
    reason: "Monthly allocation cycle for November 2026.",
    scenario_mode: "normal",
    recommendation_id: "REC-2026-1015",
  },
  {
    event_id: "AUD-00212",
    timestamp: "2026-09-16T09:48:00+04:00",
    user: layla,
    action: "approved",
    supplier: "Norvane Sterile Injectables GmbH",
    previous_allocation: null,
    new_allocation: [
      { manufacturer_id: "MFR-001", manufacturer_name: "Norvane Sterile Injectables GmbH", role: "primary", allocation_pct: 65, allocated_units: 6500 },
      { manufacturer_id: "MFR-007", manufacturer_name: "Adriatica Farmaceutici S.p.A.", role: "secondary", allocation_pct: 35, allocated_units: 3500 },
    ],
    reason: null,
    scenario_mode: "normal",
    recommendation_id: "REC-2026-0915",
  },
  {
    event_id: "AUD-00211",
    timestamp: "2026-08-19T15:12:00+04:00",
    user: fatima,
    action: "rejected",
    supplier: "Zhonghe BioPharm Co., Ltd",
    previous_allocation: null,
    new_allocation: null,
    reason: "Cost Focus recommendation rejected: two OAI outcomes are not acceptable for a Tier 1 oncology product.",
    scenario_mode: "cost_focus",
    recommendation_id: "REC-2026-0818",
  },
];

let eventCounter = 219;

export function getMockRecommendations(): Recommendation[] {
  return recommendations;
}

export function getMockAuditEvents(): AuditEvent[] {
  return [...events].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

function appendEvent(event: Omit<AuditEvent, "event_id">): AuditEvent {
  const full: AuditEvent = { ...event, event_id: `AUD-${String(eventCounter++).padStart(5, "0")}` };
  events = [full, ...events];
  return full;
}

export function recordMockEvent(event: Omit<AuditEvent, "event_id">): AuditEvent {
  return appendEvent(event);
}

/** Creates a pending recommendation from the allocation the user is viewing. */
export function submitMockRecommendation(
  mode: ScenarioMode,
  demand: number,
  user: AuditEvent["user"],
  timestamp: string,
): Recommendation {
  const latestDecided = recommendations.find((r) => r.status === "approved" || r.status === "overridden");
  const current = latestDecided?.proposed_allocation ?? previousCycle;
  const id = `REC-${timestamp.slice(0, 4)}-${String(1114 + recommendations.length).padStart(4, "0")}`;
  const recommendation = buildRecommendation(id, mode, demand, timestamp, current);
  recommendations = [recommendation, ...recommendations];
  appendEvent({
    timestamp,
    user,
    action: "submitted_for_review",
    supplier: recommendation.primary_manufacturer_name,
    previous_allocation: current,
    new_allocation: recommendation.proposed_allocation,
    reason: `Allocation for ${demand.toLocaleString("en-GB")} vials submitted for human review.`,
    scenario_mode: mode,
    recommendation_id: id,
  });
  return recommendation;
}

export function applyMockDecision(request: DecisionRequest, timestamp: string): DecisionResponse {
  const target = recommendations.find((r) => r.recommendation_id === request.recommendation_id);
  if (!target) throw new Error(`Recommendation ${request.recommendation_id} was not found.`);
  if (target.status !== "pending") throw new Error("This recommendation has already been decided.");

  const status = request.decision === "approve" ? "approved" : request.decision === "override" ? "overridden" : "rejected";
  const finalAllocation =
    request.decision === "override" && request.override_allocation ? request.override_allocation : target.proposed_allocation;
  const updated: Recommendation = {
    ...target,
    status,
    proposed_allocation: request.decision === "reject" ? target.proposed_allocation : finalAllocation,
  };
  recommendations = recommendations.map((r) => (r.recommendation_id === updated.recommendation_id ? updated : r));

  const audit_event = appendEvent({
    timestamp,
    user: request.user,
    action: status,
    supplier: target.primary_manufacturer_name,
    previous_allocation: request.decision === "override" ? target.proposed_allocation : target.current_allocation,
    new_allocation: request.decision === "reject" ? null : finalAllocation,
    reason: request.reason,
    scenario_mode: target.mode,
    recommendation_id: target.recommendation_id,
  });

  return { recommendation: updated, audit_event };
}

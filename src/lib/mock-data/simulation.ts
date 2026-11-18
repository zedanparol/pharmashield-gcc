/**
 * DEMONSTRATION SIMULATION RESULTS — static, pre-generated values.
 * Scores and ranks are read from `generated/mock-scenarios.json`; nothing is
 * calculated here. The real engine (TOPSIS + LP) lives in the Python backend.
 */
import { DEFAULT_SKU, HORMUZ_STRESS_CAP, HORMUZ_STRESS_FACTOR, SCENARIO_WEIGHTS } from "@/lib/constants";
import type { QualificationStatus, ScenarioMode, SimulationResult } from "@/types";
import { buildMockAllocation } from "./allocation";
import { getMockSuppliers, mockModeScores } from "./suppliers";

const explanations: Record<ScenarioMode, SimulationResult["explanation"]> = {
  normal: {
    headline: "Baseline weights favour clean compliance and reliable delivery.",
    points: [
      "Delivery risk (C2) and compliance risk (C4) carry 0.30 each, so manufacturers with clean inspection records and consistent lead times lead the ranking.",
      "Landed cost (C1) carries only 0.10: the two most expensive European suppliers still rank first and second.",
      "The top-ranked supplier's plant capacity binds before the 70% primary cap, so the remainder goes to the next-ranked qualified manufacturer.",
      "A probation supplier receives a small trial share to build delivery history without concentrating risk.",
    ],
  },
  hormuz_crisis: {
    headline: "Weight moves from cost to route exposure, and exposed corridors are stressed 1.5×.",
    points: [
      "Landed cost (C1) drops from 0.10 to 0.00 and that 0.10 transfers to route exposure (C5), which rises from 0.25 to 0.35.",
      "Each manufacturer's C5 score is multiplied by the 1.5× Hormuz / Gulf air corridor stress factor and capped at 1.0, so suppliers shipping through Gulf hubs are penalised most.",
      "The US manufacturer with transatlantic routing moves to rank 1, and the UAE-based probation supplier rises because in-country production avoids the corridor entirely.",
      "Indian suppliers with 55–60% Gulf air share fall furthest. Their overall risk moves from medium to high.",
      "The new top-ranked supplier has an active FDA shortage listing. A reviewer must confirm available supply before approving this allocation.",
    ],
  },
  cost_focus: {
    headline: "Weight moves from route exposure to cost while trade routes are assumed stable.",
    points: [
      "Route exposure (C5) drops from 0.25 to 0.15 and that 0.10 transfers to landed cost (C1), which doubles from 0.10 to 0.20.",
      "No corridor stress factor is applied: C5 scores are unchanged from the baseline.",
      "The Jordanian manufacturer, with a landed cost about a third below the pool median and a clean record, becomes the top-ranked qualified supplier.",
      "A manufacturer still under qualification review ranks second on score but is excluded from allocation until it is qualified.",
      "The lowest-cost suppliers do not reach the top: delivery and compliance still carry 0.60 of the total weight.",
    ],
  },
};

export function getMockSimulation(mode: ScenarioMode, demand: number): SimulationResult {
  const active = getMockSuppliers(mode);
  const baseline = getMockSuppliers("normal");
  const baselineById = new Map(baseline.map((s) => [s.manufacturer_id, s]));

  return {
    mode,
    sku_id: DEFAULT_SKU.id,
    generated_at: "2026-11-15T08:00:00+04:00",
    weights: SCENARIO_WEIGHTS[mode],
    baseline_weights: SCENARIO_WEIGHTS.normal,
    stress: {
      hormuz_factor: mode === "hormuz_crisis" ? HORMUZ_STRESS_FACTOR : 1,
      cap: HORMUZ_STRESS_CAP,
      applied: mode === "hormuz_crisis",
    },
    rankings: active.map((supplier) => {
      const base = baselineById.get(supplier.manufacturer_id)!;
      return {
        manufacturer_id: supplier.manufacturer_id,
        manufacturer_name: supplier.manufacturer_name,
        manufacturing_country: supplier.manufacturing_country,
        qualification_status: supplier.qualification_status as QualificationStatus,
        is_probation: supplier.is_probation,
        rank: supplier.rank,
        baseline_rank: base.rank,
        topsis_score: supplier.topsis_score,
        baseline_topsis_score: base.topsis_score,
        overall_risk: supplier.overall_risk,
        baseline_overall_risk: base.overall_risk,
        risk_category: supplier.risk_category,
        baseline_risk_category: base.risk_category,
        C5_route_exposure_baseline: supplier.C5_route_exposure,
        C5_route_exposure_effective: mockModeScores(mode, supplier.manufacturer_id).C5_route_exposure_effective,
        hormuz_air_share: supplier.hormuz_air_share,
      };
    }),
    allocation: buildMockAllocation(mode, demand),
    baseline_allocation: buildMockAllocation("normal", demand),
    explanation: explanations[mode],
  };
}

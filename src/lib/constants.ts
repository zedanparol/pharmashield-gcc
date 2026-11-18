import type { CriterionKey, CriterionWeights, QualificationStatus, RiskCategory, ScenarioMode, Severity } from "@/types";

export const APP_NAME = "PharmaShield GCC";
export const APP_TAGLINE = "Pharmaceutical Procurement Intelligence";

export const DEFAULT_SKU = {
  id: "CARBO-10MG-ML",
  name: "Carboplatin Injection (10 mg/mL)",
  shortName: "Carboplatin Injection",
  tier: 1,
} as const;

export const DEFAULT_MONTHLY_DEMAND = 10_000;

/** Allocation rules from the implementation plan — displayed, never computed here. */
export const ALLOCATION_RULES = {
  primaryMaxPct: 70,
  probationMinPct: 5,
  probationMaxPct: 10,
  minQualifiedManufacturers: 2,
} as const;

export const CRITERION_KEYS: CriterionKey[] = [
  "C1_landed_cost",
  "C2_delivery_risk",
  "C3_price_integrity",
  "C4_compliance_risk",
  "C5_route_exposure",
];

export interface CriterionMeta {
  key: CriterionKey;
  code: string;
  label: string;
  shortLabel: string;
  description: string;
  lowMeans: string;
  highMeans: string;
}

export const CRITERIA: Record<CriterionKey, CriterionMeta> = {
  C1_landed_cost: {
    key: "C1_landed_cost",
    code: "C1",
    label: "Landed Cost",
    shortLabel: "Cost",
    description:
      "Total delivered cost per vial (ex-works price, freight, insurance, duties), normalised across all evaluated manufacturers.",
    lowMeans: "Cheapest landed cost in the pool",
    highMeans: "Most expensive landed cost in the pool",
  },
  C2_delivery_risk: {
    key: "C2_delivery_risk",
    code: "C2",
    label: "Delivery Disruption Risk",
    shortLabel: "Delivery",
    description:
      "Predicted probability of late or failed delivery, based on lead-time history, shortage records and logistics signals.",
    lowMeans: "Consistently on-time",
    highMeans: "Frequent delays or disruption",
  },
  C3_price_integrity: {
    key: "C3_price_integrity",
    code: "C3",
    label: "Price Integrity Risk",
    shortLabel: "Price",
    description:
      "Likelihood of anomalous or unstable pricing relative to market benchmarks, such as unexplained spikes or below-cost bids.",
    lowMeans: "Stable, benchmark-aligned pricing",
    highMeans: "Volatile or anomalous pricing",
  },
  C4_compliance_risk: {
    key: "C4_compliance_risk",
    code: "C4",
    label: "Compliance & Contract Risk",
    shortLabel: "Compliance",
    description:
      "Regulatory and contractual exposure: FDA inspection outcomes, CGMP warning letters and adverse contract clauses.",
    lowMeans: "Clean inspection and contract record",
    highMeans: "Significant regulatory or contract findings",
  },
  C5_route_exposure: {
    key: "C5_route_exposure",
    code: "C5",
    label: "Geopolitical & Route Exposure",
    shortLabel: "Route",
    description:
      "Dependence on vulnerable trade corridors, including the Strait of Hormuz and Gulf air routes, plus origin-country risk.",
    lowMeans: "Resilient, diversified routing",
    highMeans: "Heavily dependent on exposed corridors",
  },
};

/** Tier 1 weights exactly as specified in the implementation plan. */
export const SCENARIO_WEIGHTS: Record<ScenarioMode, CriterionWeights> = {
  normal: {
    C1_landed_cost: 0.1,
    C2_delivery_risk: 0.3,
    C3_price_integrity: 0.05,
    C4_compliance_risk: 0.3,
    C5_route_exposure: 0.25,
  },
  hormuz_crisis: {
    C1_landed_cost: 0.0,
    C2_delivery_risk: 0.3,
    C3_price_integrity: 0.05,
    C4_compliance_risk: 0.3,
    C5_route_exposure: 0.35,
  },
  cost_focus: {
    C1_landed_cost: 0.2,
    C2_delivery_risk: 0.3,
    C3_price_integrity: 0.05,
    C4_compliance_risk: 0.3,
    C5_route_exposure: 0.15,
  },
};

export const HORMUZ_STRESS_FACTOR = 1.5;
export const HORMUZ_STRESS_CAP = 1.0;

export interface ScenarioMeta {
  mode: ScenarioMode;
  label: string;
  shortLabel: string;
  description: string;
  shift: string;
}

export const SCENARIOS: Record<ScenarioMode, ScenarioMeta> = {
  normal: {
    mode: "normal",
    label: "Normal Mode",
    shortLabel: "Normal",
    description: "Tier 1 AHP baseline weights. Balanced resilience and cost under stable trade conditions.",
    shift: "Baseline weights — no transfer",
  },
  hormuz_crisis: {
    mode: "hormuz_crisis",
    label: "Hormuz Crisis Mode",
    shortLabel: "Hormuz Crisis",
    description:
      "Strait of Hormuz / Gulf air corridor disruption. Cost is disregarded and route exposure is stressed by 1.5×.",
    shift: "0.10 moves from C1 Landed Cost to C5 Route Exposure",
  },
  cost_focus: {
    mode: "cost_focus",
    label: "Cost Focus Mode",
    shortLabel: "Cost Focus",
    description: "Budget-constrained procurement. Extra weight on landed cost while trade routes are stable.",
    shift: "0.10 moves from C5 Route Exposure to C1 Landed Cost",
  },
};

export const SCENARIO_ORDER: ScenarioMode[] = ["normal", "hormuz_crisis", "cost_focus"];

export const RISK_LABELS: Record<RiskCategory, string> = {
  low: "Low risk",
  medium: "Medium risk",
  high: "High risk",
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  moderate: "Moderate",
  low: "Low",
  unclassified: "Unclassified",
};

export const QUALIFICATION_LABELS: Record<QualificationStatus, string> = {
  qualified: "Qualified",
  probation: "Probation",
  under_review: "Under review",
  disqualified: "Disqualified",
};

export const ROLE_LABELS = {
  primary: "Primary",
  secondary: "Secondary",
  probation: "Probation trial",
  backup: "Backup",
} as const;

/** Fixed series colour per allocation role — colour follows the entity, never its rank. */
export const ROLE_COLORS = {
  primary: "var(--series-1)",
  secondary: "var(--series-3)",
  probation: "var(--series-4)",
  backup: "var(--series-6)",
  spot_buy: "var(--series-2)",
} as const;

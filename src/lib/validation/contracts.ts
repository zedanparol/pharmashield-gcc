/**
 * Backend integration contracts.
 *
 * These Zod schemas are the single source of truth for every response the
 * frontend expects from the Python backend. TypeScript types are inferred
 * from them (see `src/types`), and live responses are validated against them
 * in `src/services/api/client.ts`, so a contract drift surfaces as a clear
 * error instead of a broken chart.
 *
 * Field names mirror `data/processed/suppliers_matrix.csv` exactly.
 * Human-readable documentation: `docs/API_CONTRACTS.md`.
 */
import { z } from "zod";

/* ── Shared primitives ──────────────────────────────────────────────────── */

/** All criteria are normalised to 0–1 and are lower-is-better. */
const unit = z.number().min(0).max(1);

/** pandas/CSV exports booleans as true/false, 1/0 or "True"/"False". Accept all. */
const flexibleBoolean = z.preprocess((value) => {
  if (typeof value === "string") return ["true", "1", "yes", "y"].includes(value.trim().toLowerCase());
  if (typeof value === "number") return value !== 0;
  return value;
}, z.boolean());

/** `shap_top3_reasons` may arrive as a JSON array or a delimited string. */
const flexibleStringList = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  return value
    .split(/[|;]/)
    .map((part) => part.trim())
    .filter(Boolean);
}, z.array(z.string()));

export const scenarioModeSchema = z.enum(["normal", "hormuz_crisis", "cost_focus"]);
export const riskCategorySchema = z.enum(["low", "medium", "high"]);
export const severitySchema = z.enum(["critical", "high", "moderate", "low", "unclassified"]);
export const qualificationStatusSchema = z.enum(["qualified", "probation", "under_review", "disqualified"]);

export const criterionKeySchema = z.enum([
  "C1_landed_cost",
  "C2_delivery_risk",
  "C3_price_integrity",
  "C4_compliance_risk",
  "C5_route_exposure",
]);

export const criterionWeightsSchema = z.object({
  C1_landed_cost: unit,
  C2_delivery_risk: unit,
  C3_price_integrity: unit,
  C4_compliance_risk: unit,
  C5_route_exposure: unit,
});

/* ── Suppliers ──────────────────────────────────────────────────────────── */

/** One row of `suppliers_matrix.csv`. */
export const supplierMatrixRowSchema = z.object({
  sku_id: z.string(),
  criticality_tier: z.number().int(),
  manufacturer_id: z.string(),
  labeler_name_fda: z.string(),
  manufacturing_country: z.string(),
  is_probation: flexibleBoolean,
  monthly_capacity_units: z.number().nonnegative(),
  C1_landed_cost: unit,
  C2_delivery_risk: unit,
  C3_price_integrity: unit,
  C4_compliance_risk: unit,
  C5_route_exposure: unit,
  hormuz_air_share: unit,
  active_fda_shortage: flexibleBoolean,
  oai_count_5yr: z.number().int().nonnegative(),
  shap_top3_reasons: flexibleStringList,
});

/** Matrix row plus the scoring outputs the backend computes for a scenario. */
export const supplierSchema = supplierMatrixRowSchema.extend({
  manufacturer_name: z.string(),
  qualification_status: qualificationStatusSchema,
  /** TOPSIS closeness coefficient, 0–1. HIGHER IS BETTER. */
  topsis_score: unit,
  rank: z.number().int().positive(),
  /** Composite risk, 0–1. LOWER IS BETTER. */
  overall_risk: unit,
  risk_category: riskCategorySchema,
  /** Raw landed cost before normalisation, per vial. */
  landed_cost_per_unit: z.number().nonnegative(),
  currency: z.string(),
});

export const shapContributionSchema = z.object({
  feature: z.string(),
  criterion: criterionKeySchema.nullable(),
  /** Signed contribution to predicted risk: positive raises risk, negative lowers it. */
  contribution: z.number(),
  value_label: z.string(),
});

export const inspectionRecordSchema = z.object({
  date: z.string(),
  agency: z.string(),
  classification: z.enum(["NAI", "VAI", "OAI"]),
  summary: z.string(),
});

export const supplierDetailSchema = supplierSchema.extend({
  overview: z.string(),
  site_location: z.string(),
  fda_establishment_id: z.string(),
  shap_values: z.array(shapContributionSchema),
  regulatory: z.object({
    last_inspection_date: z.string().nullable(),
    last_inspection_outcome: z.enum(["NAI", "VAI", "OAI"]).nullable(),
    open_warning_letter: flexibleBoolean,
    import_alert: flexibleBoolean,
    certifications: z.array(z.string()),
    notes: z.string(),
  }),
  inspection_history: z.array(inspectionRecordSchema),
  active_shortages: z.array(
    z.object({
      shortage_id: z.string(),
      drug_name: z.string(),
      reason: z.string(),
      last_updated: z.string(),
    }),
  ),
  delivery_performance: z.object({
    on_time_rate: unit,
    avg_lead_time_days: z.number(),
    lead_time_variability_days: z.number(),
    monthly: z.array(z.object({ month: z.string(), on_time_rate: unit, lead_time_days: z.number() })),
  }),
  procurement_suitability: z.object({
    verdict: z.enum(["recommended_primary", "recommended_secondary", "trial_only", "not_recommended"]),
    summary: z.string(),
    strengths: z.array(z.string()),
    concerns: z.array(z.string()),
  }),
});

export const supplierUpdateSchema = z.object({
  update_id: z.string(),
  manufacturer_id: z.string(),
  manufacturer_name: z.string(),
  type: z.enum(["inspection", "qualification", "shortage", "pricing", "logistics"]),
  message: z.string(),
  timestamp: z.string(),
});

/* ── Shortages ──────────────────────────────────────────────────────────── */

export const shortageSchema = z.object({
  shortage_id: z.string(),
  drug_name: z.string(),
  presentation: z.string(),
  manufacturer_name: z.string(),
  status: z.enum(["active", "resolved"]),
  severity: severitySchema,
  reason: z.string(),
  therapeutic_category: z.string(),
  initial_posting_date: z.string(),
  last_updated: z.string(),
  availability_note: z.string(),
  affected_manufacturers: z.array(z.string()),
  regulatory_alerts: z.array(
    z.object({
      title: z.string(),
      agency: z.string(),
      date: z.string(),
      type: z.enum(["recall", "warning_letter", "import_alert", "safety_communication", "notice"]),
    }),
  ),
});

export const shortageTrendPointSchema = z.object({
  /** ISO year-month, e.g. "2026-03". */
  month: z.string(),
  active: z.number().int().nonnegative(),
  new: z.number().int().nonnegative(),
  resolved: z.number().int().nonnegative(),
});

/* ── Allocation ─────────────────────────────────────────────────────────── */

export const allocationRoleSchema = z.enum(["primary", "secondary", "probation", "backup"]);

export const allocationLineSchema = z.object({
  manufacturer_id: z.string(),
  manufacturer_name: z.string(),
  manufacturing_country: z.string(),
  role: allocationRoleSchema,
  allocated_units: z.number().nonnegative(),
  allocation_pct: z.number().min(0).max(100),
  monthly_capacity_units: z.number().nonnegative(),
  capacity_utilisation_pct: z.number().min(0).max(100),
  landed_cost_per_unit: z.number().nonnegative(),
  risk_adjusted_cost_per_unit: z.number().nonnegative(),
  line_cost: z.number().nonnegative(),
  overall_risk: unit,
});

export const allocationResultSchema = z.object({
  sku_id: z.string(),
  sku_name: z.string(),
  mode: scenarioModeSchema,
  monthly_demand_units: z.number().positive(),
  currency: z.string(),
  generated_at: z.string(),
  solver: z.object({
    /** e.g. "PuLP/CBC" from the real optimiser, or "mock-heuristic" in demo mode. */
    engine: z.string(),
    status: z.enum(["optimal", "feasible", "infeasible", "mock"]),
    note: z.string(),
  }),
  lines: z.array(allocationLineSchema),
  spot_buy: z.object({
    units: z.number().nonnegative(),
    unit_cost: z.number().nonnegative(),
    cost: z.number().nonnegative(),
  }),
  totals: z.object({
    allocated_units: z.number().nonnegative(),
    total_cost: z.number().nonnegative(),
    risk_adjusted_total_cost: z.number().nonnegative(),
    avg_unit_cost: z.number().nonnegative(),
    weighted_risk: unit,
    backup_coverage_pct: z.number().min(0),
  }),
  constraints: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      satisfied: z.boolean(),
      detail: z.string(),
    }),
  ),
});

/* ── Simulation ─────────────────────────────────────────────────────────── */

export const simulationRankingSchema = z.object({
  manufacturer_id: z.string(),
  manufacturer_name: z.string(),
  manufacturing_country: z.string(),
  qualification_status: qualificationStatusSchema,
  is_probation: flexibleBoolean,
  rank: z.number().int().positive(),
  baseline_rank: z.number().int().positive(),
  topsis_score: unit,
  baseline_topsis_score: unit,
  overall_risk: unit,
  baseline_overall_risk: unit,
  risk_category: riskCategorySchema,
  baseline_risk_category: riskCategorySchema,
  C5_route_exposure_baseline: unit,
  C5_route_exposure_effective: unit,
  hormuz_air_share: unit,
});

export const simulationResultSchema = z.object({
  mode: scenarioModeSchema,
  sku_id: z.string(),
  generated_at: z.string(),
  weights: criterionWeightsSchema,
  baseline_weights: criterionWeightsSchema,
  stress: z.object({
    hormuz_factor: z.number(),
    cap: z.number(),
    applied: z.boolean(),
  }),
  rankings: z.array(simulationRankingSchema),
  allocation: allocationResultSchema,
  baseline_allocation: allocationResultSchema,
  explanation: z.object({
    headline: z.string(),
    points: z.array(z.string()),
  }),
});

/* ── Documents ──────────────────────────────────────────────────────────── */

export const documentTypeSchema = z.enum(["warning_letter", "supply_contract"]);
export const analysisStatusSchema = z.enum(["queued", "processing", "analysed", "failed"]);

export const documentSchema = z.object({
  document_id: z.string(),
  file_name: z.string(),
  document_type: documentTypeSchema,
  manufacturer_name: z.string().nullable(),
  size_bytes: z.number().nonnegative(),
  page_count: z.number().int().nonnegative().nullable(),
  uploaded_at: z.string(),
  uploaded_by: z.string(),
  analysis_status: analysisStatusSchema,
});

export const violationCategorySchema = z.enum([
  "sterility",
  "data_integrity",
  "process_validation",
  "quality_unit",
]);

export const clauseTypeSchema = z.enum(["force_majeure", "lead_time", "penalty", "single_source"]);

export const documentAnalysisSchema = z.object({
  document_id: z.string(),
  analysed_at: z.string(),
  model_version: z.string(),
  summary: z.string(),
  /** 0–1, lower is better. Null when the document type does not produce it. */
  compliance_risk_score: unit.nullable(),
  contract_risk_score: unit.nullable(),
  violations: z.array(
    z.object({
      category: violationCategorySchema,
      severity: severitySchema,
      confidence: unit,
      excerpt: z.string(),
      page: z.number().int().positive(),
      reference: z.string(),
    }),
  ),
  clauses: z.array(
    z.object({
      type: clauseTypeSchema,
      detected: z.boolean(),
      risk: severitySchema,
      excerpt: z.string(),
      page: z.number().int().positive().nullable(),
      interpretation: z.string(),
    }),
  ),
  /** Plain-text passages used for the in-app preview when no PDF is available. */
  preview_paragraphs: z.array(z.string()),
});

/* ── Governance & audit ─────────────────────────────────────────────────── */

export const allocationShareSchema = z.object({
  manufacturer_id: z.string(),
  manufacturer_name: z.string(),
  role: allocationRoleSchema,
  allocation_pct: z.number().min(0).max(100),
  allocated_units: z.number().nonnegative(),
});

export const recommendationSchema = z.object({
  recommendation_id: z.string(),
  created_at: z.string(),
  status: z.enum(["pending", "approved", "overridden", "rejected"]),
  sku_id: z.string(),
  sku_name: z.string(),
  mode: scenarioModeSchema,
  monthly_demand_units: z.number().positive(),
  primary_manufacturer_id: z.string(),
  primary_manufacturer_name: z.string(),
  rationale: z.string(),
  shap_summary: z.array(z.string()),
  current_allocation: z.array(allocationShareSchema),
  proposed_allocation: z.array(allocationShareSchema),
  total_cost: z.number().nonnegative(),
  currency: z.string(),
});

export const auditActionSchema = z.enum([
  "recommendation_generated",
  "submitted_for_review",
  "approved",
  "overridden",
  "rejected",
  "scenario_changed",
  "demand_updated",
  "document_analysed",
]);

export const auditEventSchema = z.object({
  event_id: z.string(),
  timestamp: z.string(),
  user: z.object({ name: z.string(), role: z.string() }),
  action: auditActionSchema,
  supplier: z.string().nullable(),
  previous_allocation: z.array(allocationShareSchema).nullable(),
  new_allocation: z.array(allocationShareSchema).nullable(),
  reason: z.string().nullable(),
  scenario_mode: scenarioModeSchema,
  recommendation_id: z.string().nullable(),
});

export const decisionRequestSchema = z.object({
  recommendation_id: z.string(),
  decision: z.enum(["approve", "override", "reject"]),
  reason: z.string().nullable(),
  override_allocation: z.array(allocationShareSchema).nullable(),
  user: z.object({ name: z.string(), role: z.string() }),
});

export const decisionResponseSchema = z.object({
  recommendation: recommendationSchema,
  audit_event: auditEventSchema,
});

export const healthSchema = z.object({
  status: z.string(),
  version: z.string().optional(),
});

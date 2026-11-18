/**
 * Application types. Everything that crosses the API boundary is inferred
 * from the Zod contracts so the types can never drift from what is validated.
 */
import type { z } from "zod";
import type * as c from "@/lib/validation/contracts";

export type ScenarioMode = z.infer<typeof c.scenarioModeSchema>;
export type RiskCategory = z.infer<typeof c.riskCategorySchema>;
export type Severity = z.infer<typeof c.severitySchema>;
export type QualificationStatus = z.infer<typeof c.qualificationStatusSchema>;
export type CriterionKey = z.infer<typeof c.criterionKeySchema>;
export type CriterionWeights = z.infer<typeof c.criterionWeightsSchema>;

export type SupplierMatrixRow = z.infer<typeof c.supplierMatrixRowSchema>;
export type Supplier = z.infer<typeof c.supplierSchema>;
export type SupplierDetail = z.infer<typeof c.supplierDetailSchema>;
export type ShapContribution = z.infer<typeof c.shapContributionSchema>;
export type InspectionRecord = z.infer<typeof c.inspectionRecordSchema>;
export type SupplierUpdate = z.infer<typeof c.supplierUpdateSchema>;

export type Shortage = z.infer<typeof c.shortageSchema>;
export type ShortageTrendPoint = z.infer<typeof c.shortageTrendPointSchema>;

export type AllocationRole = z.infer<typeof c.allocationRoleSchema>;
export type AllocationLine = z.infer<typeof c.allocationLineSchema>;
export type AllocationResult = z.infer<typeof c.allocationResultSchema>;
export type AllocationShare = z.infer<typeof c.allocationShareSchema>;

export type SimulationRanking = z.infer<typeof c.simulationRankingSchema>;
export type SimulationResult = z.infer<typeof c.simulationResultSchema>;

export type DocumentType = z.infer<typeof c.documentTypeSchema>;
export type AnalysisStatus = z.infer<typeof c.analysisStatusSchema>;
export type DocumentRecord = z.infer<typeof c.documentSchema>;
export type DocumentAnalysis = z.infer<typeof c.documentAnalysisSchema>;
export type ViolationCategory = z.infer<typeof c.violationCategorySchema>;
export type ClauseType = z.infer<typeof c.clauseTypeSchema>;

export type Recommendation = z.infer<typeof c.recommendationSchema>;
export type AuditAction = z.infer<typeof c.auditActionSchema>;
export type AuditEvent = z.infer<typeof c.auditEventSchema>;
export type DecisionRequest = z.infer<typeof c.decisionRequestSchema>;
export type DecisionResponse = z.infer<typeof c.decisionResponseSchema>;

/** Where a payload came from. Drives the "Demo data" / "Live" badges. */
export type DataSource = "mock" | "live";

export interface ApiMeta {
  source: DataSource;
  fetchedAt: string;
  /** Human-readable origin, e.g. "Mock provider" or the backend URL. */
  origin: string;
}

export interface ApiResult<T> {
  data: T;
  meta: ApiMeta;
}

export interface SessionUser {
  name: string;
  email: string;
  role: string;
  organisation: string;
  /** True when signed in through the prototype's demo path (no auth service). */
  isDemo: boolean;
}

/**
 * DEMONSTRATION DATA — fictional manufacturers, illustrative values.
 * Served only while NEXT_PUBLIC_USE_MOCK_DATA=true. Not model output.
 *
 * Manufacturer names are invented on purpose: attributing fabricated risk
 * scores, inspection outcomes or shortages to real companies would be
 * misleading. Real FDA labeler names arrive with the backend.
 */
import type {
  CriterionKey,
  InspectionRecord,
  QualificationStatus,
  RiskCategory,
  ScenarioMode,
  ShapContribution,
  Supplier,
  SupplierDetail,
  SupplierUpdate,
} from "@/types";
import generated from "./generated/mock-scenarios.json";

interface MatrixEntry {
  manufacturer_id: string;
  manufacturer_name: string;
  manufacturing_country: string;
  is_probation: boolean;
  qualification_status: string;
  monthly_capacity_units: number;
  landed_cost_per_unit: number;
  hormuz_air_share: number;
  active_fda_shortage: boolean;
  oai_count_5yr: number;
  C1_landed_cost: number;
  C2_delivery_risk: number;
  C3_price_integrity: number;
  C4_compliance_risk: number;
  C5_route_exposure: number;
}

interface ModeScores {
  topsis_score: number;
  rank: number;
  overall_risk: number;
  risk_category: string;
  C5_route_exposure_effective: number;
}

const matrix = generated.matrix as MatrixEntry[];
const modes = generated.modes as Record<ScenarioMode, { suppliers: Record<string, ModeScores> }>;

export function mockModeScores(mode: ScenarioMode, manufacturerId: string): ModeScores {
  return modes[mode].suppliers[manufacturerId];
}

type Shap = [feature: string, criterion: CriterionKey | null, contribution: number, valueLabel: string];
type Inspection = [date: string, agency: string, classification: InspectionRecord["classification"], summary: string];

interface Narrative {
  top3: [string, string, string];
  shap: Shap[];
  overview: string;
  site: string;
  fei: string;
  certifications: string[];
  regulatoryNotes: string;
  openWarningLetter?: boolean;
  importAlert?: boolean;
  inspections: Inspection[];
  onTime: number;
  leadTime: number;
  leadVar: number;
  verdict: SupplierDetail["procurement_suitability"]["verdict"];
  suitability: string;
  strengths: string[];
  concerns: string[];
  shortages?: SupplierDetail["active_shortages"];
}

const C1: CriterionKey = "C1_landed_cost";
const C2: CriterionKey = "C2_delivery_risk";
const C3: CriterionKey = "C3_price_integrity";
const C4: CriterionKey = "C4_compliance_risk";
const C5: CriterionKey = "C5_route_exposure";

const narratives: Record<string, Narrative> = {
  "MFR-001": {
    top3: ["No OAI inspection outcomes in 5 years", "97% on-time delivery over 12 months", "Low Gulf air corridor dependence (20%)"],
    shap: [
      ["OAI outcomes (5 yr)", C4, -0.092, "0"],
      ["On-time delivery rate", C2, -0.071, "97%"],
      ["Hormuz / Gulf air share", C5, -0.048, "20%"],
      ["Price variance vs benchmark", C3, -0.026, "±3%"],
      ["Landed cost per vial", C1, 0.041, "$31.40"],
      ["Single API source", C2, 0.018, "Yes"],
    ],
    overview:
      "EU-GMP sterile injectables manufacturer with a dedicated cytotoxic filling line. Long-standing oncology supplier to European hospital groups with a clean regulatory record.",
    site: "Leipzig, Germany",
    fei: "FEI 3009 (demo)",
    certifications: ["EU-GMP", "US FDA registered", "ISO 13485"],
    regulatoryNotes: "Most recent inspection closed with no observations. No open regulatory actions.",
    inspections: [
      ["2026-03-18", "US FDA", "NAI", "Routine surveillance inspection. No Form 483 issued."],
      ["2025-02-06", "EMA / BfArM", "NAI", "EU-GMP certificate renewed for sterile cytotoxics."],
      ["2023-09-21", "US FDA", "VAI", "One observation on environmental monitoring trending; closed within 60 days."],
    ],
    onTime: 0.97,
    leadTime: 21,
    leadVar: 2,
    verdict: "recommended_primary",
    suitability:
      "Strong candidate for primary allocation. Capacity (6,500 vials/month) binds before the 70% primary cap at default demand.",
    strengths: ["Clean 5-year inspection record", "Most consistent lead times in the pool", "Routes largely avoid Gulf corridors"],
    concerns: ["Second-highest landed cost", "Capacity limits primary share to 65% at 10,000 vials"],
  },
  "MFR-002": {
    top3: ["55% of shipments via Gulf air corridor", "One OAI inspection outcome in 5 years", "Lead-time variability of ±6 days"],
    shap: [
      ["Hormuz / Gulf air share", C5, 0.094, "55%"],
      ["OAI outcomes (5 yr)", C4, 0.068, "1"],
      ["Lead-time variability", C2, 0.052, "±6 d"],
      ["Price variance vs benchmark", C3, 0.019, "±8%"],
      ["Landed cost per vial", C1, -0.064, "$17.90"],
      ["Installed capacity", C2, -0.031, "9,000/mo"],
    ],
    overview:
      "High-volume Indian oncology injectables producer with two sterile blocks. Competitive pricing; most outbound freight transits Gulf hubs.",
    site: "Hyderabad, India",
    fei: "FEI 3011 (demo)",
    certifications: ["WHO-GMP", "US FDA registered", "EU-GMP"],
    regulatoryNotes: "2024 OAI outcome remediated; follow-up inspection classified VAI.",
    inspections: [
      ["2025-11-04", "US FDA", "VAI", "Follow-up inspection. Two observations on batch record review."],
      ["2024-05-13", "US FDA", "OAI", "Observations on aseptic technique and investigation timeliness."],
      ["2022-10-02", "US FDA", "VAI", "Observation on equipment cleaning validation."],
    ],
    onTime: 0.88,
    leadTime: 26,
    leadVar: 6,
    verdict: "recommended_secondary",
    suitability:
      "Suitable as a cost-efficient secondary source in stable conditions. Route exposure makes it unsuitable during a Hormuz disruption.",
    strengths: ["Second-lowest landed cost among qualified suppliers", "Large installed capacity"],
    concerns: ["High Gulf corridor dependence", "OAI outcome within the 5-year window"],
  },
  "MFR-003": {
    top3: ["Active FDA shortage listing for this SKU", "Lowest route exposure among established suppliers", "Highest landed cost in the pool"],
    shap: [
      ["Active FDA shortage", C2, 0.058, "Yes"],
      ["Landed cost per vial", C1, 0.049, "$35.20"],
      ["Hormuz / Gulf air share", C5, -0.062, "15%"],
      ["OAI outcomes (5 yr)", C4, -0.079, "0"],
      ["On-time delivery rate", C2, -0.044, "94%"],
      ["Price variance vs benchmark", C3, -0.021, "±4%"],
    ],
    overview:
      "US-based parenteral manufacturer supplying domestic and export markets. Ships to the GCC by transatlantic air freight that bypasses Gulf chokepoints.",
    site: "Rocky Mount, United States",
    fei: "FEI 3014 (demo)",
    certifications: ["US FDA registered", "EU-GMP"],
    regulatoryNotes: "No open regulatory actions. Currently listed with a demand-driven shortage for this presentation.",
    inspections: [
      ["2026-01-22", "US FDA", "NAI", "Pre-approval and surveillance inspection. No observations."],
      ["2024-06-10", "US FDA", "VAI", "Observation on stability sample management; closed."],
    ],
    onTime: 0.94,
    leadTime: 19,
    leadVar: 3,
    verdict: "recommended_secondary",
    suitability:
      "Resilient routing makes this the top-ranked option in a Hormuz crisis, but the active shortage listing requires reviewer confirmation of available supply.",
    strengths: ["Lowest route exposure among established suppliers", "Clean inspection record"],
    concerns: ["Active FDA shortage listing", "Highest landed cost in the pool"],
    shortages: [
      {
        shortage_id: "MOCK-SH-001",
        drug_name: "Carboplatin Injection",
        reason: "Demand increase for the drug",
        last_updated: "2026-11-09",
      },
    ],
  },
  "MFR-004": {
    top3: ["Two OAI inspection outcomes in 5 years", "Price variance of ±19% vs benchmark", "Lowest landed cost among qualified suppliers"],
    shap: [
      ["OAI outcomes (5 yr)", C4, 0.108, "2"],
      ["Price variance vs benchmark", C3, 0.083, "±19%"],
      ["On-time delivery rate", C2, 0.071, "81%"],
      ["Hormuz / Gulf air share", C5, 0.036, "35%"],
      ["Landed cost per vial", C1, -0.088, "$14.60"],
      ["Installed capacity", C2, -0.034, "12,000/mo"],
    ],
    overview:
      "Large-scale Chinese sterile manufacturer with the highest installed capacity in the pool. Aggressive pricing with a mixed compliance history.",
    site: "Jinan, China",
    fei: "FEI 3019 (demo)",
    certifications: ["NMPA GMP", "US FDA registered"],
    regulatoryNotes: "Two OAI outcomes in the window. Warning letter closed out in 2025.",
    inspections: [
      ["2025-08-19", "US FDA", "VAI", "Close-out inspection following warning letter remediation."],
      ["2024-02-27", "US FDA", "OAI", "Data integrity observations in the QC laboratory."],
      ["2022-06-14", "US FDA", "OAI", "Inadequate investigation of sterility failures."],
    ],
    onTime: 0.81,
    leadTime: 34,
    leadVar: 9,
    verdict: "not_recommended",
    suitability:
      "Not recommended for Tier 1 allocation at current scores. Capacity makes it a possible emergency reserve subject to enhanced incoming QC.",
    strengths: ["Lowest landed cost among qualified suppliers", "Highest capacity in the pool"],
    concerns: ["Two OAI outcomes in 5 years", "Unstable pricing", "Long, variable lead times"],
  },
  "MFR-005": {
    top3: ["Regional road and sea routing limits Gulf air use", "No OAI inspection outcomes in 5 years", "Landed cost 33% below the pool median"],
    shap: [
      ["OAI outcomes (5 yr)", C4, -0.071, "0"],
      ["Landed cost per vial", C1, -0.052, "$20.90"],
      ["On-time delivery rate", C2, -0.039, "92%"],
      ["Hormuz / Gulf air share", C5, -0.022, "25%"],
      ["Price variance vs benchmark", C3, -0.014, "±5%"],
      ["Regional border delays", C2, 0.027, "Occasional"],
    ],
    overview:
      "Jordanian sterile injectables manufacturer serving MENA tenders. Overland and Red Sea routing gives short, resilient lead times into the UAE.",
    site: "Amman, Jordan",
    fei: "FEI 3022 (demo)",
    certifications: ["JFDA GMP", "EU-GMP", "GCC-DR registered"],
    regulatoryNotes: "No open regulatory actions.",
    inspections: [
      ["2026-02-11", "JFDA", "NAI", "Routine GMP inspection. No critical findings."],
      ["2024-11-07", "US FDA", "VAI", "Observation on change control documentation; closed."],
    ],
    onTime: 0.92,
    leadTime: 12,
    leadVar: 3,
    verdict: "recommended_secondary",
    suitability:
      "Well-balanced regional supplier. Becomes the top-ranked qualified option when cost is weighted more heavily.",
    strengths: ["Shortest lead time in the pool", "Competitive landed cost", "Clean inspection record"],
    concerns: ["Occasional regional border delays", "Mid-sized capacity (5,000 vials/month)"],
  },
  "MFR-006": {
    top3: ["60% of shipments via Gulf air corridor", "New supplier on probation — limited delivery history", "One OAI inspection outcome in 5 years"],
    shap: [
      ["Hormuz / Gulf air share", C5, 0.101, "60%"],
      ["Delivery history length", C2, 0.066, "7 months"],
      ["OAI outcomes (5 yr)", C4, 0.061, "1"],
      ["Price variance vs benchmark", C3, 0.024, "±10%"],
      ["Landed cost per vial", C1, -0.079, "$16.30"],
    ],
    overview:
      "Recently onboarded Indian injectables producer under a probationary trial. Attractive pricing; limited track record with the GPO.",
    site: "Visakhapatnam, India",
    fei: "FEI 3027 (demo)",
    certifications: ["WHO-GMP", "US FDA registered"],
    regulatoryNotes: "On probation since April 2026. One OAI outcome under remediation.",
    inspections: [
      ["2025-07-15", "US FDA", "OAI", "Observations on media fill simulation and gowning qualification."],
      ["2023-12-04", "CDSCO", "NAI", "State licensing inspection."],
    ],
    onTime: 0.84,
    leadTime: 28,
    leadVar: 7,
    verdict: "trial_only",
    suitability: "Probation trial volumes only (5–10%). Not eligible for primary or secondary allocation until probation closes.",
    strengths: ["Low landed cost", "Additional sourcing diversity"],
    concerns: ["High Gulf corridor dependence", "Short delivery history", "OAI outcome under remediation"],
  },
  "MFR-007": {
    top3: ["No OAI inspection outcomes in 5 years", "Stable pricing within ±2% of benchmark", "96% on-time delivery over 12 months"],
    shap: [
      ["OAI outcomes (5 yr)", C4, -0.086, "0"],
      ["On-time delivery rate", C2, -0.063, "96%"],
      ["Price variance vs benchmark", C3, -0.034, "±2%"],
      ["Hormuz / Gulf air share", C5, -0.041, "20%"],
      ["Landed cost per vial", C1, 0.033, "$29.60"],
    ],
    overview:
      "Italian contract and own-label manufacturer specialising in platinum-based oncology injectables, with stable long-term pricing.",
    site: "Latina, Italy",
    fei: "FEI 3031 (demo)",
    certifications: ["EU-GMP", "US FDA registered"],
    regulatoryNotes: "No open regulatory actions.",
    inspections: [
      ["2025-10-08", "AIFA", "NAI", "EU-GMP renewal inspection."],
      ["2024-03-19", "US FDA", "NAI", "Surveillance inspection. No Form 483 issued."],
    ],
    onTime: 0.96,
    leadTime: 20,
    leadVar: 2,
    verdict: "recommended_secondary",
    suitability: "Reliable secondary source; near-equal to the top-ranked supplier under baseline weights.",
    strengths: ["Most stable pricing in the pool", "Clean inspection record"],
    concerns: ["Above-median landed cost", "Capacity of 4,500 vials/month"],
  },
  "MFR-008": {
    top3: ["In-country manufacturing — minimal corridor exposure (5%)", "New supplier on probation — plant commissioned 2025", "Shortest delivery distance in the pool"],
    shap: [
      ["Hormuz / Gulf air share", C5, -0.112, "5%"],
      ["On-time delivery rate", C2, -0.058, "98%"],
      ["Delivery history length", C4, 0.049, "9 months"],
      ["Regulatory track record", C4, 0.038, "1 inspection"],
      ["Landed cost per vial", C1, 0.012, "$27.10"],
    ],
    overview:
      "UAE-based sterile facility commissioned in 2025. Local production removes dependence on Gulf chokepoints; regulatory history is still short.",
    site: "KIZAD, Abu Dhabi, UAE",
    fei: "FEI 3036 (demo)",
    certifications: ["MOHAP GMP", "GCC-DR registered"],
    regulatoryNotes: "On probation since February 2026 pending a second regulatory inspection cycle.",
    inspections: [["2025-12-02", "MOHAP", "NAI", "Initial GMP licensing inspection."]],
    onTime: 0.98,
    leadTime: 4,
    leadVar: 1,
    verdict: "trial_only",
    suitability:
      "Strategically valuable local source. Probation trial volumes (5–10%) recommended; small capacity limits its ceiling.",
    strengths: ["Lowest route exposure in the pool", "4-day lead time", "Strengthens in-country supply security"],
    concerns: ["Short regulatory track record", "Capacity of 2,000 vials/month"],
  },
  "MFR-009": {
    top3: ["Qualification dossier under review", "No OAI inspection outcomes in 5 years", "Moderate Gulf air corridor dependence (30%)"],
    shap: [
      ["OAI outcomes (5 yr)", C4, -0.074, "0"],
      ["On-time delivery rate", C2, -0.041, "93%"],
      ["Price variance vs benchmark", C3, -0.022, "±4%"],
      ["Hormuz / Gulf air share", C5, 0.017, "30%"],
      ["Landed cost per vial", C1, 0.006, "$23.90"],
    ],
    overview:
      "South Korean biologics and sterile injectables manufacturer seeking GPO qualification. Scores well but is not yet eligible for allocation.",
    site: "Incheon, South Korea",
    fei: "FEI 3040 (demo)",
    certifications: ["MFDS GMP", "US FDA registered", "PIC/S"],
    regulatoryNotes: "Technical dossier and site audit report under review by the qualification committee.",
    inspections: [
      ["2025-09-16", "MFDS", "NAI", "Routine GMP inspection."],
      ["2024-08-01", "US FDA", "NAI", "Surveillance inspection. No observations."],
    ],
    onTime: 0.93,
    leadTime: 23,
    leadVar: 3,
    verdict: "not_recommended",
    suitability: "Not eligible for allocation until qualification completes. Strong candidate thereafter.",
    strengths: ["Clean inspection record", "Balanced cost and risk profile"],
    concerns: ["Qualification not yet complete"],
  },
  "MFR-010": {
    top3: ["Three OAI inspection outcomes in 5 years", "Open CGMP warning letter (sterility assurance)", "Active FDA shortage listing for this SKU"],
    shap: [
      ["OAI outcomes (5 yr)", C4, 0.164, "3"],
      ["Open warning letter", C4, 0.121, "Yes"],
      ["On-time delivery rate", C2, 0.097, "68%"],
      ["Price variance vs benchmark", C3, 0.088, "±27%"],
      ["Hormuz / Gulf air share", C5, 0.073, "58%"],
      ["Landed cost per vial", C1, -0.091, "$13.80"],
    ],
    overview:
      "Low-cost Indian injectables manufacturer disqualified after repeated sterility-assurance findings. Retained in the matrix for monitoring only.",
    site: "Ahmedabad, India",
    fei: "FEI 3044 (demo)",
    certifications: ["WHO-GMP (suspended)"],
    regulatoryNotes: "Open CGMP warning letter and import alert. Disqualified from allocation.",
    openWarningLetter: true,
    importAlert: true,
    inspections: [
      ["2026-04-09", "US FDA", "OAI", "Repeat observations on aseptic processing and data integrity."],
      ["2025-01-28", "US FDA", "OAI", "Warning letter issued: sterility assurance and quality unit oversight."],
      ["2023-05-17", "US FDA", "OAI", "Inadequate investigations into out-of-specification results."],
    ],
    onTime: 0.68,
    leadTime: 41,
    leadVar: 14,
    verdict: "not_recommended",
    suitability: "Disqualified. Must not receive allocation regardless of scenario.",
    strengths: ["Lowest landed cost in the pool"],
    concerns: ["Open warning letter and import alert", "Three OAI outcomes in 5 years", "Active shortage listing"],
    shortages: [
      {
        shortage_id: "MOCK-SH-002",
        drug_name: "Carboplatin Injection",
        reason: "Requirements related to complying with good manufacturing practices",
        last_updated: "2026-10-28",
      },
    ],
  },
};

/** Fixed seasonal pattern so monthly delivery series are deterministic, not random. */
const MONTHS = [
  "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05",
  "2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11",
];
const WOBBLE = [0.01, -0.02, 0.0, 0.02, -0.01, 0.01, -0.03, 0.0, 0.02, -0.01, 0.01, 0.0];

function toSupplier(entry: MatrixEntry, mode: ScenarioMode): Supplier {
  const scores = mockModeScores(mode, entry.manufacturer_id);
  return {
    sku_id: generated.sku_id,
    criticality_tier: generated.criticality_tier,
    manufacturer_id: entry.manufacturer_id,
    manufacturer_name: entry.manufacturer_name,
    labeler_name_fda: entry.manufacturer_name,
    manufacturing_country: entry.manufacturing_country,
    is_probation: entry.is_probation,
    qualification_status: entry.qualification_status as QualificationStatus,
    monthly_capacity_units: entry.monthly_capacity_units,
    C1_landed_cost: entry.C1_landed_cost,
    C2_delivery_risk: entry.C2_delivery_risk,
    C3_price_integrity: entry.C3_price_integrity,
    C4_compliance_risk: entry.C4_compliance_risk,
    C5_route_exposure: entry.C5_route_exposure,
    hormuz_air_share: entry.hormuz_air_share,
    active_fda_shortage: entry.active_fda_shortage,
    oai_count_5yr: entry.oai_count_5yr,
    shap_top3_reasons: [...narratives[entry.manufacturer_id].top3],
    topsis_score: scores.topsis_score,
    rank: scores.rank,
    overall_risk: scores.overall_risk,
    risk_category: scores.risk_category as RiskCategory,
    landed_cost_per_unit: entry.landed_cost_per_unit,
    currency: "USD",
  };
}

export function getMockSuppliers(mode: ScenarioMode): Supplier[] {
  return matrix.map((entry) => toSupplier(entry, mode)).sort((a, b) => a.rank - b.rank);
}

export function getMockSupplierDetail(manufacturerId: string, mode: ScenarioMode): SupplierDetail | null {
  const entry = matrix.find((m) => m.manufacturer_id === manufacturerId);
  if (!entry) return null;
  const n = narratives[manufacturerId];
  const last = n.inspections[0];
  return {
    ...toSupplier(entry, mode),
    overview: n.overview,
    site_location: n.site,
    fda_establishment_id: n.fei,
    shap_values: n.shap.map(
      ([feature, criterion, contribution, value_label]): ShapContribution => ({
        feature,
        criterion,
        contribution,
        value_label,
      }),
    ),
    regulatory: {
      last_inspection_date: last?.[0] ?? null,
      last_inspection_outcome: last?.[2] ?? null,
      open_warning_letter: n.openWarningLetter ?? false,
      import_alert: n.importAlert ?? false,
      certifications: n.certifications,
      notes: n.regulatoryNotes,
    },
    inspection_history: n.inspections.map(([date, agency, classification, summary]) => ({
      date,
      agency,
      classification,
      summary,
    })),
    active_shortages: n.shortages ?? [],
    delivery_performance: {
      on_time_rate: n.onTime,
      avg_lead_time_days: n.leadTime,
      lead_time_variability_days: n.leadVar,
      monthly: MONTHS.map((month, i) => ({
        month,
        on_time_rate: Math.min(1, Math.max(0, Number((n.onTime + WOBBLE[i] * (1 + n.leadVar / 6)).toFixed(3)))),
        lead_time_days: Math.max(1, Math.round(n.leadTime - WOBBLE[i] * n.leadVar * 12)),
      })),
    },
    procurement_suitability: {
      verdict: n.verdict,
      summary: n.suitability,
      strengths: n.strengths,
      concerns: n.concerns,
    },
  };
}

export const mockSupplierUpdates: SupplierUpdate[] = [
  {
    update_id: "UPD-0412",
    manufacturer_id: "MFR-003",
    manufacturer_name: "Corvell Parenterals Inc.",
    type: "shortage",
    message: "Shortage listing updated: limited supply expected to continue through Q1 2027.",
    timestamp: "2026-11-14T09:42:00+04:00",
  },
  {
    update_id: "UPD-0411",
    manufacturer_id: "MFR-008",
    manufacturer_name: "Gulf Meridian Pharmaceuticals LLC",
    type: "qualification",
    message: "Probation review scheduled for February 2027 after two further delivery cycles.",
    timestamp: "2026-11-13T15:10:00+04:00",
  },
  {
    update_id: "UPD-0410",
    manufacturer_id: "MFR-002",
    manufacturer_name: "Ashvika Oncology Laboratories Ltd",
    type: "logistics",
    message: "Carrier notice: Gulf hub transit times extended by 2 days.",
    timestamp: "2026-11-12T11:25:00+04:00",
  },
  {
    update_id: "UPD-0409",
    manufacturer_id: "MFR-009",
    manufacturer_name: "Hanseong Biologics Co., Ltd",
    type: "qualification",
    message: "Site audit report received; dossier moved to committee review.",
    timestamp: "2026-11-11T08:05:00+04:00",
  },
  {
    update_id: "UPD-0408",
    manufacturer_id: "MFR-004",
    manufacturer_name: "Zhonghe BioPharm Co., Ltd",
    type: "pricing",
    message: "Quoted price moved 11% below previous tender without notice.",
    timestamp: "2026-11-09T17:48:00+04:00",
  },
  {
    update_id: "UPD-0407",
    manufacturer_id: "MFR-010",
    manufacturer_name: "Sindhu Remedies Ltd",
    type: "inspection",
    message: "Import alert remains in force following re-inspection.",
    timestamp: "2026-11-06T10:30:00+04:00",
  },
];

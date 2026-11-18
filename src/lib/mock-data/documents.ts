/**
 * DEMONSTRATION DOCUMENTS AND ANALYSES — written by hand for the prototype.
 * No NLP model produced these results. The real classifier and clause
 * extractor run in the Python backend.
 */
import type { DocumentAnalysis, DocumentRecord } from "@/types";

export const MOCK_MODEL_VERSION = "mock-provider (no model)";

export const mockDocuments: DocumentRecord[] = [
  {
    document_id: "DOC-1042",
    file_name: "FDA_Warning_Letter_Sindhu_Remedies_2025.pdf",
    document_type: "warning_letter",
    manufacturer_name: "Sindhu Remedies Ltd",
    size_bytes: 482_300,
    page_count: 9,
    uploaded_at: "2026-11-10T10:14:00+04:00",
    uploaded_by: "Layla Haddad",
    analysis_status: "analysed",
  },
  {
    document_id: "DOC-1041",
    file_name: "Supply_Agreement_Norvane_2026-2028.pdf",
    document_type: "supply_contract",
    manufacturer_name: "Norvane Sterile Injectables GmbH",
    size_bytes: 1_204_800,
    page_count: 34,
    uploaded_at: "2026-11-08T14:32:00+04:00",
    uploaded_by: "Omar Al Suwaidi",
    analysis_status: "analysed",
  },
  {
    document_id: "DOC-1039",
    file_name: "FDA_Warning_Letter_Zhonghe_BioPharm_2024.pdf",
    document_type: "warning_letter",
    manufacturer_name: "Zhonghe BioPharm Co., Ltd",
    size_bytes: 395_100,
    page_count: 7,
    uploaded_at: "2026-11-05T09:03:00+04:00",
    uploaded_by: "Layla Haddad",
    analysis_status: "analysed",
  },
  {
    document_id: "DOC-1037",
    file_name: "Supply_Agreement_Ashvika_Oncology_2026.pdf",
    document_type: "supply_contract",
    manufacturer_name: "Ashvika Oncology Laboratories Ltd",
    size_bytes: 968_400,
    page_count: 28,
    uploaded_at: "2026-11-03T16:47:00+04:00",
    uploaded_by: "Omar Al Suwaidi",
    analysis_status: "analysed",
  },
];

const analyses: Record<string, DocumentAnalysis> = {
  "DOC-1042": {
    document_id: "DOC-1042",
    analysed_at: "2026-11-10T10:16:00+04:00",
    model_version: MOCK_MODEL_VERSION,
    summary:
      "Warning letter citing significant CGMP deviations in aseptic processing, laboratory data integrity and quality unit oversight at a sterile injectables facility.",
    compliance_risk_score: 0.88,
    contract_risk_score: null,
    violations: [
      {
        category: "sterility",
        severity: "critical",
        confidence: 0.96,
        excerpt:
          "Your firm failed to establish and follow appropriate written procedures designed to prevent microbiological contamination of drug products purporting to be sterile.",
        page: 2,
        reference: "21 CFR 211.113(b)",
      },
      {
        category: "data_integrity",
        severity: "critical",
        confidence: 0.93,
        excerpt:
          "Our investigators observed that analysts deleted chromatographic sequences and re-injected samples without documented justification.",
        page: 4,
        reference: "21 CFR 211.68(b)",
      },
      {
        category: "quality_unit",
        severity: "high",
        confidence: 0.89,
        excerpt:
          "Your quality unit failed to exercise its responsibility to ensure drug products are in compliance with CGMP and meet established specifications.",
        page: 5,
        reference: "21 CFR 211.22",
      },
      {
        category: "process_validation",
        severity: "moderate",
        confidence: 0.74,
        excerpt:
          "Media fill simulations did not represent worst-case conditions, including maximum fill duration and personnel interventions.",
        page: 3,
        reference: "21 CFR 211.100(a)",
      },
    ],
    clauses: [],
    preview_paragraphs: [
      "WARNING LETTER",
      "The U.S. Food and Drug Administration inspected your drug manufacturing facility. This warning letter summarizes significant violations of Current Good Manufacturing Practice (CGMP) regulations for finished pharmaceuticals.",
      "1. Your firm failed to establish and follow appropriate written procedures designed to prevent microbiological contamination of drug products purporting to be sterile.",
      "Media fill simulations did not represent worst-case conditions, including maximum fill duration and personnel interventions.",
      "2. Our investigators observed that analysts deleted chromatographic sequences and re-injected samples without documented justification.",
      "3. Your quality unit failed to exercise its responsibility to ensure drug products are in compliance with CGMP and meet established specifications.",
      "Until you correct all violations completely and we confirm your compliance with CGMP, FDA may withhold approval of any new applications listing your firm as a drug manufacturer.",
    ],
  },
  "DOC-1039": {
    document_id: "DOC-1039",
    analysed_at: "2026-11-05T09:05:00+04:00",
    model_version: MOCK_MODEL_VERSION,
    summary:
      "Warning letter focused on laboratory data integrity controls and inadequate investigation of sterility test failures.",
    compliance_risk_score: 0.64,
    contract_risk_score: null,
    violations: [
      {
        category: "data_integrity",
        severity: "high",
        confidence: 0.91,
        excerpt:
          "Laboratory records did not include complete data derived from all tests necessary to assure compliance with established specifications.",
        page: 2,
        reference: "21 CFR 211.194(a)",
      },
      {
        category: "sterility",
        severity: "high",
        confidence: 0.84,
        excerpt: "Your firm did not thoroughly investigate sterility test failures or extend investigations to other batches.",
        page: 3,
        reference: "21 CFR 211.192",
      },
      {
        category: "quality_unit",
        severity: "moderate",
        confidence: 0.71,
        excerpt: "Batch release decisions were made before investigations into deviations were closed.",
        page: 5,
        reference: "21 CFR 211.22(a)",
      },
    ],
    clauses: [],
    preview_paragraphs: [
      "WARNING LETTER",
      "This letter summarizes significant violations of CGMP regulations observed during the inspection of your sterile drug manufacturing facility.",
      "1. Laboratory records did not include complete data derived from all tests necessary to assure compliance with established specifications.",
      "2. Your firm did not thoroughly investigate sterility test failures or extend investigations to other batches.",
      "3. Batch release decisions were made before investigations into deviations were closed.",
      "We recommend engaging a consultant qualified in data integrity remediation to assist your firm in meeting CGMP requirements.",
    ],
  },
  "DOC-1041": {
    document_id: "DOC-1041",
    analysed_at: "2026-11-08T14:35:00+04:00",
    model_version: MOCK_MODEL_VERSION,
    summary:
      "Three-year supply agreement with balanced terms. Force majeure is narrowly drafted, lead times are firm, and no exclusivity is imposed on the purchaser.",
    compliance_risk_score: null,
    contract_risk_score: 0.22,
    violations: [],
    clauses: [
      {
        type: "force_majeure",
        detected: true,
        risk: "low",
        excerpt:
          "Neither party shall be liable for failure to perform caused by events beyond its reasonable control, excluding shortages of raw materials foreseeable at the Effective Date.",
        page: 21,
        interpretation: "Narrow definition. Foreseeable API shortages are excluded, which protects the purchaser.",
      },
      {
        type: "lead_time",
        detected: true,
        risk: "low",
        excerpt:
          "Supplier shall deliver each firm order within twenty-one (21) calendar days of order confirmation, DAP Jebel Ali.",
        page: 9,
        interpretation: "Firm 21-day lead time with a defined Incoterm and destination.",
      },
      {
        type: "penalty",
        detected: true,
        risk: "moderate",
        excerpt:
          "For each full week of delay, Supplier shall credit Purchaser one percent (1%) of the delayed order value, capped at five percent (5%).",
        page: 12,
        interpretation: "Late-delivery credit exists, but the 5% cap limits recovery for extended delays.",
      },
      {
        type: "single_source",
        detected: false,
        risk: "low",
        excerpt: "No exclusivity or minimum purchase commitment identified.",
        page: null,
        interpretation: "The purchaser remains free to dual-source this product.",
      },
    ],
    preview_paragraphs: [
      "PHARMACEUTICAL SUPPLY AGREEMENT",
      "This Supply Agreement is entered into between the Supplier and the Purchaser for the supply of Carboplatin Injection 10 mg/mL.",
      "5.2 Delivery. Supplier shall deliver each firm order within twenty-one (21) calendar days of order confirmation, DAP Jebel Ali.",
      "7.1 Late Delivery. For each full week of delay, Supplier shall credit Purchaser one percent (1%) of the delayed order value, capped at five percent (5%).",
      "14.1 Force Majeure. Neither party shall be liable for failure to perform caused by events beyond its reasonable control, excluding shortages of raw materials foreseeable at the Effective Date.",
      "16. Non-Exclusivity. Nothing in this Agreement restricts Purchaser from procuring the Product from other sources.",
    ],
  },
  "DOC-1037": {
    document_id: "DOC-1037",
    analysed_at: "2026-11-03T16:50:00+04:00",
    model_version: MOCK_MODEL_VERSION,
    summary:
      "Supply agreement with supplier-favourable terms: a broad force majeure definition, indicative lead times and a minimum purchase commitment that constrains dual sourcing.",
    compliance_risk_score: null,
    contract_risk_score: 0.67,
    violations: [],
    clauses: [
      {
        type: "force_majeure",
        detected: true,
        risk: "high",
        excerpt:
          "Force Majeure includes, without limitation, shortages of raw materials, transport disruption, port congestion and regulatory action affecting the Supplier.",
        page: 18,
        interpretation:
          "Very broad. Transport disruption and regulatory action are excused, covering exactly the events a Hormuz crisis would cause.",
      },
      {
        type: "lead_time",
        detected: true,
        risk: "high",
        excerpt: "Delivery dates are estimates only and time shall not be of the essence.",
        page: 8,
        interpretation: "Lead times are not binding, so late delivery is not a breach.",
      },
      {
        type: "penalty",
        detected: false,
        risk: "moderate",
        excerpt: "No liquidated damages or service credit for late delivery identified.",
        page: null,
        interpretation: "There is no financial remedy for delayed shipments.",
      },
      {
        type: "single_source",
        detected: true,
        risk: "high",
        excerpt:
          "Purchaser shall procure not less than eighty percent (80%) of its annual requirements of the Product from Supplier.",
        page: 6,
        interpretation: "An 80% minimum conflicts with the 70% primary supplier cap and prevents effective dual sourcing.",
      },
    ],
    preview_paragraphs: [
      "MASTER SUPPLY AGREEMENT",
      "This Agreement governs the supply of oncology injectable products by the Supplier to the Purchaser.",
      "3.4 Minimum Commitment. Purchaser shall procure not less than eighty percent (80%) of its annual requirements of the Product from Supplier.",
      "4.3 Delivery. Delivery dates are estimates only and time shall not be of the essence.",
      "12.1 Force Majeure includes, without limitation, shortages of raw materials, transport disruption, port congestion and regulatory action affecting the Supplier.",
      "12.3 The affected party shall be excused from performance for the duration of the Force Majeure event.",
    ],
  },
};

export function getMockAnalysis(documentId: string): DocumentAnalysis | null {
  return analyses[documentId] ?? null;
}

/**
 * Result attached to files uploaded during a demo session. The same canned
 * template is returned for every upload of a given type — the uploaded file's
 * contents are never read or analysed.
 */
export function buildSimulatedUploadAnalysis(document: DocumentRecord): DocumentAnalysis {
  const template = document.document_type === "warning_letter" ? analyses["DOC-1039"] : analyses["DOC-1037"];
  return {
    ...template,
    document_id: document.document_id,
    analysed_at: document.uploaded_at,
    summary: `Simulated result. The contents of “${document.file_name}” were not read: this is a canned ${
      document.document_type === "warning_letter" ? "warning-letter" : "contract"
    } template returned by the mock provider to demonstrate the interface.`,
    preview_paragraphs: [],
  };
}

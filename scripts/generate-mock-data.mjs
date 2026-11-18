/**
 * PharmaShield GCC — DEMONSTRATION DATA GENERATOR
 * ------------------------------------------------------------------
 * This script is NOT part of the application and is NOT the team's model.
 *
 * It produces the static JSON the frontend serves while
 * NEXT_PUBLIC_USE_MOCK_DATA=true. To keep the demo numbers internally
 * consistent (ranks agree with scores, scores react to the weights), it runs
 * a textbook TOPSIS over a FICTIONAL supplier matrix. Every value it emits is
 * illustrative. The real TOPSIS / SHAP / LP outputs come from the Python
 * backend and replace this file's output entirely.
 *
 * Run:  node scripts/generate-mock-data.mjs
 * Out:  src/lib/mock-data/generated/mock-scenarios.json
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CRITERIA = [
  "C1_landed_cost",
  "C2_delivery_risk",
  "C3_price_integrity",
  "C4_compliance_risk",
  "C5_route_exposure",
];

// Weights as specified in the implementation plan (Tier 1 AHP baseline and scenario shifts).
const WEIGHTS = {
  normal: [0.1, 0.3, 0.05, 0.3, 0.25],
  hormuz_crisis: [0.0, 0.3, 0.05, 0.3, 0.35],
  cost_focus: [0.2, 0.3, 0.05, 0.3, 0.15],
};

const HORMUZ_STRESS_FACTOR = 1.5;
const STRESS_CAP = 1.0;

// Fictional manufacturers. Names are invented so that no fabricated score is
// attributed to a real company.
const MATRIX = [
  ["MFR-001", "Norvane Sterile Injectables GmbH", "Germany", false, "qualified", 6500, 31.4, [0.78, 0.18, 0.12, 0.1, 0.22], 0.2, false, 0],
  ["MFR-002", "Ashvika Oncology Laboratories Ltd", "India", false, "qualified", 9000, 17.9, [0.24, 0.34, 0.21, 0.38, 0.62], 0.55, false, 1],
  ["MFR-003", "Corvell Parenterals Inc.", "United States", false, "qualified", 5000, 35.2, [0.92, 0.22, 0.15, 0.14, 0.18], 0.15, true, 0],
  ["MFR-004", "Zhonghe BioPharm Co., Ltd", "China", false, "qualified", 12000, 14.6, [0.12, 0.46, 0.44, 0.52, 0.48], 0.35, false, 2],
  ["MFR-005", "Al Rayyan Pharma Industries", "Jordan", false, "qualified", 5000, 20.9, [0.34, 0.23, 0.16, 0.19, 0.3], 0.25, false, 0],
  ["MFR-006", "Deccan Lifecare Injectables Pvt Ltd", "India", true, "probation", 4000, 16.3, [0.18, 0.41, 0.26, 0.47, 0.66], 0.6, false, 1],
  ["MFR-007", "Adriatica Farmaceutici S.p.A.", "Italy", false, "qualified", 4500, 29.6, [0.7, 0.2, 0.1, 0.12, 0.24], 0.2, false, 0],
  ["MFR-008", "Gulf Meridian Pharmaceuticals LLC", "United Arab Emirates", true, "probation", 2000, 27.1, [0.6, 0.15, 0.2, 0.33, 0.08], 0.05, false, 0],
  ["MFR-009", "Hanseong Biologics Co., Ltd", "South Korea", false, "under_review", 5500, 23.9, [0.48, 0.25, 0.14, 0.16, 0.36], 0.3, false, 0],
  ["MFR-010", "Sindhu Remedies Ltd", "India", false, "disqualified", 7000, 13.8, [0.1, 0.63, 0.58, 0.88, 0.64], 0.58, true, 3],
].map(([manufacturer_id, name, country, is_probation, status, capacity, cost, c, hormuz, shortage, oai]) => ({
  manufacturer_id,
  manufacturer_name: name,
  manufacturing_country: country,
  is_probation,
  qualification_status: status,
  monthly_capacity_units: capacity,
  landed_cost_per_unit: cost,
  criteria: c,
  hormuz_air_share: hormuz,
  active_fda_shortage: shortage,
  oai_count_5yr: oai,
}));

const round = (v, dp = 3) => Number(v.toFixed(dp));

function topsis(rows, weights) {
  const norms = CRITERIA.map((_, j) => Math.sqrt(rows.reduce((s, r) => s + r[j] ** 2, 0)) || 1);
  const v = rows.map((r) => r.map((x, j) => (x / norms[j]) * weights[j]));
  // All five criteria are lower-is-better, so the ideal is the column minimum.
  const best = CRITERIA.map((_, j) => Math.min(...v.map((r) => r[j])));
  const worst = CRITERIA.map((_, j) => Math.max(...v.map((r) => r[j])));
  return v.map((r) => {
    const dBest = Math.sqrt(r.reduce((s, x, j) => s + (x - best[j]) ** 2, 0));
    const dWorst = Math.sqrt(r.reduce((s, x, j) => s + (x - worst[j]) ** 2, 0));
    return dWorst / (dBest + dWorst || 1);
  });
}

function overallRisk(row, weights) {
  // Illustrative composite of the four risk criteria (C2–C5); cost is excluded.
  const w = weights.slice(1);
  const total = w.reduce((s, x) => s + x, 0);
  return row.slice(1).reduce((s, x, i) => s + x * w[i], 0) / total;
}

const category = (risk) => (risk < 0.3 ? "low" : risk < 0.5 ? "medium" : "high");

const modes = {};
for (const [mode, weights] of Object.entries(WEIGHTS)) {
  const stressed = mode === "hormuz_crisis";
  const rows = MATRIX.map((m) => {
    const c = [...m.criteria];
    if (stressed) c[4] = Math.min(STRESS_CAP, c[4] * HORMUZ_STRESS_FACTOR);
    return c;
  });
  const scores = topsis(rows, weights);
  const order = scores
    .map((s, i) => ({ s, i }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.i);
  const suppliers = {};
  MATRIX.forEach((m, i) => {
    const risk = overallRisk(rows[i], weights);
    suppliers[m.manufacturer_id] = {
      topsis_score: round(scores[i]),
      rank: order.indexOf(i) + 1,
      overall_risk: round(risk),
      risk_category: category(risk),
      C5_route_exposure_effective: round(rows[i][4]),
    };
  });
  modes[mode] = {
    weights: Object.fromEntries(CRITERIA.map((k, j) => [k, weights[j]])),
    stress: { hormuz_factor: stressed ? HORMUZ_STRESS_FACTOR : 1, cap: STRESS_CAP, applied: stressed },
    suppliers,
  };
}

const out = {
  _notice:
    "DEMONSTRATION DATA — generated by scripts/generate-mock-data.mjs from a fictional supplier matrix. Not model output.",
  sku_id: "CARBO-10MG-ML",
  sku_name: "Carboplatin Injection (10 mg/mL)",
  criticality_tier: 1,
  matrix: MATRIX.map(({ criteria, ...m }) => ({
    ...m,
    ...Object.fromEntries(CRITERIA.map((k, j) => [k, criteria[j]])),
  })),
  modes,
};

const target = resolve(dirname(fileURLToPath(import.meta.url)), "../src/lib/mock-data/generated/mock-scenarios.json");
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, JSON.stringify(out, null, 2) + "\n");

for (const mode of Object.keys(modes)) {
  console.log(`\n${mode}`);
  MATRIX.map((m) => ({ ...m, ...modes[mode].suppliers[m.manufacturer_id] }))
    .sort((a, b) => a.rank - b.rank)
    .forEach((m) =>
      console.log(
        `  ${String(m.rank).padStart(2)}  ${m.topsis_score.toFixed(3)}  risk ${m.overall_risk.toFixed(3)} ${m.risk_category.padEnd(6)}  ${m.qualification_status.padEnd(12)} ${m.manufacturer_name}`,
      ),
    );
}
console.log(`\nWrote ${target}`);

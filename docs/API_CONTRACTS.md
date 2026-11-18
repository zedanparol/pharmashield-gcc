# PharmaShield GCC — Backend API contracts

This document tells the backend team exactly what the frontend expects. If your
endpoint returns JSON in these shapes, the matching module works with no
frontend changes.

- **Source of truth:** [`src/lib/validation/contracts.ts`](../src/lib/validation/contracts.ts) (Zod schemas).
  Every live response is validated against them. A mismatch shows a clear error
  in the UI naming the field that failed, instead of a broken chart.
- **Service layer:** [`src/services/api/`](../src/services/api) — one file per module.
- **Mock equivalents:** [`src/lib/mock-data/`](../src/lib/mock-data) — a working example of every payload.

## Conventions

| Topic | Rule |
| --- | --- |
| Base URL | `NEXT_PUBLIC_API_BASE_URL`, no trailing slash. Paths below are relative to it. |
| Format | JSON, UTF-8. `Content-Type: application/json` (except the document upload, which is `multipart/form-data`). |
| Field names | `snake_case`, identical to `data/processed/suppliers_matrix.csv`. |
| Criteria `C1`–`C5` | Floats in `[0, 1]`. **Lower is better** for all five. |
| `topsis_score` | Float in `[0, 1]`. **Higher is better.** Never a risk score. |
| `overall_risk` | Float in `[0, 1]`. Lower is better. |
| Percentages | Fields ending `_pct` are `0–100`. Fields without the suffix (rates, shares, weights) are `0–1`. |
| Dates | ISO 8601. Timestamps with offset (`2026-11-14T08:30:00+04:00`); dates as `YYYY-MM-DD`; months as `YYYY-MM`. |
| Booleans | `true`/`false`. The frontend also accepts `1`/`0` and `"True"`/`"False"` as exported by pandas. |
| `shap_top3_reasons` | JSON array of 3 strings. A single string delimited by `;` or `|` is also accepted. |
| Errors | Any non-2xx status is shown as an error state with a retry button. |
| CORS | The backend must allow the frontend origin (the Vercel domain and `http://localhost:3000`). |

### Enumerations

| Name | Values |
| --- | --- |
| `mode` (scenario) | `normal`, `hormuz_crisis`, `cost_focus` |
| `risk_category` | `low`, `medium`, `high` |
| `qualification_status` | `qualified`, `probation`, `under_review`, `disqualified` |
| `severity` | `critical`, `high`, `moderate`, `low`, `unclassified` |
| allocation `role` | `primary`, `secondary`, `probation`, `backup` |
| inspection `classification` | `NAI`, `VAI`, `OAI` |

### `suppliers_matrix.csv` → API mapping

Each CSV column is passed through unchanged. The API adds the scenario-specific
scoring outputs.

| CSV column | Type | Notes |
| --- | --- | --- |
| `sku_id` | string | e.g. `CARBO-10MG-ML` |
| `criticality_tier` | int | `1` for Carboplatin |
| `manufacturer_id` | string | Stable key used in URLs |
| `labeler_name_fda` | string | |
| `manufacturing_country` | string | |
| `is_probation` | bool | |
| `monthly_capacity_units` | number | Vials per month |
| `C1_landed_cost` … `C5_route_exposure` | float 0–1 | Normalised, lower is better |
| `hormuz_air_share` | float 0–1 | |
| `active_fda_shortage` | bool | |
| `oai_count_5yr` | int | |
| `shap_top3_reasons` | string[] | |

Added by the API: `manufacturer_name`, `qualification_status`, `topsis_score`,
`rank`, `overall_risk`, `risk_category`, `landed_cost_per_unit`, `currency`.

---

## Health

### `GET /health`

```json
{ "status": "ok", "version": "0.3.1" }
```

`version` is optional. Used by the status indicator in the top bar and the
**Test connection** button in Settings.

---

## Supplier Intelligence

### `GET /suppliers?sku_id={sku}&mode={mode}`

Returns the scored supplier matrix for one scenario, as an array.

```json
[
  {
    "sku_id": "CARBO-10MG-ML",
    "criticality_tier": 1,
    "manufacturer_id": "MFR-001",
    "manufacturer_name": "Example Sterile Injectables GmbH",
    "labeler_name_fda": "Example Sterile Injectables GmbH",
    "manufacturing_country": "Germany",
    "is_probation": false,
    "qualification_status": "qualified",
    "monthly_capacity_units": 6500,
    "C1_landed_cost": 0.78,
    "C2_delivery_risk": 0.18,
    "C3_price_integrity": 0.12,
    "C4_compliance_risk": 0.10,
    "C5_route_exposure": 0.22,
    "hormuz_air_share": 0.20,
    "active_fda_shortage": false,
    "oai_count_5yr": 0,
    "shap_top3_reasons": ["No OAI outcomes in 5 years", "97% on-time delivery", "Low Gulf air share"],
    "topsis_score": 0.829,
    "rank": 1,
    "overall_risk": 0.161,
    "risk_category": "low",
    "landed_cost_per_unit": 31.4,
    "currency": "USD"
  }
]
```

`C5_route_exposure` here is always the **baseline** matrix value. The stressed
value for Hormuz Crisis Mode is reported by `/simulation`.

### `GET /suppliers/{manufacturer_id}?sku_id={sku}&mode={mode}`

Everything in the list item above, plus:

```json
{
  "overview": "EU-GMP sterile injectables manufacturer …",
  "site_location": "Leipzig, Germany",
  "fda_establishment_id": "FEI 1234567",
  "shap_values": [
    { "feature": "OAI outcomes (5 yr)", "criterion": "C4_compliance_risk", "contribution": -0.092, "value_label": "0" },
    { "feature": "Landed cost per vial", "criterion": "C1_landed_cost", "contribution": 0.041, "value_label": "$31.40" }
  ],
  "regulatory": {
    "last_inspection_date": "2026-03-18",
    "last_inspection_outcome": "NAI",
    "open_warning_letter": false,
    "import_alert": false,
    "certifications": ["EU-GMP", "US FDA registered"],
    "notes": "No open regulatory actions."
  },
  "inspection_history": [
    { "date": "2026-03-18", "agency": "US FDA", "classification": "NAI", "summary": "Routine surveillance inspection." }
  ],
  "active_shortages": [
    { "shortage_id": "SH-001", "drug_name": "Carboplatin Injection", "reason": "Demand increase", "last_updated": "2026-11-09" }
  ],
  "delivery_performance": {
    "on_time_rate": 0.97,
    "avg_lead_time_days": 21,
    "lead_time_variability_days": 2,
    "monthly": [{ "month": "2026-10", "on_time_rate": 0.98, "lead_time_days": 21 }]
  },
  "procurement_suitability": {
    "verdict": "recommended_primary",
    "summary": "Strong candidate for primary allocation.",
    "strengths": ["Clean 5-year inspection record"],
    "concerns": ["Second-highest landed cost"]
  }
}
```

- `shap_values[].contribution` is signed: **positive raises predicted risk, negative lowers it.**
  `criterion` may be `null` for features that do not map to a single criterion.
- `procurement_suitability.verdict` ∈ `recommended_primary`, `recommended_secondary`, `trial_only`, `not_recommended`.
- Return `404` for an unknown `manufacturer_id`.

### `GET /suppliers/updates`

Recent supplier events for the overview feed and notification centre.

```json
[
  {
    "update_id": "UPD-0412",
    "manufacturer_id": "MFR-003",
    "manufacturer_name": "Example Parenterals Inc.",
    "type": "shortage",
    "message": "Shortage listing updated.",
    "timestamp": "2026-11-14T09:42:00+04:00"
  }
]
```

`type` ∈ `inspection`, `qualification`, `shortage`, `pricing`, `logistics`.

---

## Shortage Intelligence

### `GET /shortages`

```json
[
  {
    "shortage_id": "SH-001",
    "drug_name": "Carboplatin Injection",
    "presentation": "10 mg/mL, 45 mL multi-dose vial",
    "manufacturer_name": "Example Parenterals Inc.",
    "status": "active",
    "severity": "critical",
    "reason": "Demand increase for the drug",
    "therapeutic_category": "Oncology",
    "initial_posting_date": "2026-08-17",
    "last_updated": "2026-11-09",
    "availability_note": "Limited supply.",
    "affected_manufacturers": ["Example Parenterals Inc."],
    "regulatory_alerts": [
      { "title": "Shortage listing updated", "agency": "US FDA", "date": "2026-11-09", "type": "notice" }
    ]
  }
]
```

- `status` ∈ `active`, `resolved`.
- `regulatory_alerts[].type` ∈ `recall`, `warning_letter`, `import_alert`, `safety_communication`, `notice`.
- openFDA does not publish a severity. If the backend does not classify one, send `"unclassified"` — the frontend never invents it.

**openFDA option.** Setting `NEXT_PUBLIC_SHORTAGE_SOURCE=openfda` makes the
frontend read `https://api.fda.gov/drug/shortages.json` directly through
[`adapters/openfda.ts`](../src/services/api/adapters/openfda.ts), which maps
openFDA fields (`generic_name`, `company_name`, `status`, `shortage_reason`,
`update_date`, …) onto the shape above. The backend can reuse the same mapping.

### `GET /shortages/trend`

```json
[{ "month": "2026-10", "active": 7, "new": 2, "resolved": 0 }]
```

One row per month, oldest first. `active` is the month-end count.

---

## Crisis Simulator

### `GET /simulation?mode={mode}&sku_id={sku}&monthly_demand_units={n}`

```json
{
  "mode": "hormuz_crisis",
  "sku_id": "CARBO-10MG-ML",
  "generated_at": "2026-11-15T08:00:00+04:00",
  "weights":          { "C1_landed_cost": 0.00, "C2_delivery_risk": 0.30, "C3_price_integrity": 0.05, "C4_compliance_risk": 0.30, "C5_route_exposure": 0.35 },
  "baseline_weights": { "C1_landed_cost": 0.10, "C2_delivery_risk": 0.30, "C3_price_integrity": 0.05, "C4_compliance_risk": 0.30, "C5_route_exposure": 0.25 },
  "stress": { "hormuz_factor": 1.5, "cap": 1.0, "applied": true },
  "rankings": [
    {
      "manufacturer_id": "MFR-003",
      "manufacturer_name": "Example Parenterals Inc.",
      "manufacturing_country": "United States",
      "qualification_status": "qualified",
      "is_probation": false,
      "rank": 1,
      "baseline_rank": 3,
      "topsis_score": 0.878,
      "baseline_topsis_score": 0.800,
      "overall_risk": 0.210,
      "baseline_overall_risk": 0.178,
      "risk_category": "low",
      "baseline_risk_category": "low",
      "C5_route_exposure_baseline": 0.18,
      "C5_route_exposure_effective": 0.27,
      "hormuz_air_share": 0.15
    }
  ],
  "allocation": { "…": "AllocationResult for this mode — see POST /allocation" },
  "baseline_allocation": { "…": "AllocationResult for Normal Mode at the same demand" },
  "explanation": {
    "headline": "Weight moves from cost to route exposure, and exposed corridors are stressed 1.5×.",
    "points": ["Landed cost (C1) drops from 0.10 to 0.00 …"]
  }
}
```

- `baseline_*` always refers to **Normal Mode**. For `mode=normal`, baseline and active values are equal.
- `C5_route_exposure_effective = min(cap, C5_baseline × hormuz_factor)` in Hormuz Crisis Mode; equal to the baseline otherwise.
- `explanation` is displayed verbatim in the "Why the ranking and allocation changed" panel.

Weights the frontend displays (from the implementation plan):

| Criterion | Normal | Hormuz Crisis | Cost Focus |
| --- | --- | --- | --- |
| C1 Landed Cost | 0.10 | 0.00 | 0.20 |
| C2 Delivery Disruption Risk | 0.30 | 0.30 | 0.30 |
| C3 Price Integrity Risk | 0.05 | 0.05 | 0.05 |
| C4 Compliance & Contract Risk | 0.30 | 0.30 | 0.30 |
| C5 Geopolitical & Route Exposure | 0.25 | 0.35 | 0.15 |

---

## Order Allocation

### `POST /allocation`

Request:

```json
{ "sku_id": "CARBO-10MG-ML", "mode": "normal", "monthly_demand_units": 10000 }
```

Response (`AllocationResult`):

```json
{
  "sku_id": "CARBO-10MG-ML",
  "sku_name": "Carboplatin Injection (10 mg/mL)",
  "mode": "normal",
  "monthly_demand_units": 10000,
  "currency": "USD",
  "generated_at": "2026-11-15T08:00:00+04:00",
  "solver": { "engine": "PuLP/CBC", "status": "optimal", "note": "Solved in 0.04 s." },
  "lines": [
    {
      "manufacturer_id": "MFR-001",
      "manufacturer_name": "Example Sterile Injectables GmbH",
      "manufacturing_country": "Germany",
      "role": "primary",
      "allocated_units": 6500,
      "allocation_pct": 65.0,
      "monthly_capacity_units": 6500,
      "capacity_utilisation_pct": 100.0,
      "landed_cost_per_unit": 31.4,
      "risk_adjusted_cost_per_unit": 36.46,
      "line_cost": 204100,
      "overall_risk": 0.161
    }
  ],
  "spot_buy": { "units": 0, "unit_cost": 0, "cost": 0 },
  "totals": {
    "allocated_units": 10000,
    "total_cost": 305700,
    "risk_adjusted_total_cost": 356990,
    "avg_unit_cost": 30.57,
    "weighted_risk": 0.168,
    "backup_coverage_pct": 35.0
  },
  "constraints": [
    { "id": "primary_cap", "label": "Primary supplier ≤ 70% of demand", "satisfied": true, "detail": "Primary holds 65.0%." }
  ]
}
```

- `solver.status` ∈ `optimal`, `feasible`, `infeasible`, `mock`. `solver.engine` is shown in the procurement summary.
- `totals.backup_coverage_pct` = share of demand allocated to non-primary suppliers.
- `spot_buy` covers demand that exceeds eligible plant capacity. Send zeros when not needed.
- `constraints` is a free list; the frontend renders every item with a pass/fail mark. Suggested ids:
  `primary_cap` (≤ 70%), `probation_band` (5–10%), `min_manufacturers` (≥ 2 qualified, Tier 1),
  `capacity`, `demand_covered`.

---

## Document Intelligence

### `GET /documents`

```json
[
  {
    "document_id": "DOC-1042",
    "file_name": "FDA_Warning_Letter_Example_2025.pdf",
    "document_type": "warning_letter",
    "manufacturer_name": "Example Remedies Ltd",
    "size_bytes": 482300,
    "page_count": 9,
    "uploaded_at": "2026-11-10T10:14:00+04:00",
    "uploaded_by": "Layla Haddad",
    "analysis_status": "analysed"
  }
]
```

- `document_type` ∈ `warning_letter`, `supply_contract`.
- `analysis_status` ∈ `queued`, `processing`, `analysed`, `failed`. While any document is
  `queued` or `processing`, the frontend re-requests this list every 4 seconds.
- `manufacturer_name` and `page_count` may be `null`.

### `POST /documents` (`multipart/form-data`)

Fields: `file` (PDF, ≤ 20 MB), `document_type`. Returns one document object
(as above) with `analysis_status: "queued"`.

### `GET /documents/{document_id}/analysis`

```json
{
  "document_id": "DOC-1042",
  "analysed_at": "2026-11-10T10:16:00+04:00",
  "model_version": "cgmp-classifier-1.2",
  "summary": "Warning letter citing significant CGMP deviations …",
  "compliance_risk_score": 0.88,
  "contract_risk_score": null,
  "violations": [
    {
      "category": "sterility",
      "severity": "critical",
      "confidence": 0.96,
      "excerpt": "Your firm failed to establish and follow appropriate written procedures …",
      "page": 2,
      "reference": "21 CFR 211.113(b)"
    }
  ],
  "clauses": [
    {
      "type": "force_majeure",
      "detected": true,
      "risk": "high",
      "excerpt": "Force Majeure includes, without limitation, …",
      "page": 18,
      "interpretation": "Very broad definition."
    }
  ],
  "preview_paragraphs": ["WARNING LETTER", "The U.S. Food and Drug Administration inspected …"]
}
```

- `violations[].category` ∈ `sterility`, `data_integrity`, `process_validation`, `quality_unit`.
- `clauses[].type` ∈ `force_majeure`, `lead_time`, `penalty`, `single_source`. `page` is `null` when `detected` is `false`.
- Warning letters set `compliance_risk_score` and leave `contract_risk_score` `null`; contracts do the reverse.
- `preview_paragraphs` is optional text for the in-app preview (send `[]` to skip). Excerpts that appear
  verbatim inside a paragraph are highlighted.

---

## Governance and Audit Trail

**The frontend never places an order.** These endpoints record review items and
decisions only.

### `GET /recommendations`

```json
[
  {
    "recommendation_id": "REC-2026-1114",
    "created_at": "2026-11-14T08:30:00+04:00",
    "status": "pending",
    "sku_id": "CARBO-10MG-ML",
    "sku_name": "Carboplatin Injection (10 mg/mL)",
    "mode": "normal",
    "monthly_demand_units": 10000,
    "primary_manufacturer_id": "MFR-001",
    "primary_manufacturer_name": "Example Sterile Injectables GmbH",
    "rationale": "Top-ranked eligible manufacturer for this scenario …",
    "shap_summary": ["No OAI outcomes in 5 years", "97% on-time delivery", "Low Gulf air share"],
    "current_allocation":  [{ "manufacturer_id": "MFR-001", "manufacturer_name": "…", "role": "primary", "allocation_pct": 60, "allocated_units": 6000 }],
    "proposed_allocation": [{ "manufacturer_id": "MFR-001", "manufacturer_name": "…", "role": "primary", "allocation_pct": 65, "allocated_units": 6500 }],
    "total_cost": 305700,
    "currency": "USD"
  }
]
```

`status` ∈ `pending`, `approved`, `overridden`, `rejected`. Only `pending` items show review buttons.

### `POST /recommendations`

Sends the allocation on screen into the review queue. Returns the new recommendation.

```json
{ "mode": "normal", "monthly_demand_units": 10000, "user": { "name": "Layla Haddad", "role": "Procurement Manager" } }
```

### `GET /audit`

Array of audit events, **newest first**.

```json
[
  {
    "event_id": "AUD-00219",
    "timestamp": "2026-11-15T09:12:00+04:00",
    "user": { "name": "Layla Haddad", "role": "Procurement Manager" },
    "action": "overridden",
    "supplier": "Example Sterile Injectables GmbH",
    "previous_allocation": [{ "manufacturer_id": "MFR-001", "manufacturer_name": "…", "role": "primary", "allocation_pct": 65, "allocated_units": 6500 }],
    "new_allocation":      [{ "manufacturer_id": "MFR-001", "manufacturer_name": "…", "role": "primary", "allocation_pct": 60, "allocated_units": 6000 }],
    "reason": "Shift volume to the secondary supplier.",
    "scenario_mode": "normal",
    "recommendation_id": "REC-2026-1114"
  }
]
```

`action` ∈ `recommendation_generated`, `submitted_for_review`, `approved`, `overridden`,
`rejected`, `scenario_changed`, `demand_updated`, `document_analysed`.
`supplier`, `previous_allocation`, `new_allocation`, `reason` and `recommendation_id` may be `null`.

### `POST /audit/decisions`

Records a human decision. Request:

```json
{
  "recommendation_id": "REC-2026-1114",
  "decision": "override",
  "reason": "Shift volume to the secondary supplier.",
  "override_allocation": [{ "manufacturer_id": "MFR-001", "manufacturer_name": "…", "role": "primary", "allocation_pct": 60, "allocated_units": 6000 }],
  "user": { "name": "Layla Haddad", "role": "Procurement Manager" }
}
```

- `decision` ∈ `approve`, `override`, `reject`.
- `reason` is required by the UI for `override` and `reject` (≥ 15 characters) and optional for `approve` (`null` allowed).
- `override_allocation` is `null` unless `decision` is `override`. The UI enforces shares totalling 100% and no supplier above 70%.

Response:

```json
{ "recommendation": { "…": "updated recommendation" }, "audit_event": { "…": "the event that was written" } }
```

### `POST /audit/events`

Records a non-decision event (scenario change, demand change, document analysed).
Body is an audit event without `event_id` and `timestamp`; the response is the stored event.

---

## Endpoint summary

| Module | Method | Path | Service function |
| --- | --- | --- | --- |
| Health | GET | `/health` | `getHealth` |
| Suppliers | GET | `/suppliers` | `getSuppliers` |
| Suppliers | GET | `/suppliers/{manufacturer_id}` | `getSupplierDetail` |
| Suppliers | GET | `/suppliers/updates` | `getSupplierUpdates` |
| Shortages | GET | `/shortages` | `getShortages` |
| Shortages | GET | `/shortages/trend` | `getShortageTrend` |
| Simulator | GET | `/simulation` | `getSimulation` |
| Allocation | POST | `/allocation` | `getAllocation` |
| Documents | GET | `/documents` | `getDocuments` |
| Documents | POST | `/documents` | `uploadDocument` |
| Documents | GET | `/documents/{document_id}/analysis` | `getDocumentAnalysis` |
| Governance | GET | `/recommendations` | `getRecommendations` |
| Governance | POST | `/recommendations` | `submitForReview` |
| Audit | GET | `/audit` | `getAuditEvents` |
| Audit | POST | `/audit/decisions` | `submitDecision` |
| Audit | POST | `/audit/events` | `recordAuditEvent` |

## Connecting a module

1. Implement the endpoint so its JSON matches the shape above.
2. In `.env.local`, set `NEXT_PUBLIC_USE_MOCK_DATA=false` and `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`.
3. Run `npm run dev` and open the module. A contract mismatch appears as an error
   naming the field, e.g. `suppliers.0.topsis_score: expected number`.

Mock mode is all-or-nothing today. If the team wants to bring modules live one
at a time, the switch lives in one place — `resolve()` in
[`src/services/api/client.ts`](../src/services/api/client.ts) — and can be extended to a per-module flag.

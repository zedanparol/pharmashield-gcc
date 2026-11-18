# PharmaShield GCC — Frontend

Pharmaceutical procurement intelligence for a UAE healthcare group purchasing
organisation: supplier selection, multi-source risk profiling and dual-source
order allocation for **Carboplatin Injection (10 mg/mL)**.

This repository is the **frontend only**. It is a Next.js application designed
for Vercel that talks to a separately hosted Python backend. Until that backend
exists, every module runs on clearly labelled demonstration data.

> University research prototype. Not for clinical or procurement use.

---

## Status

| Area | State |
| --- | --- |
| All seven modules + login + settings | Implemented, working on mock data |
| Production build (`npm run build`) | Passes |
| Lint and type-check | Clean |
| Backend integration | Contracts defined and validated; **no backend connected yet** |
| Authentication | **Prototype only** — no auth service is integrated |
| Vercel deployment | Prepared; **not yet deployed** |

## Quick start

Requires Node.js 20.9 or newer.

```bash
npm install
```

```bash
cp .env.example .env.local
```

```bash
npm run dev
```

Open <http://localhost:3000> and choose **Continue with demo account**.

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build (also type-checks) |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `node scripts/generate-mock-data.mjs` | Regenerate the demonstration scenario data |

## Modules

| Route | Module | What it shows |
| --- | --- | --- |
| `/login` | Authentication | Sign-in form, password toggle, remember me, forgot password, demo access |
| `/dashboard` | Executive Overview | Data-composed headline, six metrics, supply-network map, priority alerts, ranking and risk matrix, proposed allocation, shortage trend, decision log |
| `/suppliers` | Supplier Intelligence | TOPSIS score distribution, sortable and filterable scorecard with heat cells, quick-look side panel |
| `/suppliers/[id]` | Supplier dossier | Assessment, five risk dimensions on one ruler, SHAP explanation, pool comparison, delivery, regulatory record, inspections |
| `/shortages` | Shortage Intelligence | Critical alert, severity ladder (click to filter), alert monitor, detail drawer, trend, records by manufacturer, openFDA adapter |
| `/simulator` | Crisis Simulation Centre | Normal / Hormuz Crisis / Cost Focus console, explanation, rank-shift chart, weight transfer, route-exposure map |
| `/allocation` | Order Allocation | Demand input, demand-to-supplier flow, cost build-up, capacity bars, constraint check, scenario comparison |
| `/documents` | Document Intelligence | PDF upload, analysis progress, document sheet beside findings, report download |
| `/audit` | Governance & Audit | Approval queue with current-versus-proposed change table, approve / override / reject with reasons, audit log, CSV export |
| `/settings` | Settings | Data source, connection test, theme, workspace defaults |

The active scenario and monthly demand are shared across modules: switching to
Hormuz Crisis Mode in the simulator re-ranks the scorecard, the overview and the
allocation as well.

## Design system

The interface is the **PharmaShield Intelligence System**. Tokens live in
`src/app/globals.css`; shared building blocks are in `src/components/shared/`
and `src/components/charts/`.

- **Three type voices.** IBM Plex Serif for headlines and findings, IBM Plex
  Sans for interface and body copy, IBM Plex Mono for every figure, label and
  identifier (`display`, `eyebrow`, `figure` and `tabular` utilities).
- **Two themes.** Graphite (default) and Paper (warm off-white). Navigation
  chrome stays graphite in both. Surfaces are flat and separated by hairline
  rules rather than shadows.
- **Reserved colour.** Blue for interaction and TOPSIS, cyan for routes,
  emerald / amber / red for status only, always with a label or glyph.
- **Two score forms.** TOPSIS (higher is better) is always a blue needle bar;
  risk and criteria C1–C5 (lower is better) are always cells or heat cells, so
  the two scales cannot be confused.
- **Motion.** Framer Motion, wrapped in `MotionConfig reducedMotion="user"`,
  plus a CSS reduced-motion rule.
- **Supply-network map.** `src/lib/geo/world-dots.ts` is a generated
  dot-matrix land mask (Natural Earth 1:110m, public domain). Regenerate it
  with `node scripts/generate-world-dots.mjs <path>/land-110m.json` from the
  `world-atlas` npm package; the dataset is not a project dependency.
  Manufacturers are placed by `manufacturing_country` using
  `src/lib/geo/countries.ts`. Links to the UAE are schematic, not shipping
  lanes.

## Technology

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript (strict) · Tailwind
CSS 4 · shadcn/ui (Radix) · Lucide · Recharts 3 · Framer Motion · TanStack
Table 9 · React Hook Form + Zod 4 · Zustand · Fetch API.

## Architecture

```
src/
├── app/                      Routes only — each page renders one view component
│   ├── (auth)/login/
│   └── (app)/                Authenticated shell: dashboard, suppliers, shortages,
│                             simulator, allocation, documents, audit, settings
├── components/
│   ├── ui/                   shadcn/ui primitives
│   ├── shared/               Panel, KpiCard, badges, meters, states
│   ├── charts/               Recharts wrappers with one tooltip/legend style
│   ├── layout/               App shell, sidebar, top bar, search, notifications
│   └── <module>/             One folder per module
├── services/api/             The only place the UI reads or writes data
│   ├── config.ts             Environment switches
│   ├── client.ts             resolve(): mock ↔ live, timeout, contract validation
│   ├── adapters/openfda.ts   openFDA → Shortage mapping
│   └── suppliers.ts, shortages.ts, simulation.ts, allocation.ts, documents.ts, audit.ts
├── lib/
│   ├── validation/contracts.ts   Zod schemas = the backend contract
│   ├── validation/forms.ts       Form schemas
│   ├── mock-data/                Demonstration data and mock providers
│   ├── constants.ts              Criteria, scenario weights, allocation rules
│   └── utils/                    Formatting and risk presentation helpers
├── hooks/                    useApi, useScenario, useHydrated
├── stores/                   Zustand: session, scenario, demand, sidebar
└── types/                    Types inferred from the Zod contracts
docs/API_CONTRACTS.md         Endpoint-by-endpoint contract for the backend team
scripts/generate-mock-data.mjs
```

### Division of responsibility

| Frontend (this repo) | Backend (Python, hosted separately) |
| --- | --- |
| Presentation, navigation, interaction | ML risk predictions and SHAP values |
| Input collection and validation | TOPSIS scoring and ranking |
| API communication and contract checking | LP optimisation (PuLP) for allocation |
| Loading, empty and error states | NLP classification and clause extraction |

No model calculation lives in the UI. Components display what the service layer
returns and only do presentation arithmetic (counts, averages, formatting).

## Mock and live data

One switch controls where data comes from:

| Variable | Default | Meaning |
| --- | --- | --- |
| `NEXT_PUBLIC_USE_MOCK_DATA` | `true` | `true` = demonstration data, no backend needed. `false` = call the backend. |
| `NEXT_PUBLIC_API_BASE_URL` | — | Backend base URL, no trailing slash. Required when mock mode is off. |
| `NEXT_PUBLIC_SHORTAGE_SOURCE` | `backend` | `openfda` reads shortages straight from api.fda.gov through the adapter. |

Every service function returns `{ data, meta }`. `meta.source` is `"mock"` or
`"live"`, and each panel shows a **Demo data** or **Live** badge from it, so
demonstration values can never be mistaken for model output.

In live mode each response is validated against its Zod contract. A mismatch
produces an error naming the field, with a retry button.

**For teammates:** read [`docs/API_CONTRACTS.md`](docs/API_CONTRACTS.md). If your
endpoint returns JSON in that shape, the matching module works without any
frontend change.

### What the demonstration data is — and is not

- **Manufacturers are fictional.** Names are invented so that no fabricated
  score, inspection outcome or shortage is attributed to a real company. Real
  FDA labeler names arrive with the backend.
- **Scores are illustrative.** `scripts/generate-mock-data.mjs` runs a textbook
  TOPSIS over the fictional matrix so that ranks, scores and weights stay
  consistent in demos. It is not the team's model and not part of the app.
- **Allocation is a labelled heuristic.** `src/lib/mock-data/allocation.ts` is a
  simple greedy fill that respects the plan's rules (70% primary cap, 5–10%
  probation trial, plant capacity). It is reported as `mock-heuristic`, never as
  PuLP, and is replaced by the LP when the backend is connected.
- **Shortage records are invented.** They are not live FDA alerts and are labelled as such.
- **Document analysis is canned.** No NLP runs. Uploaded PDFs stay in the browser,
  are never read, and receive a template result after a simulated delay.
- **Session state is in memory.** Approvals, uploads and audit events created
  during a demo are lost on a full page reload.

Weights, the 1.5× Hormuz stress factor (capped at 1.0) and the allocation rules
are taken from the implementation plan and live in `src/lib/constants.ts`.

## Authentication

There is **no authentication service**. The login screen demonstrates the flow:
any valid email with an 8+ character password, or the demo button, opens a
prototype session stored as a flag in the browser. Credentials are not verified,
stored or transmitted, and the route guard is not a security boundary.

Before real use, add an identity provider (for example Auth.js, Clerk or
Microsoft Entra ID) with server-side route protection.

## Human-in-the-loop

The platform never executes procurement orders. Approve, Override and Reject
write an audit record only; every dialog says so. Overrides and rejections
require a written reason, and an override cannot give any supplier more than
the 70% Tier 1 cap.

## Deploying to Vercel

1. **Push to GitHub.**

   ```bash
   git init
   ```

   ```bash
   git add -A
   ```

   ```bash
   git commit -m "PharmaShield GCC frontend"
   ```

   Create an empty GitHub repository, then add it as `origin` and push `main`.

2. **Import into Vercel.** In Vercel choose *Add New → Project*, select the
   repository, and keep the detected settings (Framework: Next.js, Build:
   `next build`, root directory: repository root).

3. **Set environment variables** under *Project Settings → Environment Variables*:

   | Variable | Production (until the backend is live) |
   | --- | --- |
   | `NEXT_PUBLIC_USE_MOCK_DATA` | `true` |
   | `NEXT_PUBLIC_API_BASE_URL` | leave unset, or the backend URL once it exists |
   | `NEXT_PUBLIC_SHORTAGE_SOURCE` | `backend` |

   `NEXT_PUBLIC_*` values are compiled into the browser bundle. **Never put
   secrets or private API keys in them** — keep those on the backend. Redeploy
   after changing a value.

4. **Deploy.** Every push to `main` creates a production deployment; every pull
   request gets its own **Preview Deployment** URL. Use previews to test changes
   (including different environment variables per environment) before merging.

5. **When the backend is ready:** deploy it separately, allow the Vercel domain
   in its CORS settings, set `NEXT_PUBLIC_API_BASE_URL`, set
   `NEXT_PUBLIC_USE_MOCK_DATA=false`, and redeploy.

`.env.local` and other `.env*` files are git-ignored; only `.env.example` is committed.

## Assumptions made while the backend is pending

| Assumption | Where to change it |
| --- | --- |
| REST + JSON backend with the paths in `docs/API_CONTRACTS.md` | `src/services/api/*.ts` |
| Costs are in USD per vial | `currency` field in each response |
| Times are shown in Gulf Standard Time | `src/lib/utils/format.ts` |
| `overall_risk` and `risk_category` are provided by the backend | `supplierSchema` in `contracts.ts` |
| One SKU (Carboplatin, Tier 1); `sku_id` is already a request parameter | `DEFAULT_SKU` in `constants.ts` |
| Mock mode is all-or-nothing | `resolve()` in `src/services/api/client.ts` |
| A React/Next.js frontend replaces the Streamlit UI in the original plan | — |

## Known limitations

- No automated test suite yet; the interface was verified manually in a browser at desktop and mobile widths.
- Live mode has been exercised only against an unreachable backend (error states); it has not been tested against a real API.
- Global search and notifications read the same service layer, so they show demonstration records in mock mode.
- Charts rely on JavaScript; there is no server-rendered chart fallback.

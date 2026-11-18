"use client";

import { ArrowLeft, CheckCircle2, CircleAlert, CircleCheck, CircleMinus, CircleX, PackageX, ShieldCheck, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ChartLegend } from "@/components/charts/chart-parts";
import { CriteriaRadar, OnTimeLine, ShapChart } from "@/components/charts/charts";
import { QualificationBadge, RiskBadge, ScenarioBadge, ToneBadge } from "@/components/shared/badges";
import { RiskMeter, TopsisMeter } from "@/components/shared/meters";
import { ChartSkeleton, EmptyState, ErrorState, Panel } from "@/components/shared/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";
import { CRITERIA, CRITERION_KEYS, DEFAULT_SKU, SCENARIO_WEIGHTS } from "@/lib/constants";
import { formatCurrency, formatDate, formatNumber, formatRatio, formatScore } from "@/lib/utils/format";
import { toneColor, type Tone } from "@/lib/utils/risk";
import { getSupplierDetail, getSuppliers } from "@/services/api";
import { useWorkspaceStore } from "@/stores/app-store";
import type { InspectionRecord, Supplier, SupplierDetail } from "@/types";
import { CriterionRow } from "./criterion-card";

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function Fact({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="eyebrow text-[9.5px]">{label}</dt>
      <dd className="mt-1 truncate text-[13px] font-medium">{children}</dd>
    </div>
  );
}

const verdicts: Record<SupplierDetail["procurement_suitability"]["verdict"], { label: string; tone: Tone; icon: LucideIcon }> = {
  recommended_primary: { label: "Suitable as primary supplier", tone: "good", icon: CircleCheck },
  recommended_secondary: { label: "Suitable as secondary supplier", tone: "info", icon: CircleCheck },
  trial_only: { label: "Probation trial volumes only", tone: "warning", icon: CircleMinus },
  not_recommended: { label: "Not recommended for allocation", tone: "critical", icon: CircleX },
};

const inspectionTone: Record<InspectionRecord["classification"], Tone> = { NAI: "good", VAI: "warning", OAI: "critical" };
const inspectionMeaning: Record<InspectionRecord["classification"], string> = {
  NAI: "No Action Indicated",
  VAI: "Voluntary Action Indicated",
  OAI: "Official Action Indicated",
};

/** Dossier head: who the manufacturer is on the left, the two headline scores on the right. */
function Dossier({ supplier, poolSize }: { supplier: SupplierDetail; poolSize: number }) {
  return (
    <header className="grid gap-x-10 gap-y-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,27rem)]">
      <div className="min-w-0">
        <p className="eyebrow">
          Supplier dossier · <span className="text-foreground">{supplier.manufacturer_id}</span> · Establishment {supplier.fda_establishment_id}
        </p>
        <h1 className="display mt-2.5 text-[2rem] sm:text-[2.5rem] xl:text-[2.875rem]">{supplier.manufacturer_name}</h1>
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          <QualificationBadge status={supplier.qualification_status} />
          <RiskBadge category={supplier.risk_category} />
          {supplier.active_fda_shortage ? (
            <ToneBadge tone="critical" icon={PackageX}>
              Active FDA shortage
            </ToneBadge>
          ) : null}
        </div>
        <p className="mt-4 max-w-3xl text-[15px] leading-7 text-muted-foreground">{supplier.overview}</p>
      </div>

      <div className="grid grid-cols-2 self-start overflow-hidden rounded-md border border-border bg-card">
        <div className="border-r border-border p-4">
          <p className="eyebrow">
            TOPSIS <span className="text-signal">↑</span> higher is better
          </p>
          <p className="figure mt-3 text-[44px]">{formatScore(supplier.topsis_score)}</p>
          <TopsisMeter value={supplier.topsis_score} bare className="mt-4" />
          <p className="tabular mt-2.5 text-[11px] text-muted-foreground">
            Rank {supplier.rank} of {poolSize} · closeness to the ideal
          </p>
        </div>
        <div className="p-4">
          <p className="eyebrow">Overall risk ↓ lower is better</p>
          <p className="figure mt-3 text-[44px]">{formatScore(supplier.overall_risk)}</p>
          <RiskMeter value={supplier.overall_risk} bare className="mt-4" />
          <p className="mt-2.5 text-[11px] text-muted-foreground">Composite of the risk criteria</p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-8 gap-y-4 border-y border-border py-4 sm:grid-cols-3 xl:col-span-2 xl:grid-cols-6">
        <Fact label="Manufacturing country">{supplier.manufacturing_country}</Fact>
        <Fact label="Site">{supplier.site_location}</Fact>
        <Fact label="FDA labeler">{supplier.labeler_name_fda}</Fact>
        <Fact label="Monthly capacity">
          <span className="tabular">{formatNumber(supplier.monthly_capacity_units)}</span> vials
        </Fact>
        <Fact label="Landed cost">
          <span className="tabular">{formatCurrency(supplier.landed_cost_per_unit, supplier.currency, 2)}</span> per vial
        </Fact>
        <Fact label="SKU · criticality">
          {DEFAULT_SKU.shortName} · Tier {supplier.criticality_tier}
        </Fact>
      </dl>
    </header>
  );
}

function Assessment({ supplier }: { supplier: SupplierDetail }) {
  const verdict = verdicts[supplier.procurement_suitability.verdict];
  return (
    <div className="grid gap-x-10 gap-y-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div>
        <p className="flex items-center gap-2.5 font-serif text-[1.5rem] leading-8 font-light tracking-[-0.015em]">
          <verdict.icon aria-hidden className="size-5 shrink-0" strokeWidth={1.5} style={{ color: toneColor[verdict.tone] }} />
          {verdict.label}
        </p>
        <p className="mt-2.5 text-sm leading-6 text-muted-foreground">{supplier.procurement_suitability.summary}</p>
      </div>
      <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        <div>
          <p className="eyebrow border-b border-border pb-1.5">Strengths</p>
          <ul className="mt-2 space-y-1.5">
            {supplier.procurement_suitability.strengths.map((item) => (
              <li key={item} className="flex gap-2 text-[13px] leading-5">
                <CheckCircle2 aria-hidden className="mt-1 size-3 shrink-0 text-status-good" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="eyebrow border-b border-border pb-1.5">Concerns</p>
          <ul className="mt-2 space-y-1.5">
            {supplier.procurement_suitability.concerns.map((item) => (
              <li key={item} className="flex gap-2 text-[13px] leading-5">
                <CircleAlert aria-hidden className="mt-1 size-3 shrink-0 text-status-warning" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function PoolComparison({ supplier, pool }: { supplier: SupplierDetail; pool: Supplier[] }) {
  const data = CRITERION_KEYS.map((key) => ({
    criterion: `${CRITERIA[key].code} ${CRITERIA[key].shortLabel}`,
    supplier: supplier[key],
    pool: Number((pool.reduce((sum, s) => sum + s[key], 0) / Math.max(1, pool.length)).toFixed(3)),
  }));
  const series = [
    { key: "pool", label: "Pool average", color: "var(--series-6)" },
    { key: "supplier", label: supplier.manufacturer_name, color: "var(--series-1)" },
  ];
  return (
    <>
      <CriteriaRadar data={data} series={series} height={248} label={`Five criteria for ${supplier.manufacturer_name} against the pool average`} />
      <ChartLegend items={series.map((s) => ({ label: s.label, color: s.color, line: true }))} className="justify-center" />
      <p className="mt-3 border-t border-border pt-2.5 text-[11px] leading-4 text-faint">
        Every axis is 0–1 and lower is better, so a smaller shape is a safer, cheaper supplier.
      </p>
    </>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading supplier profile">
      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_27rem]">
        <div className="space-y-3">
          <Skeleton className="h-3 w-64" />
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-20 w-full" />
        </div>
        <Skeleton className="h-44" />
      </div>
      <Skeleton className="h-72 w-full" />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}

export function SupplierProfileView({ manufacturerId }: { manufacturerId: string }) {
  const mode = useWorkspaceStore((state) => state.mode);
  const detail = useApi(`supplier:${manufacturerId}:${mode}`, () => getSupplierDetail(manufacturerId, mode));
  const pool = useApi(`suppliers:${mode}`, () => getSuppliers(mode));
  const supplier = detail.data;
  const weights = SCENARIO_WEIGHTS[mode];

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/suppliers"
          className="eyebrow flex items-center gap-1.5 rounded-sm outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft aria-hidden className="size-3" /> Supplier scorecard
        </Link>
        <span className="eyebrow flex items-center gap-2">
          Scores shown for <ScenarioBadge mode={mode} />
        </span>
      </div>

      {detail.error ? (
        <Panel>
          <ErrorState message={detail.error} onRetry={detail.refetch} />
        </Panel>
      ) : !supplier ? (
        <ProfileSkeleton />
      ) : (
        <>
          <Dossier supplier={supplier} poolSize={pool.data?.length ?? supplier.rank} />

          <Panel variant="open" index="01" title="Assessment" description="Procurement suitability for the active scenario" source={detail.meta?.source}>
            <Assessment supplier={supplier} />
          </Panel>

          <Panel
            flush
            index="02"
            title="Five risk dimensions"
            description="Each criterion is normalised to 0–1 across the pool. Lower is better on every scale; the tick marks the pool median."
            source={detail.meta?.source}
          >
            <ul className="divide-y divide-border">
              {CRITERION_KEYS.map((key) => (
                <CriterionRow
                  key={key}
                  criterion={key}
                  value={supplier[key]}
                  poolMedian={median((pool.data ?? []).map((s) => s[key]))}
                  weight={weights[key]}
                  mode={mode}
                  rawLabel={
                    key === "C1_landed_cost"
                      ? `${formatCurrency(supplier.landed_cost_per_unit, supplier.currency, 2)} per vial`
                      : key === "C5_route_exposure"
                        ? `${formatRatio(supplier.hormuz_air_share)} via Hormuz / Gulf air corridor`
                        : key === "C4_compliance_risk"
                          ? `${supplier.oai_count_5yr} OAI outcome${supplier.oai_count_5yr === 1 ? "" : "s"} in 5 years`
                          : key === "C2_delivery_risk"
                            ? `${formatRatio(supplier.delivery_performance.on_time_rate)} on-time delivery`
                            : undefined
                  }
                />
              ))}
            </ul>
          </Panel>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <Panel
              className="xl:col-span-7"
              index="03"
              title="SHAP explanation"
              description="How each input moved this manufacturer's predicted risk"
              source={detail.meta?.source}
              info="SHAP values attribute the model's risk prediction to individual features. Bars to the right raise predicted risk; bars to the left lower it. Values come from the backend explainer."
            >
              <div className="grid gap-x-8 gap-y-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
                <div>
                  <ShapChart data={supplier.shap_values} />
                  <ChartLegend
                    className="mt-1 justify-center"
                    items={[
                      { label: "Lowers risk", color: "var(--series-1)" },
                      { label: "Raises risk", color: "var(--status-critical)" },
                    ]}
                  />
                </div>
                <div>
                  <p className="eyebrow border-b border-border pb-1.5">Top three risk drivers</p>
                  <ol className="divide-y divide-border">
                    {supplier.shap_top3_reasons.map((reason, i) => (
                      <li key={reason} className="flex gap-3 py-2.5 text-[13px] leading-5">
                        <span className="tabular mt-px shrink-0 text-[11px] font-medium text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                        {reason}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </Panel>

            <Panel className="xl:col-span-5" index="04" title="Against the pool" description="This manufacturer and the pool average" source={detail.meta?.source}>
              {pool.data ? <PoolComparison supplier={supplier} pool={pool.data} /> : <ChartSkeleton height={248} />}
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Panel index="05" title="Delivery performance" description="On-time delivery rate, last 12 months" source={detail.meta?.source}>
              <dl className="mb-4 grid grid-cols-3 gap-3">
                <Fact label="On-time rate">
                  <span className="tabular text-lg font-normal">{formatRatio(supplier.delivery_performance.on_time_rate)}</span>
                </Fact>
                <Fact label="Avg lead time">
                  <span className="tabular text-lg font-normal">{supplier.delivery_performance.avg_lead_time_days}</span> days
                </Fact>
                <Fact label="Variability">
                  <span className="tabular text-lg font-normal">±{supplier.delivery_performance.lead_time_variability_days}</span> days
                </Fact>
              </dl>
              <OnTimeLine data={supplier.delivery_performance.monthly} height={176} />
            </Panel>

            <Panel index="06" title="Regulatory record" source={detail.meta?.source}>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                <Fact label="Last inspection">
                  {supplier.regulatory.last_inspection_date ? formatDate(supplier.regulatory.last_inspection_date) : "None on record"}
                </Fact>
                <Fact label="Last outcome">
                  {supplier.regulatory.last_inspection_outcome ? (
                    <ToneBadge tone={inspectionTone[supplier.regulatory.last_inspection_outcome]} title={inspectionMeaning[supplier.regulatory.last_inspection_outcome]}>
                      {supplier.regulatory.last_inspection_outcome}
                    </ToneBadge>
                  ) : (
                    "—"
                  )}
                </Fact>
                <Fact label="OAI outcomes · 5 yr">{supplier.oai_count_5yr}</Fact>
                <Fact label="Open warning letter">{supplier.regulatory.open_warning_letter ? "Yes" : "No"}</Fact>
                <Fact label="Import alert">{supplier.regulatory.import_alert ? "Yes" : "No"}</Fact>
                <Fact label="Hormuz air share">{formatRatio(supplier.hormuz_air_share)}</Fact>
              </dl>
              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-border pt-3">
                {supplier.regulatory.certifications.map((cert) => (
                  <ToneBadge key={cert} tone="neutral" icon={ShieldCheck}>
                    {cert}
                  </ToneBadge>
                ))}
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">{supplier.regulatory.notes}</p>
            </Panel>

            <Panel flush index="07" title="Active shortages" description="Open shortage listings for this manufacturer" source={detail.meta?.source}>
              {supplier.active_shortages.length === 0 ? (
                <EmptyState icon={CircleCheck} title="No active shortages" description="This manufacturer has no open shortage listings." className="py-8" />
              ) : (
                <ul className="divide-y divide-border">
                  {supplier.active_shortages.map((shortage) => (
                    <li key={shortage.shortage_id}>
                      <Link
                        href={`/shortages?alert=${encodeURIComponent(shortage.shortage_id)}`}
                        className="relative block py-3 pr-4 pl-5 outline-none transition-colors hover:bg-accent/60 focus-visible:bg-accent/60"
                      >
                        <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-status-critical" />
                        <p className="flex items-center gap-1.5 text-[13px] font-medium">
                          <PackageX aria-hidden className="size-3.5 text-status-critical" strokeWidth={1.6} />
                          {shortage.drug_name}
                        </p>
                        <p className="mt-1 text-xs leading-4.5 text-muted-foreground">{shortage.reason}</p>
                        <p className="tabular mt-1 text-[10.5px] text-faint">
                          {shortage.shortage_id} · updated {formatDate(shortage.last_updated)}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <Panel variant="open" index="08" title="Inspection history" description="Regulatory inspections and their classification" source={detail.meta?.source}>
            {supplier.inspection_history.length === 0 ? (
              <EmptyState title="No inspections on record" className="py-6" />
            ) : (
              <ol className="divide-y divide-border">
                {supplier.inspection_history.map((inspection) => (
                  <li
                    key={`${inspection.date}-${inspection.agency}`}
                    className="grid gap-x-6 gap-y-1 py-3 sm:grid-cols-[7rem_10rem_minmax(0,1fr)] sm:items-baseline"
                  >
                    <span className="tabular text-xs font-medium">{formatDate(inspection.date)}</span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ToneBadge tone={inspectionTone[inspection.classification]} title={inspectionMeaning[inspection.classification]}>
                        {inspection.classification}
                      </ToneBadge>
                      {inspection.agency}
                    </span>
                    <span className="text-[13px] leading-5 text-muted-foreground">{inspection.summary}</span>
                  </li>
                ))}
              </ol>
            )}
            <p className="eyebrow mt-2 border-t border-border pt-3 text-[9.5px] text-faint">
              NAI No Action Indicated · VAI Voluntary Action Indicated · OAI Official Action Indicated
            </p>
          </Panel>
        </>
      )}
    </div>
  );
}

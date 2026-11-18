"use client";

import { ArrowRight, PackageX } from "lucide-react";
import Link from "next/link";
import { DataSourceBadge, QualificationBadge, RiskBadge, ToneBadge } from "@/components/shared/badges";
import { RiskMeter, TopsisMeter } from "@/components/shared/meters";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CRITERIA, CRITERION_KEYS } from "@/lib/constants";
import { formatCurrency, formatNumber, formatRatio, formatScore } from "@/lib/utils/format";
import type { CriterionWeights, DataSource, Supplier } from "@/types";

interface SupplierQuickLookProps {
  supplier: Supplier | undefined;
  poolSize: number;
  weights: CriterionWeights;
  source: DataSource | undefined;
  onClose: () => void;
}

/**
 * Side panel summary of one manufacturer, drawn entirely from the scorecard
 * row already on screen, so reviewing several suppliers never leaves the table.
 */
export function SupplierQuickLook({ supplier, poolSize, weights, source, onClose }: SupplierQuickLookProps) {
  return (
    <Sheet open={!!supplier} onOpenChange={(open) => (open ? undefined : onClose())}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        {supplier ? (
          <>
            <SheetHeader className="border-b border-border pr-12">
              <p className="eyebrow flex items-center gap-3">
                Quick look · {supplier.manufacturer_id}
                <DataSourceBadge source={source} />
              </p>
              <SheetTitle className="mt-1 font-serif text-[1.625rem] leading-8 font-light tracking-[-0.02em]">{supplier.manufacturer_name}</SheetTitle>
              <SheetDescription className="text-xs">
                {supplier.manufacturing_country} · FDA labeler {supplier.labeler_name_fda}
              </SheetDescription>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <QualificationBadge status={supplier.qualification_status} />
                <RiskBadge category={supplier.risk_category} />
                {supplier.active_fda_shortage ? (
                  <ToneBadge tone="critical" icon={PackageX}>
                    Active FDA shortage
                  </ToneBadge>
                ) : null}
              </div>
            </SheetHeader>

            <div className="grid grid-cols-2 border-b border-border">
              <div className="border-r border-border p-4">
                <p className="eyebrow">TOPSIS · higher is better</p>
                <p className="figure mt-2.5 text-[34px]">{formatScore(supplier.topsis_score)}</p>
                <TopsisMeter value={supplier.topsis_score} bare className="mt-3" />
                <p className="tabular mt-2 text-[11px] text-muted-foreground">
                  Rank {supplier.rank} of {poolSize}
                </p>
              </div>
              <div className="p-4">
                <p className="eyebrow">Overall risk · lower is better</p>
                <p className="figure mt-2.5 text-[34px]">{formatScore(supplier.overall_risk)}</p>
                <RiskMeter value={supplier.overall_risk} bare className="mt-3" />
                <p className="mt-2 text-[11px] text-muted-foreground">Composite of the risk criteria</p>
              </div>
            </div>

            <section className="border-b border-border p-4">
              <h3 className="eyebrow">Five criteria · 0–1 · lower is better</h3>
              <ul className="mt-3 space-y-2.5">
                {CRITERION_KEYS.map((key) => (
                  <li key={key} className="grid grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)] items-center gap-3">
                    <span className="min-w-0 text-xs">
                      <span className="tabular mr-1.5 text-[10.5px] text-muted-foreground">{CRITERIA[key].code}</span>
                      {CRITERIA[key].shortLabel}
                      <span className="tabular ml-1.5 text-[10.5px] text-faint">w {formatScore(weights[key])}</span>
                    </span>
                    <RiskMeter value={supplier[key]} label={`${CRITERIA[key].label}, lower is better`} />
                  </li>
                ))}
              </ul>
            </section>

            <section className="border-b border-border p-4">
              <h3 className="eyebrow">Top risk drivers · SHAP</h3>
              <ol className="mt-2.5 space-y-2">
                {supplier.shap_top3_reasons.map((reason, i) => (
                  <li key={reason} className="flex gap-3 text-[13px] leading-5">
                    <span className="tabular mt-px shrink-0 text-[11px] font-medium text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                    {reason}
                  </li>
                ))}
              </ol>
            </section>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5 p-4">
              {[
                ["Monthly capacity", `${formatNumber(supplier.monthly_capacity_units)} vials`],
                ["Landed cost", `${formatCurrency(supplier.landed_cost_per_unit, supplier.currency, 2)} per vial`],
                ["Gulf air share", formatRatio(supplier.hormuz_air_share)],
                ["OAI outcomes · 5 yr", String(supplier.oai_count_5yr)],
                ["On probation", supplier.is_probation ? "Yes" : "No"],
                ["Criticality tier", String(supplier.criticality_tier)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="eyebrow text-[9.5px]">{label}</dt>
                  <dd className="tabular mt-1 text-[13px]">{value}</dd>
                </div>
              ))}
            </dl>

            <SheetFooter className="sticky bottom-0 border-t border-border bg-popover">
              <Button asChild>
                <Link href={`/suppliers/${supplier.manufacturer_id}`}>
                  Open full intelligence report <ArrowRight aria-hidden />
                </Link>
              </Button>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

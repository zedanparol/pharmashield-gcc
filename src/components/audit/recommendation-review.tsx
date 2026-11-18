"use client";

import { ArrowUpRight, Check, PenLine, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { SegmentedBar } from "@/components/charts/chart-parts";
import { DataSourceBadge, RoleBadge, ScenarioBadge } from "@/components/shared/badges";
import { Button } from "@/components/ui/button";
import { ROLE_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDateTime, formatNumber, formatPct, formatSigned } from "@/lib/utils/format";
import type { AllocationShare, DataSource, Recommendation } from "@/types";
import { ApproveDialog, OverrideDialog, RejectDialog, type DecisionKind, type DecisionPayload } from "./decision-dialogs";

function shareSegments(shares: AllocationShare[]) {
  return shares.map((share) => ({
    key: share.manufacturer_id,
    label: `${share.manufacturer_name} (${share.role})`,
    value: share.allocation_pct,
    color: ROLE_COLORS[share.role],
    display: formatPct(share.allocation_pct),
    darkInk: share.role === "probation",
  }));
}

/** Current against proposed, one row per manufacturer, so the reviewer sees exactly what would change. */
function AllocationChange({ current, proposed }: { current: AllocationShare[]; proposed: AllocationShare[] }) {
  const ids = [...new Set([...proposed, ...current].map((share) => share.manufacturer_id))];
  const cell = "py-2 pr-3 last:pr-0";
  return (
    <div>
      <div className="space-y-2.5">
        <div>
          <p className="eyebrow mb-1.5 text-[9.5px]">Current allocation</p>
          <SegmentedBar ariaLabel="Current allocation" segments={shareSegments(current)} total={100} className="h-6 opacity-70" />
        </div>
        <div>
          <p className="eyebrow mb-1.5 text-[9.5px] text-foreground">Proposed allocation</p>
          <SegmentedBar ariaLabel="Proposed allocation" segments={shareSegments(proposed)} total={100} className="h-8" />
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[26rem] text-xs">
          <caption className="sr-only">Current and proposed allocation by manufacturer</caption>
          <thead>
            <tr className="eyebrow border-b border-rule text-left text-[9.5px]">
              <th className={cn(cell, "font-medium")}>Manufacturer</th>
              <th className={cn(cell, "text-right font-medium")}>Current</th>
              <th className={cn(cell, "text-right font-medium")}>Proposed</th>
              <th className={cn(cell, "text-right font-medium")}>Change</th>
              <th className={cn(cell, "text-right font-medium")}>Vials</th>
            </tr>
          </thead>
          <tbody>
            {ids.map((id) => {
              const before = current.find((share) => share.manufacturer_id === id);
              const after = proposed.find((share) => share.manufacturer_id === id);
              const share = (after ?? before)!;
              const delta = (after?.allocation_pct ?? 0) - (before?.allocation_pct ?? 0);
              return (
                <tr key={id} className="border-b border-border last:border-b-0">
                  <td className={cell}>
                    <span className="flex min-w-0 items-center gap-2">
                      <RoleBadge role={share.role} className="h-4.5 text-[9.5px]" />
                      <Link
                        href={`/suppliers/${id}`}
                        className="truncate rounded-sm text-[13px] outline-none hover:underline hover:underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {share.manufacturer_name}
                      </Link>
                    </span>
                  </td>
                  <td className={cn(cell, "tabular text-right text-muted-foreground")}>{before ? formatPct(before.allocation_pct) : "—"}</td>
                  <td className={cn(cell, "tabular text-right font-medium")}>{after ? formatPct(after.allocation_pct) : "—"}</td>
                  <td className={cn(cell, "tabular text-right", Math.abs(delta) < 0.05 ? "text-faint" : "font-medium")}>
                    {Math.abs(delta) < 0.05 ? "—" : `${formatSigned(delta, 0)} pts`}
                  </td>
                  <td className={cn(cell, "tabular text-right text-muted-foreground")}>{after ? formatNumber(after.allocated_units) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function RecommendationReview({
  recommendation,
  source,
  onDecision,
}: {
  recommendation: Recommendation;
  source: DataSource | undefined;
  onDecision: (recommendation: Recommendation, payload: DecisionPayload) => Promise<void>;
}) {
  const [dialog, setDialog] = useState<DecisionKind | null>(null);
  const submit = (payload: DecisionPayload) => onDecision(recommendation, payload);
  const dialogProps = (kind: DecisionKind) => ({
    recommendation,
    open: dialog === kind,
    onOpenChange: (open: boolean) => setDialog(open ? kind : null),
    onSubmit: submit,
  });

  return (
    <article className="relative overflow-hidden rounded-md border border-border bg-card" aria-labelledby={`${recommendation.recommendation_id}-title`}>
      <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-status-warning" />
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-border px-5 pt-5 pb-4">
        <div className="min-w-0">
          <p className="eyebrow flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="flex items-center gap-2 text-foreground">
              <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-status-warning" />
              Awaiting human review
            </span>
            · {recommendation.recommendation_id} · raised <span className="tabular">{formatDateTime(recommendation.created_at)}</span>
          </p>
          <h3 id={`${recommendation.recommendation_id}-title`} className="display mt-2 text-[1.5rem] sm:text-[1.75rem]">
            Make{" "}
            <Link
              href={`/suppliers/${recommendation.primary_manufacturer_id}`}
              className="group rounded-sm italic outline-none hover:underline hover:underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring"
            >
              {recommendation.primary_manufacturer_name}
              <ArrowUpRight aria-hidden className="mb-1 ml-0.5 inline size-4 text-muted-foreground group-hover:text-foreground" />
            </Link>{" "}
            the primary supplier.
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <ScenarioBadge mode={recommendation.mode} />
          <DataSourceBadge source={source} />
        </div>
      </header>

      <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="space-y-5 p-5 lg:border-r lg:border-border">
          <section>
            <h4 className="eyebrow">Rationale</h4>
            <p className="mt-2 text-sm leading-6">{recommendation.rationale}</p>
          </section>
          <section>
            <h4 className="eyebrow border-b border-border pb-1.5">SHAP explanation summary</h4>
            <ol className="divide-y divide-border">
              {recommendation.shap_summary.map((reason, i) => (
                <li key={reason} className="flex gap-3 py-2 text-[13px] leading-5">
                  <span className="tabular mt-px shrink-0 text-[11px] font-medium text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                  {reason}
                </li>
              ))}
            </ol>
          </section>
          <dl className="grid grid-cols-3 gap-4 border-t border-rule pt-3.5">
            <div>
              <dt className="eyebrow text-[9.5px]">Product</dt>
              <dd className="mt-1 text-[13px] font-medium">{recommendation.sku_name}</dd>
            </div>
            <div>
              <dt className="eyebrow text-[9.5px]">Monthly demand</dt>
              <dd className="tabular mt-1 text-[13px]">{formatNumber(recommendation.monthly_demand_units)} vials</dd>
            </div>
            <div>
              <dt className="eyebrow text-[9.5px]">Total cost</dt>
              <dd className="tabular mt-1 text-[13px]">{formatCurrency(recommendation.total_cost, recommendation.currency)}</dd>
            </div>
          </dl>
        </div>

        <div className="p-5 max-lg:border-t max-lg:border-border">
          <h4 className="eyebrow mb-3">Proposed order allocation</h4>
          <AllocationChange current={recommendation.current_allocation} proposed={recommendation.proposed_allocation} />
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-border bg-surface-2 px-5 py-3.5">
        <p className="max-w-xl text-xs leading-5 text-muted-foreground">
          <span className="font-medium text-foreground">A decision is required from an authorised reviewer.</span> Nothing is ordered
          automatically — your decision is recorded in the audit trail only.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="destructive" onClick={() => setDialog("reject")}>
            <X aria-hidden /> Reject
          </Button>
          <Button variant="outline" onClick={() => setDialog("override")}>
            <PenLine aria-hidden /> Override
          </Button>
          <Button onClick={() => setDialog("approve")}>
            <Check aria-hidden /> Approve
          </Button>
        </div>
      </footer>

      {dialog === "approve" ? <ApproveDialog {...dialogProps("approve")} /> : null}
      {dialog === "override" ? <OverrideDialog {...dialogProps("override")} /> : null}
      {dialog === "reject" ? <RejectDialog {...dialogProps("reject")} /> : null}
    </article>
  );
}

"use client";

import { Loader2, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ScenarioBadge } from "@/components/shared/badges";
import { KpiCard, MetricStrip } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { ChartSkeleton, ErrorState, Panel, PanelSkeleton } from "@/components/shared/panel";
import { AllocationComparePanel } from "@/components/simulator/simulator-panels";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useApi } from "@/hooks/use-api";
import { useScenario } from "@/hooks/use-scenario";
import { DEFAULT_SKU, SCENARIO_ORDER, SCENARIOS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { formatCurrency, formatNumber, formatPct, formatScore } from "@/lib/utils/format";
import { describeError, getAllocation, recordAuditEvent, submitForReview } from "@/services/api";
import { useSessionStore, useWorkspaceStore } from "@/stores/app-store";
import type { ScenarioMode } from "@/types";
import { AllocationFlow, AllocationTable, CapacityBars, ConstraintsList, CostWaterfall, SummaryList } from "./allocation-panels";
import { DemandForm } from "./demand-form";

const COUNT_WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six"];

export function AllocationView() {
  const { mode, changeMode } = useScenario();
  const demand = useWorkspaceStore((state) => state.monthlyDemand);
  const setDemand = useWorkspaceStore((state) => state.setMonthlyDemand);
  const user = useSessionStore((state) => state.user);
  const [submitting, setSubmitting] = useState(false);

  const allocation = useApi(`allocation:${mode}:${demand}`, () => getAllocation(mode, demand));
  const normal = useApi(`allocation:normal:${demand}`, () => getAllocation("normal", demand));
  const crisis = useApi(`allocation:hormuz_crisis:${demand}`, () => getAllocation("hormuz_crisis", demand));

  const result = allocation.data;
  const stale = allocation.refreshing || (result !== undefined && (result.mode !== mode || result.monthly_demand_units !== demand));
  const mock = allocation.meta?.source === "mock";
  const primary = result?.lines.find((line) => line.role === "primary");
  const others = result ? result.lines.length - (primary ? 1 : 0) : 0;

  const updateDemand = (next: number) => {
    if (next === demand) return;
    setDemand(next);
    if (!user) return;
    recordAuditEvent({
      user: { name: user.name, role: user.role },
      action: "demand_updated",
      supplier: null,
      previous_allocation: null,
      new_allocation: null,
      reason: `Monthly demand assumption changed from ${formatNumber(demand)} to ${formatNumber(next)} vials.`,
      scenario_mode: mode,
      recommendation_id: null,
    }).catch(() => undefined);
  };

  const sendForReview = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const { data } = await submitForReview(mode, demand, { name: user.name, role: user.role });
      toast.success("Sent for human review", {
        description: `${data.recommendation_id} is waiting in the Audit Trail. No purchase order has been placed.`,
      });
    } catch (error) {
      toast.error("The allocation could not be submitted for review.", { description: describeError(error) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Module 05 · Dual-source order allocation"
        title={
          result && primary ? (
            <>
              <em className="font-normal">{primary.manufacturer_name}</em> carries {formatPct(primary.allocation_pct)} of demand.{" "}
              {COUNT_WORDS[others] ?? others} further supplier{others === 1 ? " covers" : "s cover"} the rest
              {result.spot_buy.units > 0 ? ", with a spot-buy for the shortfall" : ""}.
            </>
          ) : (
            "Proposed split of monthly demand"
          )
        }
        description={
          <>
            Proposed allocation for {DEFAULT_SKU.name} under <ScenarioBadge mode={mode} className="mx-0.5 align-middle" />. Every allocation
            requires human approval before any order is raised.
          </>
        }
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/audit">Review queue</Link>
            </Button>
            <Button onClick={sendForReview} disabled={submitting || !result || stale}>
              {submitting ? <Loader2 aria-hidden className="animate-spin" /> : <Send aria-hidden />}
              Submit for approval
            </Button>
          </>
        }
      />

      {mock ? (
        <p className="border border-dashed border-status-warning/60 px-4 py-2.5 text-xs leading-5 text-muted-foreground">
          <span className="eyebrow mr-2 text-foreground">Illustrative allocation</span>
          Quantities come from the mock provider&apos;s simple rule-based fill that respects the plan&apos;s constraints. It is not an optimised
          solution and not output from the PuLP linear programme, which will replace it when the Python optimisation module is connected.
        </p>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-24 xl:col-span-4 2xl:col-span-3">
          <Panel index="A" title="Assumptions" description="Inputs sent to the allocation service">
            <DemandForm demand={demand} onSubmit={updateDemand} busy={stale} />
            <div className="mt-4 border-t border-border pt-4">
              <p className="eyebrow">Scenario</p>
              <ToggleGroup
                type="single"
                variant="outline"
                value={mode}
                onValueChange={(value) => (value ? changeMode(value as ScenarioMode) : undefined)}
                aria-label="Scenario for this allocation"
                className="mt-2 w-full"
              >
                {SCENARIO_ORDER.map((option) => (
                  <ToggleGroupItem key={option} value={option} className="h-9 flex-1 px-2 text-xs">
                    {SCENARIOS[option].shortLabel}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{SCENARIOS[mode].description}</p>
            </div>
          </Panel>

          <Panel
            index="B"
            title="Constraint check"
            description="Rules from the implementation plan"
            source={allocation.meta?.source}
            info="Reported by the allocation service for the returned solution. In live mode these are the LP constraints."
          >
            {result ? <ConstraintsList allocation={result} /> : <PanelSkeleton rows={5} />}
          </Panel>

          <Panel index="C" title="Procurement summary" source={allocation.meta?.source}>
            {result ? (
              <SummaryList
                rows={[
                  { label: "Product", value: DEFAULT_SKU.shortName },
                  { label: "Monthly demand", value: `${formatNumber(result.monthly_demand_units)} vials` },
                  { label: "Contracted volume", value: `${formatNumber(result.totals.allocated_units)} vials` },
                  { label: "Suppliers used", value: result.lines.length },
                  { label: "Backup coverage", value: formatPct(result.totals.backup_coverage_pct, 1) },
                  { label: "Engine", value: result.solver.engine },
                ]}
              />
            ) : (
              <PanelSkeleton rows={5} />
            )}
          </Panel>
        </div>

        <div
          className={cn("flex min-w-0 flex-col gap-4 transition-opacity duration-200 xl:col-span-8 2xl:col-span-9", stale && "opacity-60")}
          aria-busy={stale}
        >
          <MetricStrip label="Allocation totals" className="grid-cols-2 2xl:grid-cols-4">
            <KpiCard
              label="Total cost"
              value={result ? formatCurrency(result.totals.total_cost, result.currency) : "—"}
              caption={result ? `${formatCurrency(result.totals.avg_unit_cost, result.currency, 2)} per vial on average` : undefined}
              loading={allocation.loading}
            />
            <KpiCard
              label="Risk-adjusted cost"
              value={result ? formatCurrency(result.totals.risk_adjusted_total_cost, result.currency) : "—"}
              caption="Landed cost weighted by supplier risk"
              loading={allocation.loading}
              info="Each supplier's landed cost is uplifted by its overall risk to express the expected cost of disruption. Supplied by the allocation service."
            />
            <KpiCard
              label="Weighted risk"
              value={result ? formatScore(result.totals.weighted_risk) : "—"}
              caption="Allocation-weighted · lower is better"
              loading={allocation.loading}
            />
            <KpiCard
              label="Spot-buy"
              value={result ? formatNumber(result.spot_buy.units) : "—"}
              suffix="vials"
              caption={
                result && result.spot_buy.units > 0 ? `${formatCurrency(result.spot_buy.cost, result.currency)} at premium price` : "Emergency buy not required"
              }
              tone={result && result.spot_buy.units > 0 ? "serious" : "good"}
              loading={allocation.loading}
              info="Demand that exceeds the combined capacity of eligible suppliers and would have to be bought on the open market."
            />
          </MetricStrip>

          {allocation.error ? (
            <Panel>
              <ErrorState message={allocation.error} onRetry={allocation.refetch} />
            </Panel>
          ) : (
            <>
              <Panel
                index="01"
                title="Who supplies what"
                description="One month of demand, split by supplier. Ribbon width is the number of vials."
                source={allocation.meta?.source}
              >
                {result ? <AllocationFlow allocation={result} /> : <ChartSkeleton height={260} />}
              </Panel>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Panel index="02" title="Cost build-up" description="Line costs step up to the total, then the risk uplift" source={allocation.meta?.source}>
                  {result ? <CostWaterfall allocation={result} /> : <PanelSkeleton rows={6} />}
                </Panel>
                <Panel
                  index="03"
                  title="Allocation against plant capacity"
                  description="Allocated quantity within each plant's monthly capacity"
                  source={allocation.meta?.source}
                >
                  {result ? <CapacityBars allocation={result} /> : <PanelSkeleton rows={5} />}
                </Panel>
              </div>

              <Panel
                flush
                index="04"
                title="Supplier comparison"
                description="Quantity, capacity, cost and risk for every supplier in the allocation"
                source={allocation.meta?.source}
              >
                {result ? <AllocationTable allocation={result} /> : <PanelSkeleton rows={4} className="p-4" />}
              </Panel>
            </>
          )}
        </div>
      </div>

      <Panel
        variant="open"
        index="05"
        title="Normal versus Hormuz Crisis"
        description={`Side-by-side allocation of ${formatNumber(demand)} vials under baseline and crisis weights`}
        source={normal.meta?.source}
      >
        {normal.error || crisis.error ? (
          <ErrorState
            message={normal.error ?? crisis.error ?? ""}
            onRetry={() => {
              normal.refetch();
              crisis.refetch();
            }}
          />
        ) : normal.data && crisis.data ? (
          <AllocationComparePanel baseline={normal.data} active={crisis.data} />
        ) : (
          <PanelSkeleton rows={5} />
        )}
      </Panel>
    </div>
  );
}

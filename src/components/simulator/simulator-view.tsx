"use client";

import { ArrowRight, Zap } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { SupplyMap, SupplyMapLegend, type SupplyMapPoint } from "@/components/charts/supply-map";
import { DataSourceBadge } from "@/components/shared/badges";
import { KpiCard, MetricStrip } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { ChartSkeleton, ErrorState, Panel, PanelSkeleton } from "@/components/shared/panel";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { useScenario } from "@/hooks/use-scenario";
import { DEFAULT_SKU, SCENARIOS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { formatCurrency, formatNumber, formatPct, formatSigned } from "@/lib/utils/format";
import { getSimulation } from "@/services/api";
import { useWorkspaceStore } from "@/stores/app-store";
import type { SimulationResult } from "@/types";
import { MODE_VISUALS, ModeSwitcher } from "./mode-switcher";
import { AllocationComparePanel, ExplanationPanel, RankingPanel, RouteExposurePanel, WeightsPanel } from "./simulator-panels";

/** Sites for the exposure map: C5 as stressed in this scenario, and each site's share of the allocation. */
function exposurePoints(result: SimulationResult): SupplyMapPoint[] {
  const lines = new Map(result.allocation.lines.map((line) => [line.manufacturer_id, line]));
  return result.rankings.map((row) => {
    const line = lines.get(row.manufacturer_id);
    return {
      id: row.manufacturer_id,
      name: row.manufacturer_name,
      country: row.manufacturing_country,
      rank: row.rank,
      riskCategory: row.risk_category,
      topsis: row.topsis_score,
      overallRisk: row.overall_risk,
      exposure: row.C5_route_exposure_effective,
      gulfAirShare: row.hormuz_air_share,
      sharePct: line?.allocation_pct,
      role: line?.role,
      href: `/suppliers/${row.manufacturer_id}`,
    };
  });
}

export function SimulatorView() {
  const { mode, changeMode } = useScenario();
  const demand = useWorkspaceStore((state) => state.monthlyDemand);
  const simulation = useApi(`simulation:${mode}:${demand}`, () => getSimulation(mode, demand));
  const result = simulation.data;
  const [activeSite, setActiveSite] = useState<string | null>(null);

  // While a new scenario loads the previous result stays on screen, dimmed.
  const stale = simulation.refreshing || (result !== undefined && result.mode !== mode);
  const color = MODE_VISUALS[mode].color;

  const top = result?.rankings.find((r) => r.rank === 1);
  const baselineTop = result?.rankings.find((r) => r.baseline_rank === 1);
  const moved = result?.rankings.filter((r) => r.rank !== r.baseline_rank).length ?? 0;
  const highRisk = result?.rankings.filter((r) => r.risk_category === "high").length ?? 0;
  const baselineHighRisk = result?.rankings.filter((r) => r.baseline_risk_category === "high").length ?? 0;
  const cost = result?.allocation.totals.total_cost ?? 0;
  const baselineCost = result?.baseline_allocation.totals.total_cost ?? 0;
  const costDelta = baselineCost ? ((cost - baselineCost) / baselineCost) * 100 : 0;
  const isBaseline = mode === "normal";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Module 04 · Crisis simulation centre"
        title={
          isBaseline ? (
            <>
              The <em className="font-normal">Normal Mode</em> baseline.
            </>
          ) : (
            <>
              What changes under <em className="font-normal">{SCENARIOS[mode].label}</em>.
            </>
          )
        }
        description={`Switch scenario to see how criterion weights, supplier ranking, route exposure and the ${DEFAULT_SKU.shortName} allocation respond. The selected mode applies across every module.`}
        actions={
          <Button variant="outline" asChild>
            <Link href="/allocation">
              Open allocation <ArrowRight aria-hidden />
            </Link>
          </Button>
        }
      />

      <div>
        <ModeSwitcher mode={mode} onChange={changeMode} busy={stale} />
        <div aria-live="polite" className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-1 pt-2.5">
          <p className="eyebrow flex items-center gap-2 text-foreground">
            <span aria-hidden className="size-1.5 rounded-[1px]" style={{ background: color }} />
            {SCENARIOS[mode].label} in force
          </p>
          {mode === "hormuz_crisis" ? (
            <p className="flex items-center gap-1.5 text-xs">
              <Zap aria-hidden className="size-3.5 text-status-critical" strokeWidth={1.6} />
              <span>
                <span className="tabular font-medium">{result?.stress.hormuz_factor ?? 1.5}×</span> Hormuz / Gulf air corridor stress on C5, capped at{" "}
                <span className="tabular font-medium">{(result?.stress.cap ?? 1).toFixed(1)}</span>
              </span>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">No corridor stress factor applied</p>
          )}
          <DataSourceBadge source={simulation.meta?.source} className="ml-auto" />
        </div>
      </div>

      {simulation.error ? (
        <Panel>
          <ErrorState message={simulation.error} onRetry={simulation.refetch} />
        </Panel>
      ) : (
        <div className={cn("space-y-6 transition-opacity duration-200", stale && "opacity-60")} aria-busy={stale}>
          <MetricStrip label="Scenario impact" className="grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
            <KpiCard
              label="Top-ranked supplier"
              value={<span className="block truncate font-sans text-lg leading-[30px] font-medium tracking-tight">{top?.manufacturer_name ?? "—"}</span>}
              caption={
                isBaseline || top?.manufacturer_id === baselineTop?.manufacturer_id
                  ? "Unchanged from Normal Mode"
                  : `Was ${baselineTop?.manufacturer_name} in Normal Mode`
              }
              tone={!isBaseline && top?.manufacturer_id !== baselineTop?.manufacturer_id ? "warning" : "info"}
              loading={simulation.loading}
            />
            <KpiCard
              label="Ranking changes"
              value={moved}
              suffix={`of ${result?.rankings.length ?? 0}`}
              caption={isBaseline ? "Baseline ranking" : "Moved rank against Normal Mode"}
              loading={simulation.loading}
            />
            <KpiCard
              label="Total procurement cost"
              value={formatCurrency(cost, result?.allocation.currency)}
              caption={isBaseline ? `${formatNumber(demand)} vials per month` : `${formatSigned(costDelta, 1)}% against Normal Mode`}
              tone={!isBaseline && costDelta > 0 ? "warning" : !isBaseline && costDelta < 0 ? "good" : "info"}
              loading={simulation.loading}
              info="Sum of allocated units × landed cost per vial, plus any emergency spot-buy."
            />
            <KpiCard
              label="High-risk suppliers"
              value={highRisk}
              caption={isBaseline ? "Overall risk category: High" : `${baselineHighRisk} in Normal Mode`}
              tone={highRisk > baselineHighRisk ? "critical" : "info"}
              loading={simulation.loading}
              info="Manufacturers whose overall risk category is High for this scenario."
            />
            <KpiCard
              label="Backup utilisation"
              value={result ? formatPct(result.allocation.totals.backup_coverage_pct) : "—"}
              caption={
                isBaseline ? "Served by non-primary suppliers" : `${formatPct(result?.baseline_allocation.totals.backup_coverage_pct ?? 0)} in Normal Mode`
              }
              loading={simulation.loading}
              info="Share of monthly demand served by secondary, backup and probation suppliers rather than the primary."
            />
          </MetricStrip>

          <Panel variant="open" index="01" title="Why it changed" description="Explanation for the active scenario" source={simulation.meta?.source}>
            {result ? <ExplanationPanel result={result} /> : <PanelSkeleton rows={4} />}
          </Panel>

          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
            <Panel
              className="xl:col-span-7"
              index="02"
              title="Rank shift"
              description="Normal Mode order against the order under the active weights · TOPSIS, higher is better"
              source={simulation.meta?.source}
            >
              {result ? <RankingPanel result={result} /> : <PanelSkeleton rows={10} />}
            </Panel>
            <Panel
              className="xl:col-span-5"
              index="03"
              title="Criterion weights"
              description="Ranking weight per criterion against the Normal Mode baseline"
              source={simulation.meta?.source}
              info="Weights sum to 1.00. They set how much each criterion counts in the TOPSIS ranking. Values are fixed by the implementation plan for each scenario."
            >
              {result ? <WeightsPanel result={result} /> : <PanelSkeleton rows={6} />}
            </Panel>
          </div>

          <Panel
            index="04"
            title="Route exposure · C5"
            description={
              result?.stress.applied
                ? `Baseline score × ${result.stress.hormuz_factor} corridor stress, capped at ${result.stress.cap.toFixed(1)} · lower is better`
                : "Geopolitical and route exposure per manufacturer · lower is better"
            }
            source={simulation.meta?.source}
            info="C5 measures dependence on vulnerable corridors such as the Strait of Hormuz and Gulf air routes. In Hormuz Crisis Mode each score is multiplied by 1.5 and capped at 1.0."
          >
            {result ? (
              <div className="grid gap-x-8 gap-y-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
                <div>
                  <SupplyMap
                    points={exposurePoints(result)}
                    arcs="exposure"
                    stressed={result.stress.applied}
                    activeId={activeSite}
                    onActiveChange={setActiveSite}
                  />
                  <SupplyMapLegend arcs="exposure" className="mt-3 border-t border-border pt-3" />
                  <p className="mt-1.5 text-[11px] text-faint">
                    Links are schematic: manufacturing country to the UAE, shaded by C5 in this scenario. They are not shipping lanes.
                  </p>
                </div>
                <RouteExposurePanel result={result} />
              </div>
            ) : (
              <ChartSkeleton height={340} />
            )}
          </Panel>

          <Panel
            variant="open"
            index="05"
            title="Allocation and cost impact"
            description={`How ${formatNumber(demand)} vials per month are split across manufacturers in each scenario`}
            source={simulation.meta?.source}
            action={
              <Button variant="ghost" size="xs" asChild>
                <Link href="/allocation">
                  Allocation detail <ArrowRight aria-hidden />
                </Link>
              </Button>
            }
          >
            {result ? <AllocationComparePanel baseline={result.baseline_allocation} active={result.allocation} /> : <PanelSkeleton rows={5} />}
          </Panel>
        </div>
      )}
    </div>
  );
}

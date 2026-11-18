"use client";

import { ArrowRight, ClipboardCheck, Gauge } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ActiveShortageArea } from "@/components/charts/charts";
import { HeatScale, RiskMatrix } from "@/components/charts/risk-matrix";
import { ScenarioBadge } from "@/components/shared/badges";
import { KpiCard, MetricStrip } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { ChartSkeleton, ErrorState, Panel, PanelSkeleton } from "@/components/shared/panel";
import { Button } from "@/components/ui/button";
import { useApi, type UseApiState } from "@/hooks/use-api";
import { DEFAULT_SKU, SCENARIO_WEIGHTS, SCENARIOS } from "@/lib/constants";
import { formatNumber, formatPct, formatScore } from "@/lib/utils/format";
import {
  getAllocation,
  getAuditEvents,
  getRecommendations,
  getShortages,
  getShortageTrend,
  getSuppliers,
  getSupplierUpdates,
} from "@/services/api";
import { useWorkspaceStore } from "@/stores/app-store";
import { AuditFeed, CriticalAlerts, SupplierUpdates } from "./activity-panels";
import { AllocationOverview, NetworkMap } from "./overview-panels";

/** Renders the loading, error or loaded state of one data request. */
function Async<T>({
  state,
  skeleton,
  children,
}: {
  state: UseApiState<T>;
  skeleton: ReactNode;
  children: (data: T) => ReactNode;
}) {
  if (state.error) return <ErrorState message={state.error} onRetry={state.refetch} />;
  if (state.loading || state.data === undefined) return <>{skeleton}</>;
  return <>{children(state.data)}</>;
}

const COUNT_WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
const countWord = (n: number) => COUNT_WORDS[n] ?? String(n);

export function DashboardView() {
  const mode = useWorkspaceStore((state) => state.mode);
  const demand = useWorkspaceStore((state) => state.monthlyDemand);
  const [activeId, setActiveId] = useState<string | null>(null);

  const suppliers = useApi(`suppliers:${mode}`, () => getSuppliers(mode));
  const shortages = useApi("shortages", getShortages);
  const trend = useApi("shortage-trend", getShortageTrend);
  const allocation = useApi(`allocation:${mode}:${demand}`, () => getAllocation(mode, demand));
  const updates = useApi("supplier-updates", getSupplierUpdates);
  const audit = useApi("audit", getAuditEvents);
  const recommendations = useApi("recommendations", getRecommendations);

  const list = suppliers.data ?? [];
  const qualified = list.filter((s) => s.qualification_status === "qualified").length;
  const onProbation = list.filter((s) => s.qualification_status === "probation").length;
  const highRisk = list.filter((s) => s.risk_category === "high").length;
  const averageRisk = list.length ? list.reduce((sum, s) => sum + s.overall_risk, 0) / list.length : 0;
  const active = (shortages.data ?? []).filter((s) => s.status === "active");
  const critical = active.filter((s) => s.severity === "critical");
  const primary = allocation.data?.lines.find((line) => line.role === "primary");
  const pending = (recommendations.data ?? []).filter((r) => r.status === "pending").length;
  const top = list.find((s) => s.rank === 1);
  const mock = shortages.meta?.source === "mock";

  // The headline is composed from the loaded figures only — it states what the data says, nothing more.
  const headline =
    top || shortages.data ? (
      <>
        {shortages.data ? (
          <>
            {countWord(critical.length)} critical shortage{critical.length === 1 ? " is" : "s are"} active.{" "}
          </>
        ) : null}
        {top ? (
          <>
            <em className="font-normal">{top.manufacturer_name}</em> leads the ranking under {SCENARIOS[mode].shortLabel} weights.
          </>
        ) : null}
      </>
    ) : (
      "Reading the supply position"
    );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Executive briefing · ${DEFAULT_SKU.name}`}
        title={headline}
        description={
          <>
            Sourcing position for {formatNumber(demand)} vials a month under <ScenarioBadge mode={mode} className="mx-0.5 align-middle" />. Every
            figure follows the active scenario and demand.
          </>
        }
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/simulator">
                <Gauge aria-hidden /> Run scenario
              </Link>
            </Button>
            <Button asChild>
              <Link href="/audit">
                <ClipboardCheck aria-hidden /> Review approvals
                {pending > 0 ? <span className="tabular ml-0.5 rounded-[2px] bg-white/20 px-1 text-[11px] font-medium">{pending}</span> : null}
              </Link>
            </Button>
          </>
        }
      />

      <MetricStrip label="Supply position" className="grid-cols-2 md:grid-cols-3 2xl:grid-cols-6">
        <KpiCard
          label="Qualified manufacturers"
          value={qualified}
          suffix={`of ${list.length}`}
          caption={`${onProbation} more on probation`}
          href="/suppliers"
          loading={suppliers.loading}
          info="Manufacturers with full qualification status. Probation suppliers are counted separately and receive trial volumes only."
        />
        <KpiCard
          label="Active shortages"
          value={active.length}
          caption={`${critical.length} critical`}
          tone={critical.length ? "critical" : "good"}
          href="/shortages"
          loading={shortages.loading}
        />
        <KpiCard
          label="High-risk suppliers"
          value={highRisk}
          suffix={`of ${list.length}`}
          caption={`Under ${SCENARIOS[mode].shortLabel} weights`}
          tone={highRisk ? "critical" : "good"}
          href="/suppliers"
          loading={suppliers.loading}
          info="Manufacturers whose overall risk category is High for the active scenario."
        />
        <KpiCard
          label="Average supplier risk"
          value={formatScore(averageRisk)}
          caption="Scale 0–1 · lower is better"
          loading={suppliers.loading}
          info="Mean overall risk across every evaluated manufacturer. This is a risk score, not the TOPSIS score: lower is better."
        />
        <KpiCard
          label="Primary allocation"
          value={primary ? formatPct(primary.allocation_pct) : "—"}
          caption={primary?.manufacturer_name ?? "No primary assigned"}
          href="/allocation"
          loading={allocation.loading}
          info="Share of monthly demand assigned to the primary supplier. The Tier 1 cap is 70%."
        />
        <KpiCard
          label="Backup coverage"
          value={allocation.data ? formatPct(allocation.data.totals.backup_coverage_pct) : "—"}
          caption="Held by non-primary suppliers"
          href="/allocation"
          loading={allocation.loading}
          info="Share of monthly demand allocated to secondary, backup and probation suppliers."
        />
      </MetricStrip>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Panel
          className="xl:col-span-8"
          index="01"
          title="Supply network"
          description="Where the evaluated manufacturers are, and which of them feed the proposed allocation"
          source={suppliers.meta?.source}
          info="Each point is a manufacturer at its country of manufacture, coloured by overall risk category. A solid link means the manufacturer is in the proposed allocation; its width is the share of monthly demand."
        >
          <Async state={suppliers} skeleton={<ChartSkeleton height={360} />}>
            {(data) => (
              <NetworkMap
                suppliers={data}
                allocation={allocation.data}
                stressed={mode === "hormuz_crisis"}
                activeId={activeId}
                onActiveChange={setActiveId}
              />
            )}
          </Async>
        </Panel>

        <div className="flex min-w-0 flex-col gap-4 xl:col-span-4">
          <Panel
            flush
            index="02"
            title="Priority alerts"
            description="Active critical and high-severity shortages"
            source={shortages.meta?.source}
            action={
              <Button variant="ghost" size="xs" asChild>
                <Link href="/shortages">
                  All <ArrowRight aria-hidden />
                </Link>
              </Button>
            }
          >
            <Async state={shortages} skeleton={<PanelSkeleton rows={4} className="p-4" />}>
              {(data) => (
                <>
                  <CriticalAlerts shortages={data} limit={3} />
                  {mock ? (
                    <p className="border-t border-border px-4 py-2 text-[11px] text-faint">
                      Demonstration records from the mock provider — not live FDA or regulatory alerts.
                    </p>
                  ) : null}
                </>
              )}
            </Async>
          </Panel>
          <Panel flush className="flex-1" index="03" title="Supplier updates" source={updates.meta?.source}>
            <Async state={updates} skeleton={<PanelSkeleton rows={4} className="p-4" />}>
              {(data) => <SupplierUpdates updates={data} limit={2} />}
            </Async>
          </Panel>
        </div>
      </div>

      <Panel
        flush
        index="04"
        title="Ranking and risk matrix"
        description={`Every evaluated manufacturer under ${SCENARIOS[mode].label}. TOPSIS ranks quality; the heat cells show where the risk sits.`}
        source={suppliers.meta?.source}
        action={
          <Button variant="ghost" size="xs" asChild>
            <Link href="/suppliers">
              Scorecard <ArrowRight aria-hidden />
            </Link>
          </Button>
        }
      >
        <Async state={suppliers} skeleton={<PanelSkeleton rows={8} className="p-4" />}>
          {(data) => (
            <>
              <RiskMatrix suppliers={data} weights={SCENARIO_WEIGHTS[mode]} activeId={activeId} onActiveChange={setActiveId} />
              <div className="border-t border-border px-4 py-2.5">
                <HeatScale />
              </div>
            </>
          )}
        </Async>
      </Panel>

      <div className="grid grid-cols-1 gap-x-8 gap-y-6 xl:grid-cols-12">
        <Panel
          variant="open"
          className="xl:col-span-5"
          index="05"
          title="Proposed allocation"
          description={`${formatNumber(demand)} vials per month · ${SCENARIOS[mode].shortLabel} · awaiting human approval`}
          source={allocation.meta?.source}
          action={
            <Button variant="ghost" size="xs" asChild>
              <Link href="/allocation">
                Detail <ArrowRight aria-hidden />
              </Link>
            </Button>
          }
        >
          <Async state={allocation} skeleton={<PanelSkeleton rows={5} />}>
            {(data) => <AllocationOverview allocation={data} />}
          </Async>
        </Panel>

        <Panel
          variant="open"
          className="xl:col-span-4"
          index="06"
          title="Active shortages"
          description="Month-end count of active records, last 12 months"
          source={trend.meta?.source}
        >
          <Async state={trend} skeleton={<ChartSkeleton height={232} />}>
            {(data) => <ActiveShortageArea data={data} height={232} />}
          </Async>
        </Panel>

        <Panel
          variant="open"
          className="xl:col-span-3"
          index="07"
          title="Decision log"
          description="Latest reviews and audit events"
          source={audit.meta?.source}
          action={
            <Button variant="ghost" size="xs" asChild>
              <Link href="/audit">
                All <ArrowRight aria-hidden />
              </Link>
            </Button>
          }
        >
          <Async state={audit} skeleton={<PanelSkeleton rows={5} />}>
            {(data) => <AuditFeed events={data} limit={5} />}
          </Async>
        </Panel>
      </div>

      <p className="eyebrow border-t border-border pt-4 text-faint normal-case">
        PharmaShield supports decisions; it does not make them. No procurement order is placed without human approval.
      </p>
    </div>
  );
}

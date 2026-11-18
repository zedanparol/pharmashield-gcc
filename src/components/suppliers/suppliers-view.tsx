"use client";

import { FilterX, Search, SearchX } from "lucide-react";
import { useMemo, useState } from "react";
import { HeatCell } from "@/components/charts/risk-matrix";
import { ScenarioBadge } from "@/components/shared/badges";
import { TopsisMeter } from "@/components/shared/meters";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, Panel, PanelSkeleton } from "@/components/shared/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useApi } from "@/hooks/use-api";
import { DEFAULT_SKU, QUALIFICATION_LABELS, RISK_LABELS, SCENARIO_WEIGHTS, SCENARIOS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { formatScore } from "@/lib/utils/format";
import { getSuppliers } from "@/services/api";
import { useWorkspaceStore } from "@/stores/app-store";
import type { QualificationStatus, RiskCategory, Supplier } from "@/types";
import { SupplierQuickLook } from "./supplier-quick-look";
import { SupplierTable } from "./supplier-table";

const ALL = "all";

interface Filters {
  query: string;
  country: string;
  qualification: string;
  risk: string;
  probation: string;
}

const initialFilters: Filters = { query: "", country: ALL, qualification: ALL, risk: ALL, probation: ALL };

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  allLabel: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className={cn("h-8 min-w-36 text-xs", value !== ALL && "border-rule")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Every manufacturer's TOPSIS score on one 0–1 axis. Shows at a glance how
 * tightly the pool is bunched and where the filtered suppliers sit in it.
 */
function ScoreStrip({ suppliers, visible, onSelect }: { suppliers: Supplier[]; visible: Set<string>; onSelect: (supplier: Supplier) => void }) {
  return (
    <div>
      <div className="ticks relative mx-3 h-12">
        <span className="absolute inset-x-0 bottom-0 h-px bg-[var(--chart-axis)]" />
        {suppliers.map((supplier) => {
          const shown = visible.has(supplier.manufacturer_id);
          return (
            <Tooltip key={supplier.manufacturer_id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onSelect(supplier)}
                  aria-label={`${supplier.manufacturer_name}: TOPSIS ${formatScore(supplier.topsis_score)}, rank ${supplier.rank}. Open quick look.`}
                  className={cn(
                    "group absolute bottom-0 flex h-full w-5 -translate-x-1/2 flex-col items-center justify-end outline-none transition-opacity",
                    shown ? "" : "opacity-25",
                  )}
                  style={{ left: `${supplier.topsis_score * 100}%` }}
                >
                  <span className="tabular mb-1 text-[9.5px] font-medium text-muted-foreground group-hover:text-foreground">
                    {String(supplier.rank).padStart(2, "0")}
                  </span>
                  <span
                    className={cn(
                      "h-5 w-[3px] transition-all group-hover:h-6 group-hover:w-1 group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-background",
                      supplier.qualification_status === "disqualified" ? "border border-signal bg-transparent" : "bg-signal",
                    )}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-xs leading-5">
                <strong>{supplier.manufacturer_name}</strong>
                <br />
                TOPSIS {formatScore(supplier.topsis_score, 3)} · rank {supplier.rank}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      <div className="eyebrow mx-3 mt-1.5 flex justify-between text-[9.5px] text-faint">
        <span>0.00 · furthest from ideal</span>
        <span className="hidden sm:inline">0.50</span>
        <span>closest to ideal · 1.00</span>
      </div>
    </div>
  );
}

export function SuppliersView() {
  const mode = useWorkspaceStore((state) => state.mode);
  const suppliers = useApi(`suppliers:${mode}`, () => getSuppliers(mode));
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const set = (patch: Partial<Filters>) => setFilters((current) => ({ ...current, ...patch }));

  const all = useMemo(() => suppliers.data ?? [], [suppliers.data]);
  const countries = useMemo(() => [...new Set(all.map((s) => s.manufacturing_country))].sort(), [all]);

  const filtered = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    return all.filter(
      (s) =>
        (!query ||
          s.manufacturer_name.toLowerCase().includes(query) ||
          s.labeler_name_fda.toLowerCase().includes(query) ||
          s.manufacturer_id.toLowerCase().includes(query)) &&
        (filters.country === ALL || s.manufacturing_country === filters.country) &&
        (filters.qualification === ALL || s.qualification_status === filters.qualification) &&
        (filters.risk === ALL || s.risk_category === filters.risk) &&
        (filters.probation === ALL || (filters.probation === "yes") === s.is_probation),
    );
  }, [all, filters]);

  const visibleIds = useMemo(() => new Set(filtered.map((s) => s.manufacturer_id)), [filtered]);
  const filtersActive = JSON.stringify(filters) !== JSON.stringify(initialFilters);
  const top = all.find((s) => s.rank === 1);
  const selected = all.find((s) => s.manufacturer_id === selectedId);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Module 02 · Supplier intelligence"
        title={
          top ? (
            <>
              {all.length} manufacturers evaluated. <em className="font-normal">{top.manufacturer_name}</em> ranks first.
            </>
          ) : (
            "Supplier scorecard"
          )
        }
        description={
          <>
            Manufacturers evaluated for {DEFAULT_SKU.name}, ranked under <ScenarioBadge mode={mode} className="mx-0.5 align-middle" />. Select a
            row for a quick look, or open the full intelligence report.
          </>
        }
      />

      <div className="grid grid-cols-1 gap-x-8 gap-y-5 xl:grid-cols-12">
        <Panel
          variant="open"
          className="xl:col-span-8"
          index="01"
          title="TOPSIS score distribution"
          description={`Each mark is one manufacturer, labelled by rank under ${SCENARIOS[mode].shortLabel} weights. Right is better.`}
          source={suppliers.meta?.source}
        >
          {suppliers.error ? (
            <p className="py-4 text-xs text-muted-foreground">Scores are unavailable.</p>
          ) : suppliers.loading ? (
            <PanelSkeleton rows={2} />
          ) : (
            <ScoreStrip suppliers={all} visible={visibleIds} onSelect={(supplier) => setSelectedId(supplier.manufacturer_id)} />
          )}
        </Panel>

        <Panel variant="open" className="xl:col-span-4" index="02" title="How to read the scores">
          <ul className="space-y-3 text-xs leading-5 text-muted-foreground">
            <li className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-3">
              <TopsisMeter value={0.78} bare label="Example TOPSIS bar" />
              <span>
                <span className="font-medium text-foreground">TOPSIS — higher is better.</span> Closeness to the ideal supplier. A quality
                ranking, not a risk score.
              </span>
            </li>
            <li className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-3">
              <span className="flex gap-px" aria-hidden>
                <HeatCell value={0.12} className="min-w-0 flex-1 text-[10px]" />
                <HeatCell value={0.74} className="min-w-0 flex-1 text-[10px]" />
              </span>
              <span>
                <span className="font-medium text-foreground">Risk and C1–C5 — lower is better.</span> Each is normalised to 0–1; a darker cell
                is a higher score.
              </span>
            </li>
          </ul>
        </Panel>
      </div>

      <Panel
        flush
        index="03"
        title="Manufacturers"
        description={
          suppliers.data
            ? `${filtered.length} of ${all.length} shown · click a column heading to sort`
            : suppliers.error
              ? "Supplier data is unavailable"
              : "Loading the supplier matrix"
        }
        source={suppliers.meta?.source}
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
          <div className="relative min-w-52 flex-1 sm:max-w-72">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={filters.query}
              onChange={(event) => set({ query: event.target.value })}
              placeholder="Search manufacturer, labeler or ID"
              aria-label="Search manufacturers"
              className="h-8 pl-8 text-xs"
            />
          </div>
          <FilterSelect
            label="Filter by country"
            allLabel="All countries"
            value={filters.country}
            onChange={(country) => set({ country })}
            options={countries.map((country) => ({ value: country, label: country }))}
          />
          <FilterSelect
            label="Filter by qualification status"
            allLabel="All qualification"
            value={filters.qualification}
            onChange={(qualification) => set({ qualification })}
            options={(Object.keys(QUALIFICATION_LABELS) as QualificationStatus[]).map((status) => ({
              value: status,
              label: QUALIFICATION_LABELS[status],
            }))}
          />
          <FilterSelect
            label="Filter by risk category"
            allLabel="All risk levels"
            value={filters.risk}
            onChange={(risk) => set({ risk })}
            options={(Object.keys(RISK_LABELS) as RiskCategory[]).map((category) => ({
              value: category,
              label: RISK_LABELS[category],
            }))}
          />
          <FilterSelect
            label="Filter by probation status"
            allLabel="Probation: any"
            value={filters.probation}
            onChange={(probation) => set({ probation })}
            options={[
              { value: "yes", label: "On probation" },
              { value: "no", label: "Not on probation" },
            ]}
          />
          {filtersActive ? (
            <Button variant="ghost" size="sm" onClick={() => setFilters(initialFilters)}>
              <FilterX aria-hidden /> Clear filters
            </Button>
          ) : null}
        </div>

        {suppliers.error ? (
          <ErrorState message={suppliers.error} onRetry={suppliers.refetch} />
        ) : suppliers.loading ? (
          <PanelSkeleton rows={8} className="p-4" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="No manufacturers match these filters"
            description="Try a different search term or clear one of the filters."
            action={
              <Button variant="outline" size="sm" onClick={() => setFilters(initialFilters)}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <div className={suppliers.refreshing ? "opacity-60 transition-opacity" : "transition-opacity"}>
            <SupplierTable suppliers={filtered} selectedId={selectedId} onSelect={(supplier) => setSelectedId(supplier.manufacturer_id)} />
          </div>
        )}
      </Panel>

      <SupplierQuickLook
        supplier={selected}
        poolSize={all.length}
        weights={SCENARIO_WEIGHTS[mode]}
        source={suppliers.meta?.source}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}

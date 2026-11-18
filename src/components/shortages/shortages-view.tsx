"use client";

import { FilterX, Search, SearchX, Siren } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type CSSProperties } from "react";
import { ChartLegend } from "@/components/charts/chart-parts";
import { ShortageFlowChart } from "@/components/charts/charts";
import { SeverityBadge, ToneBadge } from "@/components/shared/badges";
import { SwapValue } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { ChartSkeleton, EmptyState, ErrorState, Panel, PanelSkeleton } from "@/components/shared/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useApi } from "@/hooks/use-api";
import { SEVERITY_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/format";
import { severityTone, toneColor } from "@/lib/utils/risk";
import { getShortages, getShortageTrend } from "@/services/api";
import type { Severity, Shortage } from "@/types";
import { ShortageDrawer } from "./shortage-drawer";

const ALL = "all";
const severityOrder: Severity[] = ["critical", "high", "moderate", "low", "unclassified"];
const COUNT_WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
const countWord = (n: number) => COUNT_WORDS[n] ?? String(n);

/**
 * Active records by severity, as one instrument. Each step is a filter: the
 * ladder is both the summary and the fastest way into the list.
 */
function SeverityLadder({
  active,
  levels,
  selected,
  onSelect,
  loading,
}: {
  active: Shortage[];
  levels: Severity[];
  selected: string;
  onSelect: (severity: string) => void;
  loading: boolean;
}) {
  const total = Math.max(1, active.length);
  return (
    <div role="group" aria-label="Active shortages by severity" className="overflow-hidden rounded-md border border-border bg-card">
      <div>
        <div className="-mr-px -mb-px grid grid-cols-2 sm:grid-cols-[repeat(var(--steps),minmax(0,1fr))]" style={{ "--steps": levels.length } as CSSProperties}>
          {levels.map((level) => {
            const count = active.filter((s) => s.severity === level).length;
            const pressed = selected === level;
            const color = toneColor[severityTone[level]];
            return (
              <button
                key={level}
                type="button"
                aria-pressed={pressed}
                onClick={() => onSelect(pressed ? ALL : level)}
                className={cn(
                  "group relative border-r border-b border-border px-4 pt-3.5 pb-4 text-left outline-none transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                  pressed && "bg-accent",
                )}
              >
                <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: color, opacity: count ? 1 : 0.25 }} />
                <span className="eyebrow flex items-center justify-between gap-2">
                  <span className={cn(count ? "text-foreground" : undefined)}>{SEVERITY_LABELS[level]}</span>
                  <span className={cn("text-[9px] transition-opacity", pressed ? "text-foreground" : "opacity-0 group-hover:opacity-100")}>
                    {pressed ? "Filtered ×" : "Filter"}
                  </span>
                </span>
                {loading ? (
                  <Skeleton className="mt-3 h-8 w-12" />
                ) : (
                  <span className="mt-3 flex items-baseline gap-2">
                    <SwapValue className={cn("figure text-[34px]", count === 0 && "text-faint")}>{count}</SwapValue>
                    <span className="text-xs text-muted-foreground">active</span>
                  </span>
                )}
                <span className="mt-3 block h-[3px] bg-foreground/10">
                  <span className="block h-full transition-[width] duration-500 ease-out" style={{ width: `${(count / total) * 100}%`, background: color }} />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Active records per manufacturer. Selecting a bar filters the list to that manufacturer. */
function ManufacturerLoad({ active, selected, onSelect }: { active: Shortage[]; selected: string; onSelect: (name: string) => void }) {
  const counts = new Map<string, number>();
  active.forEach((s) => counts.set(s.manufacturer_name, (counts.get(s.manufacturer_name) ?? 0) + 1));
  const rows = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const max = Math.max(1, ...rows.map(([, n]) => n));
  if (!rows.length) return <EmptyState title="No active records" className="py-6" />;
  return (
    <ul className="space-y-0.5">
      {rows.map(([name, count]) => {
        const pressed = selected === name;
        return (
          <li key={name}>
            <button
              type="button"
              aria-pressed={pressed}
              onClick={() => onSelect(pressed ? ALL : name)}
              title={pressed ? "Clear this filter" : `Show records for ${name}`}
              className={cn(
                "-mx-2 grid w-[calc(100%+1rem)] grid-cols-[minmax(0,1fr)_5rem_1.25rem] items-center gap-3 rounded-[3px] px-2 py-1.5 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
                pressed && "bg-accent",
              )}
            >
              <span className={cn("truncate text-xs", pressed && "font-medium")}>{name}</span>
              <span className="block h-2">
                <span className="block h-full rounded-r-[2px] bg-series-1" style={{ width: `${(count / max) * 100}%` }} />
              </span>
              <span className="tabular text-right text-xs font-medium">{count}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

const th = "h-9 font-mono text-[10px] font-medium tracking-[0.1em] text-muted-foreground uppercase";

export function ShortagesView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const shortages = useApi("shortages", getShortages);
  const trend = useApi("shortage-trend", getShortageTrend);

  const [query, setQuery] = useState("");
  const [manufacturer, setManufacturer] = useState(ALL);
  const [severity, setSeverity] = useState(ALL);
  const [status, setStatus] = useState("active");

  const all = useMemo(() => shortages.data ?? [], [shortages.data]);
  const mock = shortages.meta?.source === "mock";
  const manufacturers = useMemo(() => [...new Set(all.map((s) => s.manufacturer_name))].sort(), [all]);
  const severities = useMemo(() => severityOrder.filter((level) => all.some((s) => s.severity === level)), [all]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return all
      .filter(
        (s) =>
          (!term || s.drug_name.toLowerCase().includes(term) || s.presentation.toLowerCase().includes(term)) &&
          (manufacturer === ALL || s.manufacturer_name === manufacturer) &&
          (severity === ALL || s.severity === severity) &&
          (status === ALL || s.status === status),
      )
      .sort(
        (a, b) =>
          severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity) || b.last_updated.localeCompare(a.last_updated),
      );
  }, [all, query, manufacturer, severity, status]);

  const active = all.filter((s) => s.status === "active");
  const critical = active.filter((s) => s.severity === "critical");
  const affected = new Set(active.flatMap((s) => s.affected_manufacturers)).size;
  const filtersActive = query !== "" || manufacturer !== ALL || severity !== ALL || status !== "active";
  const ladderLevels = severities.length ? severities : severityOrder.slice(0, 4);

  // The open alert lives in the URL so it can be linked to from notifications and search.
  const selectedId = searchParams.get("alert");
  const selected = all.find((s) => s.shortage_id === selectedId);
  const openAlert = (id: string | null) =>
    router.replace(id ? `${pathname}?alert=${encodeURIComponent(id)}` : pathname, { scroll: false });

  const resetFilters = () => {
    setQuery("");
    setManufacturer(ALL);
    setSeverity(ALL);
    setStatus("active");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Module 03 · Shortage intelligence"
        title={
          shortages.data ? (
            <>
              {countWord(active.length)} shortage{active.length === 1 ? " is" : "s are"} active.{" "}
              <em className="font-normal">
                {critical.length === 0 ? "None" : countWord(critical.length)} {critical.length === 1 ? "is" : "are"} critical.
              </em>
            </>
          ) : (
            "Shortage monitoring"
          )
        }
        description={`Drug shortage records for oncology injectables, with severity, cause and the manufacturers affected. ${all.length} records monitored, ${all.length - active.length} resolved, ${affected} manufacturers named on an active record.`}
      />

      {critical.length > 0 ? (
        <div role="alert" className="relative overflow-hidden rounded-md border border-border bg-card">
          <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-status-critical" />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 py-3.5 pr-4 pl-6">
            <Siren aria-hidden className="size-5 shrink-0 text-status-critical" strokeWidth={1.5} />
            <div className="min-w-0 flex-1 basis-64">
              <p className="eyebrow text-foreground">
                Critical shortage alert · {critical.length} active record{critical.length === 1 ? "" : "s"}
              </p>
              <p className="mt-1 text-sm leading-5">
                <span className="font-medium">{[...new Set(critical.map((s) => s.drug_name))].join(", ")}</span>
                <span className="text-muted-foreground"> — affecting {[...new Set(critical.flatMap((s) => s.affected_manufacturers))].join(", ")}</span>
              </p>
            </div>
            <Button variant="outline" onClick={() => openAlert(critical[0].shortage_id)}>
              View alert
            </Button>
          </div>
          {mock ? (
            <p className="border-t border-border py-1.5 pr-4 pl-6 text-[11px] text-faint">
              Demonstration record from the mock provider — not a live FDA or regulatory alert.
            </p>
          ) : null}
        </div>
      ) : null}

      <SeverityLadder active={active} levels={ladderLevels} selected={severity} onSelect={setSeverity} loading={shortages.loading} />

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
        <Panel
          flush
          className="xl:col-span-8"
          index="01"
          title="Alert monitor"
          description={
            shortages.data
              ? `${filtered.length} of ${all.length} records shown · select a row for details`
              : shortages.error
                ? "Shortage records are unavailable"
                : "Loading shortage records"
          }
          source={shortages.meta?.source}
        >
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
            <div className="relative min-w-44 flex-1 sm:max-w-60">
              <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by drug"
                aria-label="Search shortages by drug"
                className="h-8 pl-8 text-xs"
              />
            </div>
            <Select value={manufacturer} onValueChange={setManufacturer}>
              <SelectTrigger aria-label="Filter by manufacturer" className={cn("h-8 max-w-52 min-w-40 text-xs", manufacturer !== ALL && "border-rule")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All manufacturers</SelectItem>
                {manufacturers.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger aria-label="Filter by severity" className={cn("h-8 min-w-32 text-xs", severity !== ALL && "border-rule")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All severities</SelectItem>
                {severities.map((level) => (
                  <SelectItem key={level} value={level}>
                    {SEVERITY_LABELS[level]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={status}
              onValueChange={(value) => (value ? setStatus(value) : undefined)}
              aria-label="Filter by status"
            >
              <ToggleGroupItem value="active" className="px-2.5 text-xs">
                Active
              </ToggleGroupItem>
              <ToggleGroupItem value="resolved" className="px-2.5 text-xs">
                Resolved
              </ToggleGroupItem>
              <ToggleGroupItem value={ALL} className="px-2.5 text-xs">
                All
              </ToggleGroupItem>
            </ToggleGroup>
            {filtersActive ? (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <FilterX aria-hidden /> Reset
              </Button>
            ) : null}
          </div>

          {shortages.error ? (
            <ErrorState message={shortages.error} onRetry={shortages.refetch} />
          ) : shortages.loading ? (
            <PanelSkeleton rows={7} className="p-4" />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No shortage records match"
              description="Adjust the search, manufacturer, severity or status filters."
              action={
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  Reset filters
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={cn(th, "pl-5")}>Drug</TableHead>
                  <TableHead className={th}>Manufacturer</TableHead>
                  <TableHead className={th}>Severity</TableHead>
                  <TableHead className={th}>Status</TableHead>
                  <TableHead className={th}>Reason</TableHead>
                  <TableHead className={cn(th, "pr-4 text-right")}>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((shortage) => (
                  <TableRow
                    key={shortage.shortage_id}
                    tabIndex={0}
                    data-state={shortage.shortage_id === selectedId ? "selected" : undefined}
                    onClick={() => openAlert(shortage.shortage_id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openAlert(shortage.shortage_id);
                      }
                    }}
                    aria-label={`Open details for ${shortage.drug_name}, ${shortage.manufacturer_name}`}
                    className={cn("cursor-pointer outline-none focus-visible:bg-accent data-[state=selected]:bg-accent", shortage.status === "resolved" && "text-muted-foreground")}
                  >
                    <TableCell className="relative py-2.5 pl-5">
                      {/* Severity rail: the row stays neutral, the edge carries the level. */}
                      <span
                        aria-hidden
                        className="absolute inset-y-0 left-0 w-[3px]"
                        style={{ background: toneColor[severityTone[shortage.severity]], opacity: shortage.status === "active" ? 1 : 0.3 }}
                      />
                      <p className="text-[13px] font-medium text-foreground">{shortage.drug_name}</p>
                      <p className="max-w-56 truncate text-[11px] text-muted-foreground">{shortage.presentation}</p>
                    </TableCell>
                    <TableCell className="max-w-48 truncate py-2.5 text-xs">{shortage.manufacturer_name}</TableCell>
                    <TableCell className="py-2.5">
                      <SeverityBadge severity={shortage.severity} />
                    </TableCell>
                    <TableCell className="py-2.5">
                      <ToneBadge tone={shortage.status === "active" ? "critical" : "good"}>{shortage.status === "active" ? "Active" : "Resolved"}</ToneBadge>
                    </TableCell>
                    <TableCell className="max-w-64 py-2.5 text-xs whitespace-normal text-muted-foreground">
                      <span className="line-clamp-2">{shortage.reason}</span>
                    </TableCell>
                    <TableCell className="tabular py-2.5 pr-4 text-right text-xs whitespace-nowrap">
                      {shortage.last_updated ? formatDate(shortage.last_updated) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Panel>

        <div className="flex min-w-0 flex-col gap-4 xl:col-span-4">
          <Panel index="02" title="Shortage trend" description="New and resolved records per month, with the active total" source={trend.meta?.source}>
            {trend.error ? (
              <ErrorState message={trend.error} onRetry={trend.refetch} />
            ) : !trend.data ? (
              <ChartSkeleton height={230} />
            ) : (
              <>
                <ShortageFlowChart data={trend.data} height={230} />
                <ChartLegend
                  className="mt-2 justify-center"
                  items={[
                    { label: "Active at month end", color: "var(--series-1)", line: true },
                    { label: "New", color: "var(--series-2)" },
                    { label: "Resolved", color: "var(--series-3)" },
                  ]}
                />
              </>
            )}
          </Panel>
          <Panel
            index="03"
            title="Active records by manufacturer"
            description="Select a manufacturer to filter the monitor"
            source={shortages.meta?.source}
          >
            {shortages.error ? (
              <p className="text-xs text-muted-foreground">Unavailable.</p>
            ) : shortages.loading ? (
              <PanelSkeleton rows={5} />
            ) : (
              <ManufacturerLoad active={active} selected={manufacturer} onSelect={setManufacturer} />
            )}
          </Panel>
        </div>
      </div>

      <ShortageDrawer shortage={selected} source={shortages.meta?.source} onClose={() => openAlert(null)} />
    </div>
  );
}

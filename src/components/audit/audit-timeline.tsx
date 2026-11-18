"use client";

import { ArrowRight, Download, FilterX, Search, SearchX } from "lucide-react";
import { useMemo, useState } from "react";
import { AUDIT_ACTION_META } from "@/components/dashboard/activity-panels";
import { ScenarioBadge } from "@/components/shared/badges";
import { EmptyState } from "@/components/shared/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SCENARIO_ORDER, SCENARIOS } from "@/lib/constants";
import { formatDate, formatPct, formatTime } from "@/lib/utils/format";
import { toneColor } from "@/lib/utils/risk";
import type { AllocationShare, AuditAction, AuditEvent } from "@/types";

const ALL = "all";

function describeShares(shares: AllocationShare[] | null): string {
  if (!shares?.length) return "";
  return shares.map((share) => `${share.manufacturer_name} ${formatPct(share.allocation_pct)}`).join("; ");
}

function ShareChips({ shares }: { shares: AllocationShare[] }) {
  return (
    <ul className="flex flex-wrap gap-1">
      {shares.map((share) => (
        <li key={share.manufacturer_id} className="rounded-[2px] border border-border px-1.5 py-0.5 text-[11px]">
          {share.manufacturer_name} <span className="tabular font-medium">{formatPct(share.allocation_pct)}</span>
        </li>
      ))}
    </ul>
  );
}

function exportCsv(events: AuditEvent[]) {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const header = ["event_id", "timestamp", "user", "role", "action", "supplier", "previous_allocation", "new_allocation", "reason", "scenario_mode", "recommendation_id"];
  const rows = events.map((event) =>
    [
      event.event_id,
      event.timestamp,
      event.user.name,
      event.user.role,
      event.action,
      event.supplier ?? "",
      describeShares(event.previous_allocation),
      describeShares(event.new_allocation),
      event.reason ?? "",
      event.scenario_mode,
      event.recommendation_id ?? "",
    ]
      .map(escape)
      .join(","),
  );
  const blob = new Blob([[header.join(","), ...rows].join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "pharmashield-audit-trail.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function AuditTimeline({ events }: { events: AuditEvent[] }) {
  const [query, setQuery] = useState("");
  const [action, setAction] = useState(ALL);
  const [scenario, setScenario] = useState(ALL);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return events.filter(
      (event) =>
        (action === ALL || event.action === action) &&
        (scenario === ALL || event.scenario_mode === scenario) &&
        (!term ||
          event.user.name.toLowerCase().includes(term) ||
          (event.supplier ?? "").toLowerCase().includes(term) ||
          (event.reason ?? "").toLowerCase().includes(term) ||
          (event.recommendation_id ?? "").toLowerCase().includes(term)),
    );
  }, [events, query, action, scenario]);

  // Group by calendar day so the timeline reads as a log.
  const groups = useMemo(() => {
    const byDay = new Map<string, AuditEvent[]>();
    filtered.forEach((event) => {
      const day = formatDate(event.timestamp);
      byDay.set(day, [...(byDay.get(day) ?? []), event]);
    });
    return [...byDay.entries()];
  }, [filtered]);

  const filtersActive = query !== "" || action !== ALL || scenario !== ALL;
  const reset = () => {
    setQuery("");
    setAction(ALL);
    setScenario(ALL);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
        <div className="relative min-w-48 flex-1 sm:max-w-72">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search user, supplier or reason"
            aria-label="Search audit events"
            className="h-8 pl-8 text-xs"
          />
        </div>
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger aria-label="Filter by action" className="h-8 min-w-44 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All actions</SelectItem>
            {(Object.keys(AUDIT_ACTION_META) as AuditAction[]).map((key) => (
              <SelectItem key={key} value={key}>
                {AUDIT_ACTION_META[key].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={scenario} onValueChange={setScenario}>
          <SelectTrigger aria-label="Filter by scenario mode" className="h-8 min-w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All scenarios</SelectItem>
            {SCENARIO_ORDER.map((mode) => (
              <SelectItem key={mode} value={mode}>
                {SCENARIOS[mode].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filtersActive ? (
          <Button variant="ghost" size="sm" onClick={reset}>
            <FilterX aria-hidden /> Reset
          </Button>
        ) : null}
        <Button variant="outline" size="sm" className="ml-auto" disabled={!filtered.length} onClick={() => exportCsv(filtered)}>
          <Download aria-hidden /> Export CSV
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No audit events match"
          description="Adjust the search or filters to see more of the trail."
          action={
            <Button variant="outline" size="sm" onClick={reset}>
              Reset filters
            </Button>
          }
        />
      ) : (
        <div>
          {groups.map(([day, dayEvents]) => (
            <section key={day} aria-label={day}>
              <h3 className="eyebrow sticky top-[76px] z-10 flex items-center gap-3 border-b border-border bg-surface-2 px-4 py-1.5 text-[9.5px] text-foreground">
                {day}
                <span className="text-faint">
                  {dayEvents.length} event{dayEvents.length === 1 ? "" : "s"}
                </span>
              </h3>
              <ol className="divide-y divide-border">
                {dayEvents.map((event) => {
                  const meta = AUDIT_ACTION_META[event.action];
                  return (
                    <li key={event.event_id} className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-x-3 px-4 py-3.5 sm:grid-cols-[4.5rem_1.25rem_minmax(0,1fr)]">
                      <time dateTime={event.timestamp} className="tabular pt-px text-xs text-muted-foreground">
                        {formatTime(event.timestamp)}
                        <span className="block text-[9.5px] text-faint">GST</span>
                      </time>
                      <span className="relative hidden justify-center sm:flex">
                        <span aria-hidden className="absolute -top-3.5 -bottom-3.5 w-px bg-border" />
                        <span
                          aria-hidden
                          className="relative mt-1 flex size-4 items-center justify-center rounded-[2px] bg-card ring-1 ring-border"
                        >
                          <meta.icon className="size-2.5" strokeWidth={2.5} style={{ color: toneColor[meta.tone] }} />
                        </span>
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                          <p className="text-[13px] font-medium">
                            {meta.label}
                            {event.supplier ? <span className="font-normal text-muted-foreground"> · {event.supplier}</span> : null}
                          </p>
                          <ScenarioBadge mode={event.scenario_mode} short className="h-4.5 text-[9.5px]" />
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          <span className="text-foreground">{event.user.name}</span> · {event.user.role}
                          <span className="tabular text-[10.5px] text-faint">
                            {event.recommendation_id ? ` · ${event.recommendation_id}` : ""} · {event.event_id}
                          </span>
                        </p>
                        {event.reason ? (
                          <p className="mt-2 border-l border-rule pl-3 text-[13px] leading-5">
                            <span className="sr-only">Reason: </span>
                            {event.reason}
                          </p>
                        ) : null}
                        {event.previous_allocation || event.new_allocation ? (
                          <div className="mt-2.5 grid items-start gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
                            <div>
                              <p className="eyebrow mb-1 text-[9.5px]">Previous allocation</p>
                              {event.previous_allocation ? (
                                <ShareChips shares={event.previous_allocation} />
                              ) : (
                                <p className="text-xs text-muted-foreground">Not recorded</p>
                              )}
                            </div>
                            <ArrowRight aria-hidden className="mt-5 hidden size-3.5 text-muted-foreground sm:block" />
                            <div>
                              <p className="eyebrow mb-1 text-[9.5px] text-foreground">New allocation</p>
                              {event.new_allocation ? (
                                <ShareChips shares={event.new_allocation} />
                              ) : (
                                <p className="text-xs text-muted-foreground">{event.action === "rejected" ? "Unchanged (rejected)" : "Not recorded"}</p>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

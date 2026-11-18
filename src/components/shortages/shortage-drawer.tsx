"use client";

import type { ReactNode } from "react";
import { DataSourceBadge, SeverityBadge, ToneBadge } from "@/components/shared/badges";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatDate } from "@/lib/utils/format";
import { severityTone, toneColor } from "@/lib/utils/risk";
import type { DataSource, Shortage } from "@/types";

const alertTypeLabels: Record<Shortage["regulatory_alerts"][number]["type"], string> = {
  recall: "Recall",
  warning_letter: "Warning letter",
  import_alert: "Import alert",
  safety_communication: "Safety communication",
  notice: "Notice",
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-3 py-2.5 text-[13px]">
      <dt className="eyebrow pt-0.5 text-[9.5px]">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-border px-5 py-4">
      <h3 className="eyebrow">{title}</h3>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

/** Alert detail panel. Opens beside the monitor so the list stays in view. */
export function ShortageDrawer({
  shortage,
  source,
  onClose,
}: {
  shortage: Shortage | undefined;
  source: DataSource | undefined;
  onClose: () => void;
}) {
  const alerts = shortage ? [...shortage.regulatory_alerts].sort((a, b) => b.date.localeCompare(a.date)) : [];
  return (
    <Sheet open={!!shortage} onOpenChange={(open) => (open ? undefined : onClose())}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-lg">
        {shortage ? (
          <>
            <SheetHeader className="relative px-5 pt-5 pr-12 pb-4">
              <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: toneColor[severityTone[shortage.severity]] }} />
              <p className="eyebrow flex flex-wrap items-center gap-x-3 gap-y-1">
                Shortage record · <span className="text-foreground">{shortage.shortage_id}</span>
                <DataSourceBadge source={source} />
              </p>
              <SheetTitle className="mt-1.5 font-serif text-[1.75rem] leading-9 font-light tracking-[-0.02em]">{shortage.drug_name}</SheetTitle>
              <SheetDescription className="text-xs">{shortage.presentation || "Presentation not stated"}</SheetDescription>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <SeverityBadge severity={shortage.severity} />
                <ToneBadge tone={shortage.status === "active" ? "critical" : "good"}>{shortage.status === "active" ? "Active" : "Resolved"}</ToneBadge>
              </div>
            </SheetHeader>

            {source === "mock" ? (
              <p className="mx-5 mb-4 border border-dashed border-status-warning/60 px-3 py-2 text-xs leading-5 text-muted-foreground">
                Demonstration record created for the prototype. It is not a live FDA or regulatory alert.
              </p>
            ) : null}

            <dl className="divide-y divide-border border-t border-border px-5">
              <Row label="Manufacturer">
                <span className="font-medium">{shortage.manufacturer_name}</span>
              </Row>
              <Row label="Reason">{shortage.reason}</Row>
              <Row label="Therapeutic category">{shortage.therapeutic_category || "—"}</Row>
              <Row label="First posted">
                <span className="tabular">{shortage.initial_posting_date ? formatDate(shortage.initial_posting_date) : "—"}</span>
              </Row>
              <Row label="Last updated">
                <span className="tabular">{shortage.last_updated ? formatDate(shortage.last_updated) : "—"}</span>
              </Row>
            </dl>

            <Section title="Availability">
              <p className="text-[13px] leading-5.5">{shortage.availability_note || "No availability note provided."}</p>
            </Section>

            <Section title={`Affected manufacturers · ${shortage.affected_manufacturers.length}`}>
              <ul className="divide-y divide-border border-y border-border">
                {shortage.affected_manufacturers.map((name, i) => (
                  <li key={name} className="flex items-center gap-3 py-2 text-[13px]">
                    <span className="tabular text-[11px] text-faint">{String(i + 1).padStart(2, "0")}</span>
                    {name}
                  </li>
                ))}
              </ul>
            </Section>

            <Section title={`Regulatory alert timeline · ${alerts.length}`}>
              {alerts.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">No related regulatory alerts on record.</p>
              ) : (
                <ol className="relative space-y-4 before:absolute before:top-1.5 before:bottom-1.5 before:left-[3px] before:w-px before:bg-border">
                  {alerts.map((alert) => (
                    <li key={`${alert.title}-${alert.date}`} className="relative pl-5">
                      <span aria-hidden className="absolute top-[5px] left-0 size-[7px] rounded-[1px] bg-status-serious ring-2 ring-popover" />
                      <p className="tabular text-[10.5px] text-muted-foreground">
                        {formatDate(alert.date)} · {alert.agency}
                      </p>
                      <p className="mt-0.5 text-[13px] leading-5 font-medium">{alert.title}</p>
                      <p className="eyebrow mt-0.5 text-[9.5px]">{alertTypeLabels[alert.type]}</p>
                    </li>
                  ))}
                </ol>
              )}
            </Section>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

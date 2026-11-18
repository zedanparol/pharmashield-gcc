"use client";

import {
  Check,
  ClipboardList,
  FileSearch,
  Factory,
  PackageSearch,
  PenLine,
  Radio,
  Scale,
  Send,
  Sparkles,
  Tag,
  Truck,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { SeverityBadge } from "@/components/shared/badges";
import { EmptyState } from "@/components/shared/panel";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import { severityTone, toneColor, type Tone } from "@/lib/utils/risk";
import type { AuditAction, AuditEvent, Shortage, SupplierUpdate } from "@/types";

export const AUDIT_ACTION_META: Record<AuditAction, { label: string; icon: LucideIcon; tone: Tone }> = {
  recommendation_generated: { label: "Recommendation generated", icon: Sparkles, tone: "info" },
  submitted_for_review: { label: "Submitted for review", icon: Send, tone: "info" },
  approved: { label: "Approved", icon: Check, tone: "good" },
  overridden: { label: "Overridden", icon: PenLine, tone: "warning" },
  rejected: { label: "Rejected", icon: X, tone: "critical" },
  scenario_changed: { label: "Scenario changed", icon: Radio, tone: "neutral" },
  demand_updated: { label: "Demand updated", icon: Scale, tone: "neutral" },
  document_analysed: { label: "Document analysed", icon: FileSearch, tone: "neutral" },
};

const updateIcons: Record<SupplierUpdate["type"], LucideIcon> = {
  inspection: ClipboardList,
  qualification: Factory,
  shortage: PackageSearch,
  pricing: Tag,
  logistics: Truck,
};

/** Active critical and high-severity shortages. A coloured rail marks severity; the row itself stays neutral. */
export function CriticalAlerts({ shortages, limit }: { shortages: Shortage[]; limit?: number }) {
  const rank = { critical: 0, high: 1, moderate: 2, low: 3, unclassified: 4 } as const;
  const alerts = shortages
    .filter((s) => s.status === "active" && (s.severity === "critical" || s.severity === "high"))
    .sort((a, b) => rank[a.severity] - rank[b.severity]);

  if (!alerts.length) {
    return <EmptyState title="No critical alerts" description="There are no active critical or high-severity shortages." className="py-8" />;
  }
  return (
    <ul className="divide-y divide-border">
      {alerts.slice(0, limit ?? alerts.length).map((alert) => (
        <li key={alert.shortage_id}>
          <Link
            href={`/shortages?alert=${encodeURIComponent(alert.shortage_id)}`}
            className="relative block py-3 pr-4 pl-5 outline-none transition-colors hover:bg-accent/60 focus-visible:bg-accent/60"
          >
            <span aria-hidden className="absolute inset-y-0 left-0 w-[3px]" style={{ background: toneColor[severityTone[alert.severity]] }} />
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 truncate text-[13px] font-medium">{alert.drug_name}</p>
              <SeverityBadge severity={alert.severity} />
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{alert.manufacturer_name}</p>
            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{alert.reason}</p>
            <p className="tabular mt-1 text-[10.5px] text-faint">
              {alert.shortage_id} · updated {formatDate(alert.last_updated)}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function SupplierUpdates({ updates, limit = 4 }: { updates: SupplierUpdate[]; limit?: number }) {
  if (!updates.length) return <EmptyState title="No recent updates" className="py-8" />;
  return (
    <ul className="divide-y divide-border">
      {updates.slice(0, limit).map((update) => {
        const Icon = updateIcons[update.type];
        return (
          <li key={update.update_id}>
            <Link
              href={`/suppliers/${update.manufacturer_id}`}
              className="flex gap-3 px-4 py-2.5 outline-none transition-colors hover:bg-accent/60 focus-visible:bg-accent/60"
            >
              <Icon aria-hidden className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.6} />
              <span className="min-w-0">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-[13px] font-medium">{update.manufacturer_name}</span>
                  <span className="eyebrow shrink-0 text-[9.5px] text-faint">{update.type}</span>
                </span>
                <span className="line-clamp-2 text-xs leading-4.5 text-muted-foreground">{update.message}</span>
                <span className="tabular mt-0.5 block text-[10.5px] text-faint">{formatDateTime(update.timestamp)}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Compact decision log: one line per event on a hairline spine. */
export function AuditFeed({ events, limit = 5 }: { events: AuditEvent[]; limit?: number }) {
  if (!events.length) return <EmptyState title="No audit events yet" className="py-8" />;
  return (
    <ol className="relative space-y-3.5 before:absolute before:top-1.5 before:bottom-1.5 before:left-[3px] before:w-px before:bg-border">
      {events.slice(0, limit).map((event) => {
        const meta = AUDIT_ACTION_META[event.action];
        return (
          <li key={event.event_id} className="relative pl-5">
            <span
              aria-hidden
              className="absolute top-[5px] left-0 size-[7px] rounded-[1px] ring-2 ring-background"
              style={{ background: toneColor[meta.tone] }}
            />
            <p className="text-[13px] leading-4.5">
              <span className="font-medium">{meta.label}</span>
              {event.supplier ? <span className="text-muted-foreground"> · {event.supplier}</span> : null}
            </p>
            <p className="tabular mt-0.5 text-[10.5px] text-faint">
              {formatDateTime(event.timestamp)} · {event.user.name}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

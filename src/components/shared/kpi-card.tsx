"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toneColor, type Tone } from "@/lib/utils/risk";
import { InfoTip } from "./info-tip";

/**
 * Rolls a figure over when it changes, so a scenario or demand switch reads
 * as an update rather than a silent swap. Non-text children render as-is.
 */
export function SwapValue({ children, className }: { children: ReactNode; className?: string }) {
  const key = typeof children === "string" || typeof children === "number" ? String(children) : undefined;
  if (key === undefined) return <span className={className}>{children}</span>;
  return (
    <span className={cn("-my-1 inline-flex overflow-hidden py-1 pr-[0.08em]", className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={key}
          className="inline-block"
          initial={{ y: "55%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-55%", opacity: 0 }}
          transition={{ duration: 0.26, ease: [0.2, 0.7, 0.3, 1] }}
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/**
 * A row of measured figures on one plate, divided by hairlines. Replaces a
 * grid of separate stat cards: the figures read as one instrument.
 */
export function MetricStrip({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <div role="group" aria-label={label} className="overflow-hidden rounded-md border border-border bg-card">
      <div className={cn("-mr-px -mb-px grid", className)}>{children}</div>
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: ReactNode;
  /** Unit or qualifier shown after the value, e.g. "of 10". */
  suffix?: ReactNode;
  caption?: ReactNode;
  /** Kept for call-site compatibility; metrics are typographic and render no icon. */
  icon?: LucideIcon;
  tone?: Tone;
  info?: ReactNode;
  href?: string;
  loading?: boolean;
  /** Larger figure for the lead metric of a strip. */
  emphasis?: boolean;
  className?: string;
}

/** One measured figure: mono label, mono value, one line of context. Lives inside a MetricStrip. */
export function KpiCard({ label, value, suffix, caption, tone = "info", info, href, loading, emphasis, className }: KpiCardProps) {
  const flagged = tone === "critical" || tone === "serious" || tone === "warning" || tone === "good";
  // Long figures (currency totals) step down a size on narrow screens so they never clip.
  const long = typeof value === "string" && value.length > 7;
  return (
    <div
      className={cn(
        "group relative min-w-0 border-r border-b border-border px-4 pt-3.5 pb-4 transition-colors",
        href && "hover:bg-accent/50 has-[a:focus-visible]:bg-accent/50",
        className,
      )}
    >
      {/* A stretched link makes the whole cell clickable while the info button stays a separate control. */}
      {href ? (
        <Link
          href={href}
          aria-label={`${label}: open details`}
          className="absolute inset-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        />
      ) : null}
      <div className="flex items-start justify-between gap-2">
        <p className="eyebrow flex min-w-0 items-center gap-1.5">
          <span className="min-w-0">{label}</span>
          {info ? (
            <InfoTip label={`About ${label}`} className="relative z-[1]">
              {info}
            </InfoTip>
          ) : null}
        </p>
        {href ? (
          <ArrowUpRight
            aria-hidden
            className="size-3.5 shrink-0 -translate-x-1 translate-y-1 text-muted-foreground opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100"
          />
        ) : null}
      </div>
      {loading ? (
        <Skeleton className={cn("mt-3 w-24", emphasis ? "h-11" : "h-8")} />
      ) : (
        <p className="mt-3 flex min-w-0 items-baseline gap-2">
          <SwapValue className={cn("figure min-w-0", emphasis ? "text-[44px]" : long ? "text-[21px] sm:text-[30px]" : "text-[30px]")}>{value}</SwapValue>
          {suffix ? <span className="truncate text-xs text-muted-foreground">{suffix}</span> : null}
        </p>
      )}
      {loading ? (
        <Skeleton className="mt-2.5 h-3.5 w-32" />
      ) : caption ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs leading-4 text-muted-foreground">
          {flagged ? <span aria-hidden className="size-1.5 shrink-0 rounded-[1px]" style={{ background: toneColor[tone] }} /> : null}
          <span className="min-w-0">{caption}</span>
        </p>
      ) : null}
    </div>
  );
}

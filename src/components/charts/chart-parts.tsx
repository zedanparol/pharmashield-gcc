import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared axis tick style: muted ink, monospace figures. */
export const axisTick = {
  fill: "var(--muted-foreground)",
  fontSize: 10.5,
  fontFamily: "var(--font-mono)",
  letterSpacing: "-0.01em",
} as const;

export interface TooltipRow {
  label: string;
  value: ReactNode;
  color?: string;
  /** Render the swatch as a line key rather than a block. */
  line?: boolean;
}

/** Tooltip surface shared by every chart so hover behaviour is identical everywhere. */
export function ChartTooltipCard({ title, rows, footer }: { title?: ReactNode; rows: TooltipRow[]; footer?: ReactNode }) {
  return (
    <div className="min-w-40 rounded-[4px] border border-rule bg-popover px-3 py-2.5 text-xs text-popover-foreground shadow-xl shadow-black/20">
      {title ? <p className="eyebrow mb-2 text-foreground">{title}</p> : null}
      <ul className="space-y-1.5">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-5">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              {row.color ? (
                <span aria-hidden className={row.line ? "h-0.5 w-3" : "size-2 rounded-[1px]"} style={{ background: row.color }} />
              ) : null}
              {row.label}
            </span>
            <span className="tabular font-medium">{row.value}</span>
          </li>
        ))}
      </ul>
      {footer ? <p className="mt-2 border-t border-border pt-2 text-[11px] text-muted-foreground">{footer}</p> : null}
    </div>
  );
}

export interface LegendItem {
  label: string;
  color: string;
  value?: ReactNode;
  line?: boolean;
}

/** Legend in text tokens; the swatch beside each label carries the series colour. */
export function ChartLegend({ items, className, vertical }: { items: LegendItem[]; className?: string; vertical?: boolean }) {
  return (
    <ul className={cn("flex text-xs", vertical ? "flex-col gap-1.5" : "flex-wrap gap-x-4 gap-y-1.5", className)}>
      {items.map((item) => (
        <li key={item.label} className={cn("flex items-center gap-1.5", vertical && "justify-between gap-4")}>
          <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
            <span aria-hidden className={cn("shrink-0", item.line ? "h-0.5 w-3" : "size-2 rounded-[1px]")} style={{ background: item.color }} />
            <span className="truncate">{item.label}</span>
          </span>
          {item.value !== undefined ? <span className="tabular font-medium text-foreground">{item.value}</span> : null}
        </li>
      ))}
    </ul>
  );
}

export interface Segment {
  key: string;
  label: string;
  value: number;
  color: string;
  /** Text printed inside the block when it fits. */
  display?: string;
  /** Use near-black ink on light fills (yellow / warning). */
  darkInk?: boolean;
}

/**
 * One whole split into parts. Blocks are separated by a 2px surface gap, and
 * a block prints its share only when it is wide enough to hold it.
 */
export function SegmentedBar({ segments, total, ariaLabel, className }: { segments: Segment[]; total?: number; ariaLabel: string; className?: string }) {
  const sum = total ?? segments.reduce((acc, s) => acc + s.value, 0);
  const visible = segments.filter((s) => s.value > 0);
  const summary = visible.map((s) => `${s.label} ${s.display ?? s.value}`).join(", ");
  return (
    <div role="img" aria-label={`${ariaLabel}: ${summary}`} className={cn("flex h-7 w-full gap-0.5", className)}>
      {visible.map((segment) => {
        const share = sum > 0 ? (segment.value / sum) * 100 : 0;
        return (
          <div
            key={segment.key}
            title={`${segment.label}: ${segment.display ?? segment.value}`}
            className="flex min-w-1 items-center overflow-hidden rounded-[2px] px-1.5 transition-[flex-grow] duration-500 ease-out"
            style={{ flexGrow: segment.value, flexBasis: 0, background: segment.color }}
          >
            {share >= 12 && segment.display ? (
              <span className={cn("tabular text-[11px] font-medium", segment.darkInk ? "text-[#0b0b0b]" : "text-white")}>{segment.display}</span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

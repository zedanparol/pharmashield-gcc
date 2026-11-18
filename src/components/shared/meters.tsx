import { cn } from "@/lib/utils";
import { formatScore } from "@/lib/utils/format";
import { riskTone, toneColor } from "@/lib/utils/risk";

interface MeterProps {
  value: number;
  className?: string;
  /** Hide the numeric label (when the number is printed elsewhere). */
  bare?: boolean;
  label?: string;
}

const CELLS = 10;

/**
 * Risk meter for a 0–1 LOWER-IS-BETTER value: ten cells, one per tenth,
 * filled left to right. The cell form is reserved for risk so it is never
 * mistaken for the TOPSIS bar.
 */
export function RiskMeter({ value, className, bare, label }: MeterProps) {
  const color = toneColor[riskTone(value)];
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={value}
        aria-label={label ?? "Risk score, lower is better"}
        className="flex h-2 min-w-12 flex-1 gap-px"
      >
        {Array.from({ length: CELLS }, (_, i) => {
          const fill = Math.min(1, Math.max(0, value * CELLS - i));
          return (
            <span key={i} className="relative h-full flex-1 overflow-hidden rounded-[1px] bg-foreground/10">
              {fill > 0 ? <span className="absolute inset-y-0 left-0" style={{ width: `${fill * 100}%`, background: color }} /> : null}
            </span>
          );
        })}
      </div>
      {bare ? null : <span className="tabular w-8 text-right text-xs">{formatScore(value)}</span>}
    </div>
  );
}

/**
 * TOPSIS closeness for a 0–1 HIGHER-IS-BETTER value: a continuous blue bar
 * with a needle at the score. A different form and colour family from risk.
 */
export function TopsisMeter({ value, className, bare, label }: MeterProps) {
  const pct = Math.max(1, Math.min(100, value * 100));
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={value}
        aria-label={label ?? "TOPSIS score, higher is better"}
        className="relative h-2 min-w-12 flex-1"
      >
        <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-foreground/20" />
        <span className="absolute top-1/2 left-0 h-[3px] -translate-y-1/2 bg-signal transition-[width] duration-500 ease-out" style={{ width: `${pct}%` }} />
        <span className="absolute top-0 h-full w-[2px] -translate-x-1/2 bg-signal transition-[left] duration-500 ease-out" style={{ left: `${pct}%` }} />
      </div>
      {bare ? null : <span className="tabular w-8 text-right text-xs font-medium">{formatScore(value)}</span>}
    </div>
  );
}

/** Signed rank movement: up (better) or down (worse) versus the baseline. */
export function RankDelta({ from, to, className }: { from: number; to: number; className?: string }) {
  const delta = from - to;
  if (delta === 0) {
    return <span className={cn("tabular text-xs text-faint", className)}>—</span>;
  }
  const up = delta > 0;
  return (
    <span
      className={cn("tabular inline-flex items-center gap-0.5 text-xs font-medium", className)}
      title={`${up ? "Up" : "Down"} ${Math.abs(delta)} from rank ${from}`}
    >
      <span aria-hidden className="text-[9px]" style={{ color: up ? "var(--status-good)" : "var(--status-critical)" }}>
        {up ? "▲" : "▼"}
      </span>
      {Math.abs(delta)}
      <span className="sr-only">{up ? "places up" : "places down"}</span>
    </span>
  );
}

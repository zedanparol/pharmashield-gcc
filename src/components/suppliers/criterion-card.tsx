import { InfoTip } from "@/components/shared/info-tip";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CRITERIA, SCENARIOS } from "@/lib/constants";
import { formatRatio, formatScore } from "@/lib/utils/format";
import { riskTone, toneColor } from "@/lib/utils/risk";
import type { CriterionKey, ScenarioMode } from "@/types";

interface CriterionRowProps {
  criterion: CriterionKey;
  value: number;
  /** Median of the same criterion across all evaluated manufacturers. */
  poolMedian: number;
  weight: number;
  mode: ScenarioMode;
  /** Raw figure behind the normalised score, e.g. "$31.40 per vial". */
  rawLabel?: string;
}

const toneWord = { good: "Low", warning: "Moderate", critical: "High", serious: "High", neutral: "", info: "" } as const;

/**
 * One criterion on a fixed 0–1 ruler. Left is always better. The diamond is
 * this manufacturer; the tick is the pool median. Five of these stacked on a
 * shared scale read as one comparison rather than five separate cards.
 */
export function CriterionRow({ criterion, value, poolMedian, weight, mode, rawLabel }: CriterionRowProps) {
  const meta = CRITERIA[criterion];
  const tone = riskTone(value);
  const color = toneColor[tone];
  const versus = value - poolMedian;

  return (
    <li className="grid items-center gap-x-5 gap-y-2 px-4 py-3.5 md:grid-cols-[minmax(0,15rem)_8rem_minmax(0,1fr)_minmax(0,13rem)]">
      <div className="min-w-0">
        <p className="flex items-center gap-2">
          <span className="tabular text-[11px] font-medium text-muted-foreground">{meta.code}</span>
          <span className="truncate text-[13px] font-medium">{meta.label}</span>
          <InfoTip label={`About ${meta.label}`}>
            <span className="block">{meta.description}</span>
            <span className="mt-1.5 block">
              <strong>0.00</strong> — {meta.lowMeans}.
            </span>
            <span className="block">
              <strong>1.00</strong> — {meta.highMeans}.
            </span>
            <span className="mt-1.5 block">
              Carries {formatRatio(weight)} of the ranking weight in {SCENARIOS[mode].label}.
            </span>
          </InfoTip>
        </p>
        <p className="eyebrow mt-0.5 text-[9.5px] text-faint">Weight {formatRatio(weight)}</p>
      </div>

      <p className="flex items-baseline gap-2">
        <span className="figure text-[26px]">{formatScore(value)}</span>
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <span aria-hidden className="size-1.5 rounded-[1px]" style={{ background: color }} />
          {toneWord[tone]}
        </span>
      </p>

      <div>
        <div
          role="meter"
          aria-valuemin={0}
          aria-valuemax={1}
          aria-valuenow={value}
          aria-label={`${meta.label}: ${formatScore(value)} on a 0 to 1 scale, lower is better. Pool median ${formatScore(poolMedian)}.`}
          className="ticks relative h-4"
        >
          <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[var(--chart-axis)]" />
          <span className="absolute top-1/2 left-0 h-[3px] -translate-y-1/2" style={{ width: `${value * 100}%`, background: color }} />
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                tabIndex={0}
                className="absolute top-0 h-full w-[2px] -translate-x-1/2 bg-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{ left: `${poolMedian * 100}%` }}
              />
            </TooltipTrigger>
            <TooltipContent className="text-xs">Pool median {formatScore(poolMedian)}</TooltipContent>
          </Tooltip>
          <span
            aria-hidden
            className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 ring-2 ring-card"
            style={{ left: `${value * 100}%`, background: color }}
          />
        </div>
        <div className="eyebrow mt-1 flex justify-between text-[9px] text-faint">
          <span>0 better</span>
          <span>worse 1</span>
        </div>
      </div>

      <div className="min-w-0 text-xs leading-4.5">
        {rawLabel ? <p className="truncate font-medium">{rawLabel}</p> : null}
        <p className="text-muted-foreground">
          {Math.abs(versus) < 0.005 ? (
            "In line with the pool median"
          ) : (
            <>
              <span className="tabular text-foreground">{formatScore(Math.abs(versus))}</span> {versus < 0 ? "better" : "worse"} than median{" "}
              <span className="tabular">{formatScore(poolMedian)}</span>
            </>
          )}
        </p>
      </div>
    </li>
  );
}

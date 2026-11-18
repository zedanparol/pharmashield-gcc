"use client";

import Link from "next/link";
import { QualificationBadge } from "@/components/shared/badges";
import { TopsisMeter } from "@/components/shared/meters";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CRITERIA, CRITERION_KEYS, RISK_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { formatScore } from "@/lib/utils/format";
import type { CriterionWeights, Supplier } from "@/types";

/**
 * One 0–1 lower-is-better score as a heat cell. A single hue carries
 * magnitude (darker = riskier) and the figure is always printed, so the cell
 * never relies on colour alone.
 */
export function HeatCell({ value, className, title }: { value: number; className?: string; title?: string }) {
  return (
    <span
      title={title}
      data-hot={value >= 0.62}
      className={cn(
        "tabular flex h-7 min-w-11 items-center justify-center rounded-[2px] text-[11px] dark:data-[hot=true]:font-medium dark:data-[hot=true]:text-[#0b0b0b]",
        className,
      )}
      style={{ background: `color-mix(in oklab, var(--heat) ${Math.round(5 + value * 73)}%, transparent)` }}
    >
      {formatScore(value)}
    </span>
  );
}

export function HeatScale({ className }: { className?: string }) {
  return (
    <p className={cn("flex items-center gap-2 text-[11px] text-muted-foreground", className)}>
      <span className="tabular">0.00</span>
      <span aria-hidden className="flex gap-px">
        {[0.05, 0.25, 0.45, 0.65, 0.85].map((v) => (
          <span key={v} className="h-2 w-4 rounded-[1px]" style={{ background: `color-mix(in oklab, var(--heat) ${Math.round(5 + v * 73)}%, transparent)` }} />
        ))}
      </span>
      <span className="tabular">1.00</span>
      <span>· risk score, lower is better</span>
    </p>
  );
}

const th = "h-9 px-2 text-left align-bottom font-mono text-[10px] leading-4 font-medium tracking-[0.1em] text-muted-foreground uppercase";

interface RiskMatrixProps {
  suppliers: Supplier[];
  weights: CriterionWeights;
  activeId?: string | null;
  onActiveChange?: (id: string | null) => void;
}

/**
 * Ranking and risk in one table: TOPSIS (higher is better) on the left as a
 * blue needle bar, the five criteria and overall risk (lower is better) on
 * the right as heat cells. Two forms, so the two scales cannot be confused.
 */
export function RiskMatrix({ suppliers, weights, activeId, onActiveChange }: RiskMatrixProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[52rem] border-collapse text-xs">
        <caption className="sr-only">
          Manufacturers ranked by TOPSIS score, with the five risk criteria and overall risk. TOPSIS: higher is better. Criteria and risk: lower
          is better.
        </caption>
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className={cn(th, "w-10 pl-4")}>
              #
            </th>
            <th scope="col" className={th}>
              Manufacturer
            </th>
            <th scope="col" className={cn(th, "w-44")}>
              TOPSIS <span className="text-signal">↑</span>
              <span className="block text-[9px] tracking-[0.08em] text-faint normal-case">higher is better</span>
            </th>
            {CRITERION_KEYS.map((key) => (
              <th key={key} scope="col" className={cn(th, "h-14 w-[4.75rem] pb-1.5 text-center")}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0} className="block cursor-help rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <span className="text-foreground">{CRITERIA[key].code}</span>
                      <span className="block text-[9px] tracking-[0.08em]">{CRITERIA[key].shortLabel}</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-72 text-xs leading-5 font-normal tracking-normal normal-case">
                    <strong>{CRITERIA[key].label}.</strong> {CRITERIA[key].description} Lower is better.
                  </TooltipContent>
                </Tooltip>
                <span className="tabular block text-[9px] tracking-normal text-faint normal-case">w {formatScore(weights[key])}</span>
              </th>
            ))}
            <th scope="col" className={cn(th, "w-40 pr-4")}>
              Overall risk <span className="text-foreground">↓</span>
              <span className="block text-[9px] tracking-[0.08em] text-faint normal-case">lower is better</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {suppliers.map((supplier) => {
            const active = supplier.manufacturer_id === activeId;
            return (
              <tr
                key={supplier.manufacturer_id}
                onMouseEnter={() => onActiveChange?.(supplier.manufacturer_id)}
                onMouseLeave={() => onActiveChange?.(null)}
                className={cn(
                  "border-b border-border transition-colors last:border-b-0",
                  active ? "bg-accent" : "hover:bg-accent/60",
                  supplier.qualification_status === "disqualified" && "opacity-70",
                )}
              >
                <td className="tabular py-1.5 pr-2 pl-4 text-muted-foreground">{String(supplier.rank).padStart(2, "0")}</td>
                <td className="px-2 py-1.5">
                  <Link
                    href={`/suppliers/${supplier.manufacturer_id}`}
                    className="rounded-sm text-[13px] font-medium outline-none hover:underline hover:underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {supplier.manufacturer_name}
                  </Link>
                  <span className="ml-2 text-[11px] whitespace-nowrap text-muted-foreground">{supplier.manufacturing_country}</span>
                  {supplier.qualification_status !== "qualified" ? (
                    <QualificationBadge status={supplier.qualification_status} className="ml-2 h-4.5 align-middle text-[9.5px]" />
                  ) : null}
                </td>
                <td className="px-2 py-1.5">
                  <TopsisMeter value={supplier.topsis_score} />
                </td>
                {CRITERION_KEYS.map((key) => (
                  <td key={key} className="p-0.5">
                    <HeatCell value={supplier[key]} title={`${CRITERIA[key].label}: ${formatScore(supplier[key], 3)} · lower is better`} />
                  </td>
                ))}
                <td className="py-0.5 pr-4 pl-2">
                  <span className="flex items-center gap-2.5">
                    <HeatCell value={supplier.overall_risk} className="min-w-12 border border-foreground/15" />
                    <span className="text-[11px] whitespace-nowrap text-muted-foreground">{RISK_LABELS[supplier.risk_category]}</span>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

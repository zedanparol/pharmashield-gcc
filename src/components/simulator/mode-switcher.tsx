"use client";

import { motion } from "framer-motion";
import { Coins, ShieldCheck, Siren, type LucideIcon } from "lucide-react";
import { SCENARIO_ORDER, SCENARIOS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ScenarioMode } from "@/types";

export const MODE_VISUALS: Record<ScenarioMode, { icon: LucideIcon; color: string }> = {
  normal: { icon: ShieldCheck, color: "var(--signal)" },
  hormuz_crisis: { icon: Siren, color: "var(--status-critical)" },
  cost_focus: { icon: Coins, color: "var(--status-warning)" },
};

/**
 * Scenario console: three positions on one plate. A radio group, so arrow
 * keys move between modes; the coloured bar slides to the active position.
 */
export function ModeSwitcher({ mode, onChange, busy }: { mode: ScenarioMode; onChange: (mode: ScenarioMode) => void; busy?: boolean }) {
  return (
    <div
      role="radiogroup"
      aria-label="Scenario mode"
      className="grid overflow-hidden rounded-md border border-border bg-card md:grid-cols-3 md:divide-x md:divide-border max-md:divide-y max-md:divide-border"
    >
      {SCENARIO_ORDER.map((option, index) => {
        const meta = SCENARIOS[option];
        const { icon: Icon, color } = MODE_VISUALS[option];
        const active = option === mode;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => (active ? undefined : onChange(option))}
            onKeyDown={(event) => {
              const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
              if (!step) return;
              event.preventDefault();
              const next = SCENARIO_ORDER[(index + step + SCENARIO_ORDER.length) % SCENARIO_ORDER.length];
              onChange(next);
              (event.currentTarget.parentElement?.children[SCENARIO_ORDER.indexOf(next)] as HTMLElement | undefined)?.focus();
            }}
            className={cn(
              "group relative flex flex-col px-5 pt-5 pb-4 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              active ? "" : "hover:bg-accent/50",
              busy && active && "cursor-progress",
            )}
          >
            {active ? (
              <>
                <motion.span
                  layoutId="active-mode-bar"
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-[3px]"
                  style={{ background: color }}
                  transition={{ type: "spring", stiffness: 420, damping: 38 }}
                />
                <motion.span
                  layoutId="active-mode-wash"
                  aria-hidden
                  className="absolute inset-0"
                  style={{ background: `linear-gradient(to bottom, color-mix(in oklab, ${color} 10%, transparent), transparent 70%)` }}
                  transition={{ type: "spring", stiffness: 420, damping: 38 }}
                />
              </>
            ) : null}
            <span className="relative flex items-center justify-between gap-2">
              <span className="eyebrow flex items-center gap-2">
                <span className={active ? "text-foreground" : undefined}>Mode {String(index + 1).padStart(2, "0")}</span>
              </span>
              <span
                className={cn(
                  "eyebrow flex items-center gap-1.5 transition-opacity",
                  active ? "text-foreground" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
                )}
              >
                {active ? <span aria-hidden className="size-1.5 rounded-full" style={{ background: color }} /> : null}
                {active ? "Active" : "Switch"}
              </span>
            </span>
            <span className="relative mt-3 flex items-center gap-2.5">
              <Icon aria-hidden className="size-5 shrink-0" strokeWidth={1.5} style={{ color: active ? color : "var(--muted-foreground)" }} />
              <span className={cn("font-serif text-[1.375rem] leading-7 tracking-[-0.015em]", active ? "" : "text-muted-foreground group-hover:text-foreground")}>
                {meta.label}
              </span>
            </span>
            <span className="relative mt-2 text-xs leading-5 text-muted-foreground">{meta.description}</span>
            <span className="tabular relative mt-3 border-t border-border pt-2.5 text-[11px] text-foreground/80">{meta.shift}</span>
          </button>
        );
      })}
    </div>
  );
}

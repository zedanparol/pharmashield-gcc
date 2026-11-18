import type { RiskCategory, Severity } from "@/types";

export type Tone = "good" | "warning" | "serious" | "critical" | "neutral" | "info";

/**
 * Presentation-only banding for colouring a single 0–1 lower-is-better
 * value (e.g. one criterion meter). The supplier's overall `risk_category`
 * always comes from the backend and is never derived here.
 */
export function riskTone(value: number): Tone {
  if (value < 0.3) return "good";
  if (value < 0.5) return "warning";
  return "critical";
}

export const categoryTone: Record<RiskCategory, Tone> = {
  low: "good",
  medium: "warning",
  high: "critical",
};

export const severityTone: Record<Severity, Tone> = {
  critical: "critical",
  high: "serious",
  moderate: "warning",
  low: "good",
  unclassified: "neutral",
};

/** CSS colour for a tone's mark (dot, bar, icon). Text never takes these colours. */
export const toneColor: Record<Tone, string> = {
  good: "var(--status-good)",
  warning: "var(--status-warning)",
  serious: "var(--status-serious)",
  critical: "var(--status-critical)",
  neutral: "var(--muted-foreground)",
  info: "var(--primary)",
};

export const toneClasses: Record<Tone, string> = {
  good: "border-status-good/30 bg-status-good/10 [&>svg]:text-status-good",
  warning: "border-status-warning/35 bg-status-warning/10 [&>svg]:text-status-warning",
  serious: "border-status-serious/35 bg-status-serious/10 [&>svg]:text-status-serious",
  critical: "border-status-critical/40 bg-status-critical/10 [&>svg]:text-status-critical",
  neutral: "border-border bg-muted/60 [&>svg]:text-muted-foreground",
  info: "border-primary/30 bg-primary/10 [&>svg]:text-primary",
};

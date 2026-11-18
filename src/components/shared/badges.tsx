import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  CircleDot,
  Clock,
  HelpCircle,
  Radio,
  ShieldAlert,
  ShieldCheck,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  QUALIFICATION_LABELS,
  RISK_LABELS,
  ROLE_COLORS,
  ROLE_LABELS,
  SCENARIOS,
  SEVERITY_LABELS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { categoryTone, severityTone, toneClasses, type Tone } from "@/lib/utils/risk";
import type {
  AllocationRole,
  AnalysisStatus,
  DataSource,
  QualificationStatus,
  RiskCategory,
  ScenarioMode,
  Severity,
} from "@/types";

interface ToneBadgeProps {
  tone: Tone;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  title?: string;
}

const tag =
  "inline-flex h-5 w-fit shrink-0 items-center gap-1 rounded-[3px] border px-1.5 font-mono text-[10.5px] leading-none font-medium tracking-[0.06em] whitespace-nowrap uppercase";

/** Status tag: tinted surface + coloured glyph + neutral ink, so meaning never rests on colour alone. */
export function ToneBadge({ tone, icon: Icon, children, className, title }: ToneBadgeProps) {
  return (
    <span title={title} className={cn(tag, "text-foreground [&>svg]:size-3 [&>svg]:shrink-0", toneClasses[tone], className)}>
      {Icon ? <Icon aria-hidden /> : null}
      {children}
    </span>
  );
}

const riskIcons: Record<RiskCategory, LucideIcon> = {
  low: ShieldCheck,
  medium: AlertTriangle,
  high: ShieldAlert,
};

export function RiskBadge({ category, className }: { category: RiskCategory; className?: string }) {
  return (
    <ToneBadge tone={categoryTone[category]} icon={riskIcons[category]} className={className}>
      {RISK_LABELS[category]}
    </ToneBadge>
  );
}

const severityIcons: Record<Severity, LucideIcon> = {
  critical: AlertOctagon,
  high: AlertTriangle,
  moderate: CircleDot,
  low: CheckCircle2,
  unclassified: HelpCircle,
};

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  return (
    <ToneBadge
      tone={severityTone[severity]}
      icon={severityIcons[severity]}
      className={className}
      title={severity === "unclassified" ? "The data source does not provide a severity for this record." : undefined}
    >
      {SEVERITY_LABELS[severity]}
    </ToneBadge>
  );
}

const qualification: Record<QualificationStatus, { tone: Tone; icon: LucideIcon }> = {
  qualified: { tone: "good", icon: CheckCircle2 },
  probation: { tone: "warning", icon: Clock },
  under_review: { tone: "info", icon: CircleDashed },
  disqualified: { tone: "critical", icon: XCircle },
};

export function QualificationBadge({ status, className }: { status: QualificationStatus; className?: string }) {
  const { tone, icon } = qualification[status];
  return (
    <ToneBadge tone={tone} icon={icon} className={className}>
      {QUALIFICATION_LABELS[status]}
    </ToneBadge>
  );
}

const scenarioTone: Record<ScenarioMode, Tone> = {
  normal: "info",
  hormuz_crisis: "critical",
  cost_focus: "warning",
};

export function ScenarioBadge({ mode, className, short }: { mode: ScenarioMode; className?: string; short?: boolean }) {
  return (
    <ToneBadge tone={scenarioTone[mode]} icon={mode === "hormuz_crisis" ? AlertTriangle : Radio} className={className}>
      {short ? SCENARIOS[mode].shortLabel : SCENARIOS[mode].label}
    </ToneBadge>
  );
}

export function RoleBadge({ role, className }: { role: AllocationRole; className?: string }) {
  return (
    <span className={cn(tag, "gap-1.5 border-border bg-muted/50", className)}>
      <span aria-hidden className="size-2 rounded-[1px]" style={{ background: ROLE_COLORS[role] }} />
      {ROLE_LABELS[role]}
    </span>
  );
}

const analysis: Record<AnalysisStatus, { tone: Tone; icon: LucideIcon; label: string }> = {
  queued: { tone: "neutral", icon: Clock, label: "Queued" },
  processing: { tone: "info", icon: CircleDashed, label: "Processing" },
  analysed: { tone: "good", icon: CheckCircle2, label: "Analysed" },
  failed: { tone: "critical", icon: XCircle, label: "Failed" },
};

export function AnalysisStatusBadge({ status }: { status: AnalysisStatus }) {
  const { tone, icon, label } = analysis[status];
  return (
    <ToneBadge tone={tone} icon={icon} className={status === "processing" ? "[&>svg]:animate-spin" : undefined}>
      {label}
    </ToneBadge>
  );
}

/**
 * Labels where a payload came from. Every data surface carries one so that
 * demonstration data can never be mistaken for a live model output.
 */
export function DataSourceBadge({ source, className }: { source: DataSource | undefined; className?: string }) {
  if (!source) return null;
  if (source === "mock") {
    return (
      <span
        title="Demonstration data from the mock provider. Not a live feed and not model output."
        className={cn(
          "inline-flex h-5 w-fit shrink-0 items-center gap-1.5 font-mono text-[10px] leading-none font-medium tracking-[0.1em] whitespace-nowrap text-muted-foreground uppercase",
          className,
        )}
      >
        <span aria-hidden className="size-1.5 rotate-45 border border-status-warning" />
        Demo data
      </span>
    );
  }
  return (
    <span
      title="Live data from the configured backend."
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center gap-1.5 font-mono text-[10px] leading-none font-medium tracking-[0.1em] whitespace-nowrap text-muted-foreground uppercase",
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-cyan" />
      Live
    </span>
  );
}

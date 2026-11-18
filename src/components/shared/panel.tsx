import { AlertCircle, Inbox, RotateCw, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { DataSource } from "@/types";
import { DataSourceBadge } from "./badges";
import { InfoTip } from "./info-tip";

interface PanelProps {
  title?: ReactNode;
  description?: ReactNode;
  /** Two-digit section index printed before the title, e.g. "02". */
  index?: string;
  /** Explanatory tooltip shown next to the title. */
  info?: ReactNode;
  source?: DataSource;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Remove body padding, e.g. for edge-to-edge tables. */
  flush?: boolean;
  /**
   * `plate` is a bordered instrument surface. `open` sits directly on the
   * canvas under a strong rule — used for editorial and wide analytical sections.
   */
  variant?: "plate" | "open";
}

/** Titled content surface. Headers are monospace capitals above a hairline. */
export function Panel({
  title,
  description,
  index,
  info,
  source,
  action,
  children,
  className,
  bodyClassName,
  flush,
  variant = "plate",
}: PanelProps) {
  const hasHeader = title || action || source;
  const open = variant === "open";
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col text-card-foreground",
        open ? "border-t border-rule" : "rounded-md border border-border bg-card",
        className,
      )}
    >
      {hasHeader ? (
        <header className={cn("flex items-start justify-between gap-3 py-2.5", open ? "" : "border-b border-border px-4")}>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h2 className="font-mono text-[11px] leading-5 font-medium tracking-[0.1em] text-foreground uppercase">
                {index ? <span className="mr-2 text-faint">{index}</span> : null}
                {title}
              </h2>
              {info ? <InfoTip>{info}</InfoTip> : null}
            </div>
            {description ? <p className="text-xs leading-4.5 text-muted-foreground">{description}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2.5 pt-px">
            {action}
            <DataSourceBadge source={source} />
          </div>
        </header>
      ) : null}
      <div className={cn("min-w-0 flex-1", flush ? "" : open ? "pt-3 pb-1" : "p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

/** Unframed section heading for groups of content that are not a single panel. */
export function SectionHeading({
  index,
  title,
  description,
  action,
  id,
  className,
}: {
  index?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-t border-rule pt-2.5", className)}>
      <div className="min-w-0">
        <h2 id={id} className="font-mono text-[11px] leading-5 font-medium tracking-[0.1em] uppercase">
          {index ? <span className="mr-2 text-faint">{index}</span> : null}
          {title}
        </h2>
        {description ? <p className="max-w-3xl text-xs leading-4.5 text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function PanelSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-7 w-full" style={{ opacity: 1 - i * 0.14 }} />
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 220 }: { height?: number }) {
  return <Skeleton className="w-full" style={{ height }} aria-busy="true" aria-label="Loading chart" />;
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-1.5 px-6 py-10 text-center", className)}>
      <Icon aria-hidden className="mb-1 size-5 text-faint" strokeWidth={1.5} />
      <p className="eyebrow text-foreground">{title}</p>
      {description ? <p className="max-w-sm text-xs leading-5 text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry, className }: { message: string; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={cn("flex flex-col items-center justify-center gap-1.5 px-6 py-10 text-center", className)}>
      <AlertCircle aria-hidden className="mb-1 size-5 text-status-critical" strokeWidth={1.5} />
      <p className="eyebrow text-foreground">This data could not be loaded</p>
      <p className="max-w-md text-xs leading-5 text-muted-foreground">{message}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          <RotateCw aria-hidden /> Try again
        </Button>
      ) : null}
    </div>
  );
}

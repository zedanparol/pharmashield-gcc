import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /** Monospace line above the title: module index and name. */
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/** Editorial page head: mono eyebrow, serif title, sans standfirst, actions on the right. */
export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-x-8 gap-y-4", className)}>
      <div className="min-w-0 flex-1 basis-80">
        {eyebrow ? <p className="eyebrow mb-2.5">{eyebrow}</p> : null}
        <h1 className="display max-w-4xl text-[1.75rem] sm:text-[2.125rem] xl:text-[2.5rem]">{title}</h1>
        {description ? <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

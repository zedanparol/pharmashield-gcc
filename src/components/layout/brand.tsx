import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Shield cut by a supply route: stations joined by a line that crosses the
 * shield. Drawn inline so it scales cleanly; the outline takes the text colour.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden className={cn("size-7 shrink-0", className)}>
      <path
        d="M16 2.75 5 6.6v8.3c0 6.7 4.5 11.9 11 13.9 6.5-2 11-7.2 11-13.9V6.6L16 2.75Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M9.5 19 14 12.5l4.5 4 4-5.5" stroke="#58cbe0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9.5" cy="19" r="1.6" fill="#58cbe0" />
      <circle cx="14" cy="12.5" r="1.6" fill="#58cbe0" />
      <circle cx="18.5" cy="16.5" r="1.6" fill="#58cbe0" />
      <circle cx="22.5" cy="11" r="1.6" fill="#58cbe0" />
    </svg>
  );
}

export function Brand({ collapsed, className }: { collapsed?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5 text-white", className)}>
      <BrandMark />
      {collapsed ? null : (
        <div className="min-w-0 leading-none">
          <p className="truncate font-mono text-[12px] font-medium tracking-[0.16em] text-white uppercase">PharmaShield</p>
          <p className="mt-1.5 truncate font-mono text-[9px] tracking-[0.2em] text-[#7f8aa0] uppercase">Intelligence System · GCC</p>
        </div>
      )}
      <span className="sr-only">
        {APP_NAME} — {APP_TAGLINE}
      </span>
    </div>
  );
}

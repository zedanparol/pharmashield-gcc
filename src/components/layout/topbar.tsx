"use client";

import { Bell, ChevronRight, LogOut, Menu, Moon, Settings, Sun, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useSyncExternalStore, type ReactNode } from "react";
import { SeverityBadge } from "@/components/shared/badges";
import { MODE_VISUALS } from "@/components/simulator/mode-switcher";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useApi } from "@/hooks/use-api";
import { useHydrated } from "@/hooks/use-hydrated";
import { DEFAULT_SKU, SCENARIOS } from "@/lib/constants";
import { findNavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { formatNumber, formatRelative, initials } from "@/lib/utils/format";
import { getHealth, getShortages, getSupplierUpdates, USE_MOCK_DATA } from "@/services/api";
import { useSessionStore, useWorkspaceStore } from "@/stores/app-store";
import { GlobalSearch } from "./global-search";

/* ── Breadcrumb ─────────────────────────────────────────────────────────── */

function Breadcrumb() {
  const pathname = usePathname();
  const item = findNavItem(pathname);
  const rest = item ? pathname.slice(item.href.length).split("/").filter(Boolean) : [];
  const leaf = rest.length ? decodeURIComponent(rest[rest.length - 1]) : null;

  return (
    <nav aria-label="Breadcrumb" className="mr-auto min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 font-mono text-[11px] tracking-[0.1em] uppercase">
        <li className="hidden text-faint sm:block">PharmaShield</li>
        <li aria-hidden className="hidden text-faint sm:block">
          <ChevronRight className="size-3" />
        </li>
        <li className="min-w-0 truncate">
          {item && leaf ? (
            <Link href={item.href} className="rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
              {item.label}
            </Link>
          ) : (
            <span aria-current="page" className="font-medium text-foreground">
              {item?.label ?? "Workspace"}
            </span>
          )}
        </li>
        {leaf ? (
          <>
            <li aria-hidden className="text-faint">
              <ChevronRight className="size-3" />
            </li>
            <li aria-current="page" className="truncate font-medium text-foreground">
              {leaf}
            </li>
          </>
        ) : null}
      </ol>
    </nav>
  );
}

/* ── Context strip ──────────────────────────────────────────────────────── */

function StripItem({ label, children, href, title }: { label: string; children: ReactNode; href?: string; title?: string }) {
  const body = (
    <>
      <span className="text-faint">{label}</span>
      <span className="text-foreground">{children}</span>
    </>
  );
  const base = "flex h-full shrink-0 items-center gap-2 border-r border-border px-3.5";
  if (!href) {
    return (
      <span className={base} title={title}>
        {body}
      </span>
    );
  }
  return (
    <Link href={href} title={title} className={cn(base, "outline-none transition-colors hover:bg-accent focus-visible:bg-accent")}>
      {body}
    </Link>
  );
}

function useSystemStatus() {
  const health = useApi("health", getHealth);
  const state = USE_MOCK_DATA ? "mock" : health.loading ? "checking" : health.error ? "offline" : "online";
  return {
    mock: { label: "Demo mode", color: "var(--status-warning)", detail: "Mock data provider active. No backend connection is in use." },
    checking: { label: "Checking", color: "var(--muted-foreground)", detail: "Contacting the backend health endpoint." },
    online: { label: "API online", color: "var(--status-good)", detail: "The backend health check succeeded." },
    offline: { label: "API offline", color: "var(--status-critical)", detail: health.error ?? "The backend health check failed." },
  }[state];
}

/** Dubai wall-clock time, read only in the browser so server and client markup always match. */
const subscribeToClock = (onTick: () => void) => {
  const timer = window.setInterval(onTick, 15_000);
  return () => window.clearInterval(timer);
};
const currentMinute = () => Math.floor(Date.now() / 60_000);
const noMinute = () => 0;

function useDubaiClock() {
  const minute = useSyncExternalStore(subscribeToClock, currentMinute, noMinute);
  if (minute === 0) return { time: "--:--", date: "" };
  const date = new Date(minute * 60_000);
  return {
    time: new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Dubai" }).format(date),
    date: new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Dubai" }).format(date),
  };
}

/**
 * The working context every figure on the page depends on: product, scenario,
 * demand and data source. Always visible, like the header line of a terminal.
 */
function ContextStrip() {
  const hydrated = useHydrated();
  const mode = useWorkspaceStore((state) => state.mode);
  const demand = useWorkspaceStore((state) => state.monthlyDemand);
  const status = useSystemStatus();
  const clock = useDubaiClock();

  return (
    <div className="no-scrollbar flex h-7 items-stretch overflow-x-auto border-t border-border font-mono text-[10px] tracking-[0.1em] whitespace-nowrap uppercase">
      <StripItem label="SKU">{DEFAULT_SKU.id}</StripItem>
      <StripItem label="Tier">{DEFAULT_SKU.tier}</StripItem>
      <StripItem label="Scenario" href="/simulator" title="Active scenario — open the Crisis Simulator">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-1.5 rounded-[1px]" style={{ background: hydrated ? MODE_VISUALS[mode].color : "var(--faint)" }} />
          {hydrated ? SCENARIOS[mode].shortLabel : "—"}
        </span>
      </StripItem>
      <StripItem label="Demand" href="/allocation" title="Monthly demand assumption — open Order Allocation">
        {hydrated ? `${formatNumber(demand)} vials / mo` : "—"}
      </StripItem>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href="/settings"
            className="flex h-full shrink-0 items-center gap-2 border-r border-border px-3.5 outline-none transition-colors hover:bg-accent focus-visible:bg-accent"
          >
            <span className="text-faint">Source</span>
            <span className="flex items-center gap-1.5 text-foreground">
              <span aria-hidden className="relative flex size-1.5">
                <span className="absolute inset-0 rounded-full" style={{ background: status.color }} />
              </span>
              {status.label}
            </span>
          </Link>
        </TooltipTrigger>
        <TooltipContent className="max-w-64 text-xs leading-5 tracking-normal normal-case">{status.detail}</TooltipContent>
      </Tooltip>
      <span className="ml-auto flex h-full shrink-0 items-center gap-2 px-3.5 text-muted-foreground" suppressHydrationWarning>
        <span className="text-faint">Dubai</span>
        <span className="text-foreground">{clock.time}</span>
        <span className="hidden md:inline">{clock.date}</span>
      </span>
    </div>
  );
}

/* ── Controls ───────────────────────────────────────────────────────────── */

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const hydrated = useHydrated();
  const dark = !hydrated || resolvedTheme === "dark";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={dark ? "Switch to paper theme" : "Switch to graphite theme"} onClick={() => setTheme(dark ? "light" : "dark")}>
          {dark ? <Sun aria-hidden strokeWidth={1.6} /> : <Moon aria-hidden strokeWidth={1.6} />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{dark ? "Paper theme" : "Graphite theme"}</TooltipContent>
    </Tooltip>
  );
}

function NotificationCentre() {
  const shortages = useApi("notifications-shortages", getShortages);
  const updates = useApi("notifications-updates", getSupplierUpdates);
  const critical = (shortages.data ?? []).filter((s) => s.status === "active" && (s.severity === "critical" || s.severity === "high"));
  const recent = (updates.data ?? []).slice(0, 4);
  const count = critical.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications, ${count} high-priority alerts`}>
          <Bell aria-hidden strokeWidth={1.6} />
          {count > 0 ? (
            <span className="absolute top-0.5 right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-[2px] bg-status-critical px-0.5 font-mono text-[9px] leading-none font-medium text-white">
              {count}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-92 max-w-[calc(100vw-1.5rem)] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <p className="eyebrow text-foreground">Notification centre</p>
          {USE_MOCK_DATA ? <span className="eyebrow text-[9.5px]">Demo data</span> : null}
        </div>
        <div className="max-h-[26rem] overflow-y-auto">
          <p className="eyebrow border-b border-border bg-muted/40 px-4 py-1.5 text-[9.5px]">Shortage alerts · {critical.length}</p>
          {critical.length === 0 ? (
            <p className="px-4 py-3 text-xs text-muted-foreground">No high-priority shortage alerts.</p>
          ) : (
            <ul className="divide-y divide-border">
              {critical.map((shortage) => (
                <li key={shortage.shortage_id}>
                  <Link
                    href={`/shortages?alert=${encodeURIComponent(shortage.shortage_id)}`}
                    className="relative block py-2.5 pr-4 pl-5 outline-none transition-colors hover:bg-accent focus-visible:bg-accent"
                  >
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 w-[3px]"
                      style={{ background: shortage.severity === "critical" ? "var(--status-critical)" : "var(--status-serious)" }}
                    />
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[13px] font-medium">{shortage.drug_name}</p>
                      <SeverityBadge severity={shortage.severity} />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {shortage.manufacturer_name} · {shortage.reason}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="eyebrow border-y border-border bg-muted/40 px-4 py-1.5 text-[9.5px]">Supplier updates</p>
          <ul className="divide-y divide-border">
            {recent.map((update) => (
              <li key={update.update_id}>
                <Link
                  href={`/suppliers/${update.manufacturer_id}`}
                  className="block px-4 py-2.5 outline-none transition-colors hover:bg-accent focus-visible:bg-accent"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate text-[13px] font-medium">{update.manufacturer_name}</p>
                    <p className="tabular shrink-0 text-[10.5px] text-faint" suppressHydrationWarning>
                      {formatRelative(update.timestamp)}
                    </p>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-4.5 text-muted-foreground">{update.message}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function UserMenu() {
  const router = useRouter();
  const user = useSessionStore((state) => state.user);
  const signOut = useSessionStore((state) => state.signOut);
  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Account menu for ${user.name}`}
          className="ml-1 flex h-8 items-center gap-2 rounded-[4px] pr-2 pl-1 outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Avatar className="size-6 rounded-[3px]">
            <AvatarFallback className="rounded-[3px] bg-foreground font-mono text-[10px] font-medium text-background">{initials(user.name)}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-32 truncate text-xs font-medium lg:inline">{user.name}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium text-foreground">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.role}</p>
          <p className="truncate text-xs text-muted-foreground">{user.organisation}</p>
          {user.isDemo ? <p className="eyebrow mt-2 text-[9.5px]">Prototype session · no authentication service</p> : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <UserRound aria-hidden /> Profile &amp; preferences
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings aria-hidden /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            signOut();
            router.replace("/login");
          }}
        >
          <LogOut aria-hidden /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Topbar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="flex h-12 items-center gap-1.5 px-3 sm:px-5">
        <Button variant="ghost" size="icon" className="mr-1 lg:hidden" aria-label="Open navigation" onClick={onOpenMobileNav}>
          <Menu aria-hidden strokeWidth={1.6} />
        </Button>
        <Breadcrumb />
        <GlobalSearch />
        <ThemeToggle />
        <NotificationCentre />
        <UserMenu />
      </div>
      <ContextStrip />
    </header>
  );
}

"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NAV_ITEMS, SETTINGS_ITEM, type NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { USE_MOCK_DATA } from "@/services/api/config";
import { Brand } from "./brand";

function NavLink({
  item,
  index,
  collapsed,
  active,
  onNavigate,
}: {
  item: NavItem;
  index?: string;
  collapsed: boolean;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-9 items-center gap-3 px-4 text-[13px] outline-none transition-colors",
        "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:bg-sidebar-accent focus-visible:text-sidebar-accent-foreground",
        active && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-1.5 left-0 w-[2px] origin-center bg-sidebar-primary transition-transform duration-200",
          active ? "scale-y-100" : "scale-y-0 group-hover:scale-y-50",
        )}
      />
      <Icon
        aria-hidden
        strokeWidth={1.6}
        className={cn("size-4 shrink-0 transition-colors", active ? "text-sidebar-primary" : "text-sidebar-foreground/55 group-hover:text-sidebar-foreground")}
      />
      {collapsed ? (
        <span className="sr-only">{item.label}</span>
      ) : (
        <>
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {index ? (
            <span className={cn("font-mono text-[10px] tracking-wider", active ? "text-sidebar-primary" : "text-sidebar-foreground/35")}>{index}</span>
          ) : null}
        </>
      )}
    </Link>
  );
  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

interface SidebarProps {
  collapsed: boolean;
  onToggle?: () => void;
  /** Called after a link is followed — closes the mobile drawer. */
  onNavigate?: () => void;
}

export function Sidebar({ collapsed, onToggle, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const isActive = (item: NavItem) => pathname === item.href || pathname.startsWith(`${item.href}/`);
  const sourceLabel = USE_MOCK_DATA ? "Demonstration data mode" : "Live backend mode";

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className={cn("flex h-12 shrink-0 items-center border-b border-sidebar-border px-4", collapsed && "justify-center px-0")}>
        <Link href="/dashboard" onClick={onNavigate} className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring">
          <Brand collapsed={collapsed} />
        </Link>
      </div>

      <nav aria-label="Primary" className="flex-1 overflow-y-auto py-4">
        {collapsed ? null : <p className="px-4 pb-2 font-mono text-[9.5px] tracking-[0.2em] text-sidebar-foreground/40 uppercase">Modules</p>}
        <ul>
          {NAV_ITEMS.map((item, i) => (
            <li key={item.href}>
              <NavLink item={item} index={String(i + 1).padStart(2, "0")} collapsed={collapsed} active={isActive(item)} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
        <div className="mx-4 my-4 border-t border-sidebar-border" />
        {collapsed ? null : <p className="px-4 pb-2 font-mono text-[9.5px] tracking-[0.2em] text-sidebar-foreground/40 uppercase">Workspace</p>}
        <NavLink item={SETTINGS_ITEM} collapsed={collapsed} active={isActive(SETTINGS_ITEM)} onNavigate={onNavigate} />
      </nav>

      <div className="shrink-0 border-t border-sidebar-border">
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex h-10 items-center justify-center outline-none focus-visible:bg-sidebar-accent" tabIndex={0}>
                <span
                  aria-hidden
                  className={cn("size-2", USE_MOCK_DATA ? "rotate-45 border border-status-warning" : "rounded-full bg-cyan")}
                />
                <span className="sr-only">{sourceLabel}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">{sourceLabel}</TooltipContent>
          </Tooltip>
        ) : (
          <dl className="space-y-1.5 px-4 py-3.5 font-mono text-[10px] tracking-[0.12em] uppercase">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-sidebar-foreground/45">Data</dt>
              <dd className="flex items-center gap-1.5 text-sidebar-accent-foreground">
                <span aria-hidden className={cn("size-1.5", USE_MOCK_DATA ? "rotate-45 border border-status-warning" : "rounded-full bg-cyan")} />
                {USE_MOCK_DATA ? "Demonstration" : "Live backend"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-sidebar-foreground/45">Models</dt>
              <dd className="text-sidebar-foreground/80">{USE_MOCK_DATA ? "Not connected" : "Via backend"}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-sidebar-foreground/45">Orders</dt>
              <dd className="text-sidebar-foreground/80">Manual only</dd>
            </div>
          </dl>
        )}
        {onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            className={cn(
              "flex h-9 w-full items-center gap-3 border-t border-sidebar-border px-4 font-mono text-[10px] tracking-[0.12em] text-sidebar-foreground/55 uppercase outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:bg-sidebar-accent",
              collapsed && "justify-center px-0",
            )}
          >
            {collapsed ? <PanelLeftOpen aria-hidden className="size-4" strokeWidth={1.6} /> : <PanelLeftClose aria-hidden className="size-4" strokeWidth={1.6} />}
            {collapsed ? null : "Collapse"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

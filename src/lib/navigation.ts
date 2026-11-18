import {
  Activity,
  ClipboardCheck,
  FileSearch,
  Gauge,
  LayoutDashboard,
  Scale,
  Settings,
  ShieldHalf,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Overview", description: "Executive view of supply-chain resilience", icon: LayoutDashboard },
  { href: "/suppliers", label: "Supplier Intelligence", description: "Manufacturer scorecards and risk profiles", icon: ShieldHalf },
  { href: "/shortages", label: "Shortage Intelligence", description: "Drug shortage monitoring", icon: Activity },
  { href: "/simulator", label: "Crisis Simulator", description: "Scenario modes and re-ranking", icon: Gauge },
  { href: "/allocation", label: "Order Allocation", description: "Dual-source procurement allocation", icon: Scale },
  { href: "/documents", label: "Document Intelligence", description: "Warning letters and contract clauses", icon: FileSearch },
  { href: "/audit", label: "Audit Trail", description: "Human review and decision history", icon: ClipboardCheck },
];

export const SETTINGS_ITEM: NavItem = {
  href: "/settings",
  label: "Settings",
  description: "Data source, appearance and workspace defaults",
  icon: Settings,
};

export const ALL_NAV_ITEMS: NavItem[] = [...NAV_ITEMS, SETTINGS_ITEM];

export function findNavItem(pathname: string): NavItem | undefined {
  return ALL_NAV_ITEMS.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
}

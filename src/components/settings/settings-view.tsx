"use client";

import { CircleCheck, CircleX, FlaskConical, Loader2, LogOut, Moon, PlugZap, RotateCcw, Sun, Wifi } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Panel } from "@/components/shared/panel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useHydrated } from "@/hooks/use-hydrated";
import { useScenario } from "@/hooks/use-scenario";
import { APP_NAME, DEFAULT_MONTHLY_DEMAND, SCENARIO_ORDER, SCENARIOS } from "@/lib/constants";
import { formatNumber, formatTime } from "@/lib/utils/format";
import { API_BASE_URL, describeError, getHealth, SHORTAGE_SOURCE, USE_MOCK_DATA } from "@/services/api";
import { useSessionStore, useWorkspaceStore } from "@/stores/app-store";
import type { ScenarioMode } from "@/types";

const ENDPOINTS: { module: string; method: string; path: string }[] = [
  { module: "Health", method: "GET", path: "/health" },
  { module: "Supplier Intelligence", method: "GET", path: "/suppliers" },
  { module: "Supplier Intelligence", method: "GET", path: "/suppliers/{manufacturer_id}" },
  { module: "Supplier Intelligence", method: "GET", path: "/suppliers/updates" },
  { module: "Shortage Intelligence", method: "GET", path: "/shortages" },
  { module: "Shortage Intelligence", method: "GET", path: "/shortages/trend" },
  { module: "Crisis Simulator", method: "GET", path: "/simulation" },
  { module: "Order Allocation", method: "POST", path: "/allocation" },
  { module: "Document Intelligence", method: "GET", path: "/documents" },
  { module: "Document Intelligence", method: "POST", path: "/documents" },
  { module: "Document Intelligence", method: "GET", path: "/documents/{document_id}/analysis" },
  { module: "Governance", method: "GET", path: "/recommendations" },
  { module: "Governance", method: "POST", path: "/recommendations" },
  { module: "Audit Trail", method: "GET", path: "/audit" },
  { module: "Audit Trail", method: "POST", path: "/audit/decisions" },
  { module: "Audit Trail", method: "POST", path: "/audit/events" },
];

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-[13px] font-medium">{label}</p>
        {hint ? <p className="mt-0.5 max-w-md text-xs leading-5 text-muted-foreground">{hint}</p> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

type Check = { state: "idle" } | { state: "running" } | { state: "ok"; detail: string; at: string } | { state: "failed"; detail: string; at: string };

export function SettingsView() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { resolvedTheme, setTheme } = useTheme();
  const { mode, changeMode } = useScenario();
  const user = useSessionStore((state) => state.user);
  const signOut = useSessionStore((state) => state.signOut);
  const demand = useWorkspaceStore((state) => state.monthlyDemand);
  const setDemand = useWorkspaceStore((state) => state.setMonthlyDemand);
  const collapsed = useWorkspaceStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useWorkspaceStore((state) => state.toggleSidebar);
  const [check, setCheck] = useState<Check>({ state: "idle" });

  const testConnection = async () => {
    setCheck({ state: "running" });
    try {
      const { data, meta } = await getHealth();
      setCheck({
        state: "ok",
        at: meta.fetchedAt,
        detail:
          meta.source === "mock"
            ? "Mock provider responded. No backend was contacted because mock mode is on."
            : `Backend responded with status "${data.status}"${data.version ? `, version ${data.version}` : ""}.`,
      });
    } catch (error) {
      setCheck({ state: "failed", at: new Date().toISOString(), detail: describeError(error) });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace · Settings"
        title="Settings"
        description="Data source, appearance and workspace defaults for this browser."
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel index="01" title="Data source" description="Where the modules read their data from">
          <div className="flex items-start gap-3 rounded-[4px] border border-border bg-muted/40 p-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-[4px] border border-border bg-card">
              {USE_MOCK_DATA ? <FlaskConical aria-hidden className="size-4 text-status-warning" /> : <Wifi aria-hidden className="size-4 text-teal" />}
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold">{USE_MOCK_DATA ? "Demonstration data (mock mode)" : "Live backend"}</p>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                {USE_MOCK_DATA
                  ? "Every module is served by the mock provider in src/lib/mock-data. No model output, live feed or backend is connected."
                  : "Modules call the Python backend. Responses are validated against the API contracts before they are displayed."}
              </p>
            </div>
          </div>
          <dl className="mt-3 divide-y divide-border text-[13px]">
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2">
              <dt className="font-mono text-xs text-muted-foreground">NEXT_PUBLIC_USE_MOCK_DATA</dt>
              <dd className="font-mono text-xs">{String(USE_MOCK_DATA)}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2">
              <dt className="font-mono text-xs text-muted-foreground">NEXT_PUBLIC_API_BASE_URL</dt>
              <dd className="max-w-full truncate font-mono text-xs">{API_BASE_URL || "not set"}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2">
              <dt className="font-mono text-xs text-muted-foreground">NEXT_PUBLIC_SHORTAGE_SOURCE</dt>
              <dd className="font-mono text-xs">{SHORTAGE_SOURCE}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            These are build-time environment variables. Change them in <span className="font-mono">.env.local</span> or in the Vercel
            project settings, then rebuild.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3">
            <Button variant="outline" onClick={testConnection} disabled={check.state === "running"}>
              {check.state === "running" ? <Loader2 aria-hidden className="animate-spin" /> : <PlugZap aria-hidden />}
              Test connection
            </Button>
            <p aria-live="polite" className="flex min-w-0 flex-1 items-start gap-1.5 text-xs leading-5 text-muted-foreground">
              {check.state === "ok" ? <CircleCheck aria-hidden className="mt-0.5 size-3.5 shrink-0 text-status-good" /> : null}
              {check.state === "failed" ? <CircleX aria-hidden className="mt-0.5 size-3.5 shrink-0 text-status-critical" /> : null}
              {check.state === "ok" || check.state === "failed" ? (
                <span>
                  {check.detail} <span className="tabular">({formatTime(check.at)} GST)</span>
                </span>
              ) : check.state === "running" ? (
                "Checking…"
              ) : (
                "Calls the health endpoint through the same service layer the modules use."
              )}
            </p>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel index="02" title="Appearance">
            <div className="divide-y divide-border">
              <Row label="Theme" hint="Graphite is the default. Navigation stays graphite in both themes.">
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={hydrated ? (resolvedTheme ?? "dark") : "dark"}
                  onValueChange={(value) => (value ? setTheme(value) : undefined)}
                  aria-label="Theme"
                >
                  <ToggleGroupItem value="dark" className="h-8 px-3 text-xs">
                    <Moon aria-hidden /> Graphite
                  </ToggleGroupItem>
                  <ToggleGroupItem value="light" className="h-8 px-3 text-xs">
                    <Sun aria-hidden /> Paper
                  </ToggleGroupItem>
                </ToggleGroup>
              </Row>
              <Row label="Compact sidebar" hint="Collapse the navigation to icons on desktop.">
                <Switch checked={collapsed} onCheckedChange={toggleSidebar} aria-label="Compact sidebar" />
              </Row>
            </div>
          </Panel>

          <Panel index="03" title="Workspace defaults" description="Shared by the overview, simulator and allocation modules">
            <div className="divide-y divide-border">
              <Row label="Active scenario" hint={SCENARIOS[mode].description}>
                <Select value={mode} onValueChange={(value) => changeMode(value as ScenarioMode)}>
                  <SelectTrigger aria-label="Active scenario" className="h-8 min-w-44 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCENARIO_ORDER.map((option) => (
                      <SelectItem key={option} value={option}>
                        {SCENARIOS[option].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Row>
              <Row label="Monthly demand assumption" hint="Edit the value in Order Allocation. Reset returns it to the plan default.">
                <div className="flex items-center gap-2">
                  <span className="tabular text-[13px] font-medium">{formatNumber(demand)} vials</span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={demand === DEFAULT_MONTHLY_DEMAND}
                    onClick={() => {
                      setDemand(DEFAULT_MONTHLY_DEMAND);
                      toast.success(`Demand reset to ${formatNumber(DEFAULT_MONTHLY_DEMAND)} vials`);
                    }}
                  >
                    <RotateCcw aria-hidden /> Reset
                  </Button>
                </div>
              </Row>
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel index="04" title="Profile" description="Signed-in user for this browser session">
          {user ? (
            <>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
                {[
                  ["Name", user.name],
                  ["Email", user.email],
                  ["Role", user.role],
                  ["Organisation", user.organisation],
                ].map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <dt className="eyebrow text-[9.5px]">{label}</dt>
                    <dd className="mt-0.5 truncate font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                <Label className="max-w-md text-xs leading-5 font-normal text-muted-foreground">
                  Prototype session. No authentication service is connected, so this profile is not verified and cannot be edited.
                </Label>
                <Button
                  variant="outline"
                  onClick={() => {
                    signOut();
                    router.replace("/login");
                  }}
                >
                  <LogOut aria-hidden /> Sign out
                </Button>
              </div>
            </>
          ) : null}
        </Panel>

        <Panel
          flush
          index="05"
          title="Backend endpoints"
          description="Routes the service layer calls when mock mode is off · full contracts in docs/API_CONTRACTS.md"
        >
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-xs">
              <caption className="sr-only">Backend endpoints used by each module</caption>
              <thead className="sticky top-0 bg-card">
                <tr className="eyebrow text-left text-[9.5px]">
                  <th className="px-4 py-2 font-medium">Module</th>
                  <th className="py-2 font-medium">Method</th>
                  <th className="px-4 py-2 font-medium">Path</th>
                </tr>
              </thead>
              <tbody>
                {ENDPOINTS.map((endpoint) => (
                  <tr key={`${endpoint.method} ${endpoint.path}`} className="border-t border-border">
                    <td className="px-4 py-1.5 text-muted-foreground">{endpoint.module}</td>
                    <td className="py-1.5 font-mono">{endpoint.method}</td>
                    <td className="px-4 py-1.5 font-mono">{endpoint.path}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <p className="text-[11px] text-muted-foreground">
        {APP_NAME} · frontend prototype v0.1.0 · Next.js, React, TypeScript, Tailwind CSS. University research project — not for clinical or
        procurement use.
      </p>
    </div>
  );
}

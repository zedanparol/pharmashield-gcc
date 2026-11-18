"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_MONTHLY_DEMAND } from "@/lib/constants";
import type { ScenarioMode, SessionUser } from "@/types";

/**
 * Prototype session. There is no authentication service behind this: the
 * "session" is a flag in localStorage so the demo can show a sign-in flow.
 * Replace with a real provider (e.g. Auth.js, Clerk, Entra ID) before any
 * production use.
 */
interface SessionState {
  user: SessionUser | null;
  /** True when "Remember me" was left unticked: the session ends with the browser tab. */
  sessionOnly: boolean;
  signIn: (user: SessionUser, remember?: boolean) => void;
  signOut: () => void;
}

/** Present only for the lifetime of the tab that signed in without "Remember me". */
export const TAB_MARKER = "pharmashield-tab-session";

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      sessionOnly: false,
      signIn: (user, remember = true) => {
        if (!remember) sessionStorage.setItem(TAB_MARKER, "1");
        set({ user, sessionOnly: !remember });
      },
      signOut: () => set({ user: null, sessionOnly: false }),
    }),
    { name: "pharmashield-session" },
  ),
);

export const DEMO_USER: SessionUser = {
  name: "Layla Haddad",
  email: "demo@pharmashield.example",
  role: "Procurement Manager",
  organisation: "Emirates Health GPO (demo)",
  isDemo: true,
};

/** Workspace state shared across modules. */
interface WorkspaceState {
  /** Active scenario — drives ranking, allocation and audit context everywhere. */
  mode: ScenarioMode;
  monthlyDemand: number;
  sidebarCollapsed: boolean;
  setMode: (mode: ScenarioMode) => void;
  setMonthlyDemand: (demand: number) => void;
  toggleSidebar: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      mode: "normal",
      monthlyDemand: DEFAULT_MONTHLY_DEMAND,
      sidebarCollapsed: false,
      setMode: (mode) => set({ mode }),
      setMonthlyDemand: (monthlyDemand) => set({ monthlyDemand }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    }),
    { name: "pharmashield-workspace" },
  ),
);

"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { SCENARIOS } from "@/lib/constants";
import { recordAuditEvent } from "@/services/api";
import { useSessionStore, useWorkspaceStore } from "@/stores/app-store";
import type { ScenarioMode } from "@/types";

/**
 * Active scenario plus a setter that also writes the change to the audit
 * trail, so every module switches modes the same way.
 */
export function useScenario() {
  const mode = useWorkspaceStore((state) => state.mode);
  const setMode = useWorkspaceStore((state) => state.setMode);
  const user = useSessionStore((state) => state.user);

  const changeMode = useCallback(
    (next: ScenarioMode) => {
      if (next === mode) return;
      setMode(next);
      toast(`${SCENARIOS[next].label} activated`, { description: SCENARIOS[next].shift });
      if (!user) return;
      recordAuditEvent({
        user: { name: user.name, role: user.role },
        action: "scenario_changed",
        supplier: null,
        previous_allocation: null,
        new_allocation: null,
        reason: `Scenario changed from ${SCENARIOS[mode].label} to ${SCENARIOS[next].label}.`,
        scenario_mode: next,
        recommendation_id: null,
      }).catch(() => {
        toast.error("The scenario change could not be written to the audit trail.");
      });
    },
    [mode, setMode, user],
  );

  return { mode, changeMode };
}

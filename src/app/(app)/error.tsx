"use client";

import { useEffect } from "react";
import { ErrorState, Panel } from "@/components/shared/panel";

/** Catches rendering errors inside a module so the shell and navigation stay usable. */
export default function ModuleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Panel>
      <ErrorState message="Something went wrong while displaying this module. You can retry, or use the navigation to open another module." onRetry={reset} />
    </Panel>
  );
}

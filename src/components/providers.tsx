"use client";

import { MotionConfig } from "framer-motion";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      {/* Every animation in the app honours the operating system's reduced-motion setting. */}
      <MotionConfig reducedMotion="user" transition={{ duration: 0.22, ease: [0.2, 0.7, 0.3, 1] }}>
        <TooltipProvider delayDuration={150}>{children}</TooltipProvider>
      </MotionConfig>
      <Toaster position="bottom-right" closeButton />
    </ThemeProvider>
  );
}

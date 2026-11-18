"use client";

import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useHydrated } from "@/hooks/use-hydrated";
import { cn } from "@/lib/utils";
import { TAB_MARKER, useSessionStore, useWorkspaceStore } from "@/stores/app-store";
import { BrandMark } from "./brand";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

function ShellPlaceholder() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background" aria-busy="true" aria-label="Loading workspace">
      <div className="flex flex-col items-center gap-4">
        <BrandMark className="size-9" />
        <p className="eyebrow">Opening workspace</p>
        <Skeleton className="h-px w-40" />
      </div>
    </div>
  );
}

/**
 * Authenticated application frame: collapsible sidebar, top bar and content.
 *
 * The session check is a prototype guard only (a localStorage flag). It keeps
 * the demo flow honest but is not a security boundary — real route protection
 * belongs in server-side auth once an identity provider is integrated.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const user = useSessionStore((state) => state.user);
  const sessionOnly = useSessionStore((state) => state.sessionOnly);
  const signOut = useSessionStore((state) => state.signOut);
  const collapsed = useWorkspaceStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useWorkspaceStore((state) => state.toggleSidebar);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    // A session started without "Remember me" does not survive a new tab or browser restart.
    if (user && sessionOnly && !sessionStorage.getItem(TAB_MARKER)) {
      signOut();
      return;
    }
    if (!user) router.replace("/login");
  }, [hydrated, user, sessionOnly, signOut, router]);

  // The frame and page are always rendered so the route can be prerendered; until the
  // session is confirmed they sit inert beneath an opaque placeholder.
  const ready = hydrated && !!user;

  return (
    <div className="flex min-h-screen bg-background" inert={!ready}>
      {ready ? null : <ShellPlaceholder />}
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 border-r border-sidebar-border transition-[width] duration-200 ease-out lg:block",
          collapsed ? "w-14" : "w-60",
        )}
      >
        {/* usePathname() is request data on dynamic routes, so navigation chrome streams in. */}
        <Suspense fallback={<div className="h-full bg-sidebar" />}>
          <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
        </Suspense>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" showCloseButton={false} className="w-64 border-sidebar-border p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">PharmaShield GCC modules</SheetDescription>
          <Suspense fallback={<div className="h-full bg-sidebar" />}>
            <Sidebar collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </Suspense>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense fallback={<div className="h-[77px] shrink-0 border-b border-border" />}>
          <Topbar onOpenMobileNav={() => setMobileOpen(true)} />
        </Suspense>
        <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-[1640px] flex-1 px-4 pt-7 pb-12 outline-none sm:px-6 xl:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

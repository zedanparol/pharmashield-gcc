import { Compass } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/layout/brand";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <BrandMark className="size-10" />
      <div>
        <p className="eyebrow">Error 404</p>
        <h1 className="display mt-3 text-[2.25rem]">This page does not exist</h1>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          The address may be mistyped, or the page may have moved. Return to the overview to continue.
        </p>
      </div>
      <Button asChild>
        <Link href="/dashboard">
          <Compass aria-hidden /> Go to overview
        </Link>
      </Button>
    </main>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import { ShortagesView } from "@/components/shortages/shortages-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Shortage Intelligence" };

export default function ShortagesPage() {
  return (
    // The open alert is read from the query string, which is request data.
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <ShortagesView />
    </Suspense>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import { SupplierProfileView } from "@/components/suppliers/supplier-profile-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Supplier profile" };

export default function SupplierProfilePage({ params }: { params: Promise<{ manufacturerId: string }> }) {
  return (
    // Route params are request data, so they resolve inside a Suspense boundary.
    <Suspense fallback={<Skeleton className="h-52 w-full rounded-xl" />}>
      {params.then(({ manufacturerId }) => (
        <SupplierProfileView manufacturerId={decodeURIComponent(manufacturerId)} />
      ))}
    </Suspense>
  );
}

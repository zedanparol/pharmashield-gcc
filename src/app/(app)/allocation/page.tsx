import type { Metadata } from "next";
import { AllocationView } from "@/components/allocation/allocation-view";

export const metadata: Metadata = { title: "Order Allocation" };

export default function AllocationPage() {
  return <AllocationView />;
}

import type { Metadata } from "next";
import { SimulatorView } from "@/components/simulator/simulator-view";

export const metadata: Metadata = { title: "Crisis Simulator" };

export default function SimulatorPage() {
  return <SimulatorView />;
}

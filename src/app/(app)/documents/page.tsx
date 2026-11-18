import type { Metadata } from "next";
import { DocumentsView } from "@/components/documents/documents-view";

export const metadata: Metadata = { title: "Document Intelligence" };

export default function DocumentsPage() {
  return <DocumentsView />;
}

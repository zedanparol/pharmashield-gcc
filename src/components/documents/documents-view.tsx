"use client";

import { FileText, FileUp, UploadCloud } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";
import { AnalysisStatusBadge } from "@/components/shared/badges";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, Panel, PanelSkeleton } from "@/components/shared/panel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApi } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import { formatDateTime, formatFileSize } from "@/lib/utils/format";
import { describeError, getDocuments, recordAuditEvent, setMockDocumentStatus, uploadDocument, USE_MOCK_DATA } from "@/services/api";
import { useSessionStore, useWorkspaceStore } from "@/stores/app-store";
import type { DocumentType } from "@/types";
import { DOCUMENT_TYPE_LABELS, DocumentWorkspace } from "./document-panels";

const MAX_FILE_BYTES = 20 * 1024 * 1024;

function validatePdf(file: File): string | null {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return "Only PDF documents can be analysed.";
  if (file.size > MAX_FILE_BYTES) return `The file is larger than ${formatFileSize(MAX_FILE_BYTES)}.`;
  if (file.size === 0) return "The file is empty.";
  return null;
}

export function DocumentsView() {
  const user = useSessionStore((state) => state.user);
  const mode = useWorkspaceStore((state) => state.mode);
  const documents = useApi("documents", getDocuments);
  const refetch = documents.refetch;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>("warning_letter");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const timers = useRef<number[]>([]);
  const urls = useRef<string[]>([]);

  // Clear simulated-processing timers and release preview URLs when leaving the page.
  useEffect(() => {
    const pendingTimers = timers.current;
    const createdUrls = urls.current;
    return () => {
      pendingTimers.forEach((id) => window.clearTimeout(id));
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  // Live mode: poll while the backend is still working on a document.
  const list = documents.data ?? [];
  const pending = list.some((d) => d.analysis_status === "queued" || d.analysis_status === "processing");
  useEffect(() => {
    if (USE_MOCK_DATA || !pending) return;
    const id = window.setInterval(refetch, 4000);
    return () => window.clearInterval(id);
  }, [pending, refetch]);

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file || !user) return;
      const problem = validatePdf(file);
      setUploadError(problem);
      if (problem) return;

      setUploading(true);
      try {
        const { data: record, meta } = await uploadDocument(file, documentType, user.name);
        const url = URL.createObjectURL(file);
        urls.current.push(url);
        setFileUrls((current) => ({ ...current, [record.document_id]: url }));
        setSelectedId(record.document_id);
        refetch();
        toast.success(`${file.name} added`, { description: "Queued for analysis." });

        if (meta.source === "mock") {
          // Simulated pipeline: queued → processing → analysed. No model runs.
          const advance = (status: "processing" | "analysed", delay: number) =>
            timers.current.push(
              window.setTimeout(() => {
                setMockDocumentStatus(record.document_id, status);
                refetch();
                if (status === "analysed") {
                  toast.success("Simulated analysis ready", { description: `${file.name} — canned result from the mock provider.` });
                  recordAuditEvent({
                    user: { name: user.name, role: user.role },
                    action: "document_analysed",
                    supplier: null,
                    previous_allocation: null,
                    new_allocation: null,
                    reason: `${file.name} uploaded; simulated analysis attached (no model was run).`,
                    scenario_mode: mode,
                    recommendation_id: null,
                  }).catch(() => undefined);
                }
              }, delay),
            );
          advance("processing", 900);
          advance("analysed", 3400);
        }
      } catch (error) {
        setUploadError(describeError(error));
        toast.error("Upload failed", { description: describeError(error) });
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [documentType, mode, refetch, user],
  );

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void handleFile(event.dataTransfer.files[0]);
  };

  const selected = list.find((d) => d.document_id === selectedId) ?? list[0];
  const mock = documents.meta?.source === "mock";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Module 06 · Document intelligence"
        title={
          <>
            Warning letters and supply contracts, read for <em className="font-normal">compliance and contract risk</em>.
          </>
        }
        description="Classify FDA CGMP warning letters and extract risk-bearing clauses from supply contracts. Results feed the compliance and contract risk criterion (C4)."
      />

      {mock ? (
        <p className="border border-dashed border-status-warning/60 px-4 py-2.5 text-xs leading-5 text-muted-foreground">
          <span className="eyebrow mr-2 text-foreground">Simulated analysis</span>
          No NLP model is connected. Sample documents show hand-written results, and uploaded PDFs receive a canned template after a simulated
          processing delay. Files stay in this browser and their contents are not read.
        </p>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          <Panel index="A" title="Add document" description="PDF, up to 20 MB">
            <div className="space-y-3">
              <div>
                <Label htmlFor="document-type" className="eyebrow text-[10.5px] leading-4">
                  Document type
                </Label>
                <Select value={documentType} onValueChange={(value) => setDocumentType(value as DocumentType)}>
                  <SelectTrigger id="document-type" className="mt-2 h-9 w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[]).map((type) => (
                      <SelectItem key={type} value={type}>
                        {DOCUMENT_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-[4px] border border-dashed px-4 py-6 text-center transition-colors",
                  dragging ? "border-signal bg-primary/10" : "border-input",
                )}
              >
                <UploadCloud aria-hidden className={cn("size-5", dragging ? "text-signal" : "text-muted-foreground")} strokeWidth={1.5} />
                <p className="text-[13px] font-medium">Drop a PDF here</p>
                <Button variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
                  <FileUp aria-hidden /> {uploading ? "Adding…" : "Choose file"}
                </Button>
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="sr-only"
                  aria-label="Choose a PDF document to upload"
                  onChange={(event) => void handleFile(event.target.files?.[0])}
                />
              </div>
              {uploadError ? (
                <p role="alert" className="text-xs text-destructive">
                  {uploadError}
                </p>
              ) : null}
            </div>
          </Panel>

          <Panel
            flush
            index="B"
            title="Document history"
            description={documents.data ? `${list.length} in the workspace` : documents.error ? "Documents are unavailable" : "Loading"}
            source={documents.meta?.source}
          >
            {documents.error ? (
              <ErrorState message={documents.error} onRetry={documents.refetch} />
            ) : documents.loading ? (
              <PanelSkeleton rows={4} className="p-4" />
            ) : list.length === 0 ? (
              <EmptyState icon={FileText} title="No documents yet" description="Upload a warning letter or supply contract to begin." />
            ) : (
              <ul className="divide-y divide-border" aria-label="Documents">
                {list.map((document) => {
                  const active = document.document_id === selected?.document_id;
                  return (
                    <li key={document.document_id}>
                      <button
                        type="button"
                        aria-current={active ? "true" : undefined}
                        onClick={() => setSelectedId(document.document_id)}
                        className={cn(
                          "relative block w-full py-3 pr-4 pl-5 text-left outline-none transition-colors hover:bg-accent/60 focus-visible:bg-accent/60",
                          active && "bg-accent",
                        )}
                      >
                        {active ? <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-signal" /> : null}
                        <span className="eyebrow block truncate text-[9.5px]">{DOCUMENT_TYPE_LABELS[document.document_type]}</span>
                        <span className="mt-0.5 block truncate text-[13px] font-medium" title={document.file_name}>
                          {document.file_name}
                        </span>
                        <span className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                          <AnalysisStatusBadge status={document.analysis_status} />
                          <span className="tabular text-[10.5px] text-faint">
                            {formatFileSize(document.size_bytes)} · {formatDateTime(document.uploaded_at)}
                          </span>
                        </span>
                        <span className="mt-1 block truncate text-[11px] text-muted-foreground">Added by {document.uploaded_by}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>

        {selected ? (
          <DocumentWorkspace key={selected.document_id} document={selected} fileUrl={fileUrls[selected.document_id]} />
        ) : (
          <Panel>
            {documents.loading ? (
              <PanelSkeleton rows={8} />
            ) : (
              <EmptyState icon={FileText} title="Select a document" description="Choose a document from the list to see its preview and analysis." className="h-[34rem]" />
            )}
          </Panel>
        )}
      </div>
    </div>
  );
}

"use client";

import { Check, CircleCheck, Download, FileText, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { DataSourceBadge, SeverityBadge } from "@/components/shared/badges";
import { RiskMeter } from "@/components/shared/meters";
import { EmptyState, ErrorState, PanelSkeleton } from "@/components/shared/panel";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import { formatDateTime, formatRatio, formatScore } from "@/lib/utils/format";
import { riskTone, severityTone, toneColor, type Tone } from "@/lib/utils/risk";
import { getDocumentAnalysis } from "@/services/api";
import type { ClauseType, DataSource, DocumentAnalysis, DocumentRecord, ViolationCategory } from "@/types";

export const DOCUMENT_TYPE_LABELS: Record<DocumentRecord["document_type"], string> = {
  warning_letter: "FDA CGMP warning letter",
  supply_contract: "Supply contract",
};

const VIOLATION_LABELS: Record<ViolationCategory, string> = {
  sterility: "Sterility assurance",
  data_integrity: "Data integrity",
  process_validation: "Process validation",
  quality_unit: "Quality unit",
};

const CLAUSE_LABELS: Record<ClauseType, string> = {
  force_majeure: "Force majeure",
  lead_time: "Lead time",
  penalty: "Penalty",
  single_source: "Single source",
};

/* ── Report download ────────────────────────────────────────────────────── */

function buildReport(document: DocumentRecord, analysis: DocumentAnalysis, source: DataSource | undefined): string {
  const lines: string[] = [
    "PHARMASHIELD GCC — DOCUMENT ANALYSIS REPORT",
    "===========================================",
    "",
  ];
  if (source === "mock") {
    lines.push(
      "*** SIMULATED RESULT ***",
      "This report was produced by the prototype's mock provider. No NLP model",
      "analysed this document. Do not use it for any compliance or procurement decision.",
      "",
    );
  }
  lines.push(
    `Document:       ${document.file_name}`,
    `Document ID:    ${document.document_id}`,
    `Type:           ${DOCUMENT_TYPE_LABELS[document.document_type]}`,
    `Manufacturer:   ${document.manufacturer_name ?? "Not identified"}`,
    `Analysed:       ${formatDateTime(analysis.analysed_at)} (GST)`,
    `Model version:  ${analysis.model_version}`,
    "",
    "SUMMARY",
    "-------",
    analysis.summary,
    "",
  );
  if (analysis.compliance_risk_score !== null) lines.push(`Compliance risk score: ${formatScore(analysis.compliance_risk_score)} (0–1, lower is better)`, "");
  if (analysis.contract_risk_score !== null) lines.push(`Contract risk score:   ${formatScore(analysis.contract_risk_score)} (0–1, lower is better)`, "");
  if (analysis.violations.length) {
    lines.push("CGMP VIOLATIONS", "---------------");
    analysis.violations.forEach((v, i) => {
      lines.push(
        `${i + 1}. ${VIOLATION_LABELS[v.category]} — severity ${v.severity}, confidence ${formatRatio(v.confidence)}`,
        `   Reference: ${v.reference} · page ${v.page}`,
        `   "${v.excerpt}"`,
        "",
      );
    });
  }
  if (analysis.clauses.length) {
    lines.push("CONTRACT CLAUSES", "----------------");
    analysis.clauses.forEach((c, i) => {
      lines.push(
        `${i + 1}. ${CLAUSE_LABELS[c.type]} — ${c.detected ? "detected" : "not detected"}, risk ${c.risk}${c.page ? `, page ${c.page}` : ""}`,
        `   "${c.excerpt}"`,
        `   Interpretation: ${c.interpretation}`,
        "",
      );
    });
  }
  return lines.join("\n");
}

function downloadReport(document: DocumentRecord, analysis: DocumentAnalysis, source: DataSource | undefined) {
  const blob = new Blob([buildReport(document, analysis, source)], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = `${document.document_id}-analysis-report.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

/* ── Preview ────────────────────────────────────────────────────────────── */

interface Highlight {
  text: string;
  tone: Tone;
}

function highlightParagraph(paragraph: string, highlights: Highlight[]): ReactNode {
  const match = highlights.find((h) => paragraph.includes(h.text));
  if (!match) return paragraph;
  const [before, after] = paragraph.split(match.text);
  return (
    <>
      {before}
      <mark
        className="px-0.5 text-inherit"
        style={{ background: `color-mix(in oklab, ${toneColor[match.tone]} 26%, transparent)`, boxShadow: `inset 0 -2px 0 ${toneColor[match.tone]}` }}
      >
        {match.text}
      </mark>
      {after}
    </>
  );
}

const PANE_HEIGHT = "h-[36rem]";

export function DocumentPreview({
  document,
  analysis,
  fileUrl,
}: {
  document: DocumentRecord;
  analysis: DocumentAnalysis | undefined;
  /** Object URL of a PDF uploaded in this session, if any. */
  fileUrl: string | undefined;
}) {
  if (fileUrl) {
    return <iframe title={`Preview of ${document.file_name}`} src={`${fileUrl}#toolbar=0&view=FitH`} className={cn(PANE_HEIGHT, "w-full bg-white")} />;
  }
  if (!analysis?.preview_paragraphs.length) {
    return (
      <EmptyState
        icon={FileText}
        title="No preview available"
        description="A preview appears here once the document has been analysed, or immediately for PDFs uploaded in this session."
        className={PANE_HEIGHT}
      />
    );
  }

  const highlights: Highlight[] = [
    ...analysis.violations.map((v) => ({ text: v.excerpt, tone: severityTone[v.severity] })),
    ...analysis.clauses.filter((c) => c.detected).map((c) => ({ text: c.excerpt, tone: severityTone[c.risk] })),
  ];
  const [heading, ...body] = analysis.preview_paragraphs;

  return (
    <div className={cn(PANE_HEIGHT, "overflow-y-auto bg-surface-2 p-4 sm:p-7")}>
      {/* The sheet is paper in both themes, like a scanned page on a desk. */}
      <article className="mx-auto max-w-xl bg-paper px-7 py-9 font-serif text-[13.5px] leading-[1.75] text-paper-ink shadow-[0_1px_0_rgb(0_0_0/0.06),0_12px_32px_-12px_rgb(0_0_0/0.35)] sm:px-11 sm:py-12">
        <p className="font-mono text-[9.5px] tracking-[0.16em] text-[#6b7180] uppercase">{document.manufacturer_name ?? "Document"}</p>
        <h3 className="mt-2 border-b border-[#1a1d24]/20 pb-4 text-[1.25rem] leading-7 font-normal tracking-[-0.01em]">{heading}</h3>
        {body.map((paragraph) => (
          <p key={paragraph} className="mt-4">
            {highlightParagraph(paragraph, highlights)}
          </p>
        ))}
        <p className="mt-9 border-t border-[#1a1d24]/20 pt-3 font-sans text-[11px] leading-4 text-[#6b7180]">
          Demonstration excerpt written for the prototype. Not the original document.
        </p>
      </article>
    </div>
  );
}

/* ── Analysis ───────────────────────────────────────────────────────────── */

const toneWords = { good: "Low", warning: "Moderate", critical: "High", serious: "High", neutral: "", info: "" } as const;

function ScoreBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-r border-b border-border p-4">
      <p className="eyebrow">{label}</p>
      <p className="mt-2.5 flex items-baseline gap-2">
        <span className="figure text-[30px]">{formatScore(value)}</span>
        <span className="text-xs text-muted-foreground">{toneWords[riskTone(value)]} · lower is better</span>
      </p>
      <RiskMeter value={value} bare className="mt-3" />
    </div>
  );
}

function Finding({ tone, title, meta, badge, quote, children }: { tone: Tone; title: ReactNode; meta?: ReactNode; badge: ReactNode; quote: string; children?: ReactNode }) {
  return (
    <li className="relative py-3.5 pr-4 pl-5">
      <span aria-hidden className="absolute inset-y-0 left-0 w-[3px]" style={{ background: toneColor[tone] }} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-medium">{title}</p>
        {badge}
      </div>
      <blockquote className="mt-2 font-serif text-[13px] leading-[1.6] text-foreground/85 italic">&ldquo;{quote}&rdquo;</blockquote>
      {children}
      {meta ? <p className="tabular mt-2 text-[10.5px] text-faint">{meta}</p> : null}
    </li>
  );
}

function AnalysisBody({ analysis }: { analysis: DocumentAnalysis }) {
  const categories = Object.keys(VIOLATION_LABELS) as ViolationCategory[];
  const hasScores = analysis.compliance_risk_score !== null || analysis.contract_risk_score !== null;
  return (
    <div>
      <p className="px-4 py-4 text-[13px] leading-5.5 text-muted-foreground">{analysis.summary}</p>

      {hasScores ? (
        <div className="overflow-hidden border-t border-border">
          <div className="-mr-px -mb-px grid sm:grid-cols-2">
            {analysis.compliance_risk_score !== null ? <ScoreBlock label="Compliance risk score" value={analysis.compliance_risk_score} /> : null}
            {analysis.contract_risk_score !== null ? <ScoreBlock label="Contract risk score" value={analysis.contract_risk_score} /> : null}
          </div>
        </div>
      ) : null}

      {analysis.violations.length ? (
        <section className="border-t border-border">
          <h3 className="eyebrow px-4 pt-3.5">Violation classification</h3>
          <ul className="grid grid-cols-2 gap-px px-4 pt-2.5 pb-3.5 sm:grid-cols-4">
            {categories.map((category) => {
              const count = analysis.violations.filter((v) => v.category === category).length;
              return (
                <li key={category} className={cn("border border-border px-2.5 py-2", count ? "bg-status-serious/10" : "")}>
                  <p className={cn("figure text-xl", count ? "" : "text-faint")}>{count}</p>
                  <p className="mt-1.5 text-[11px] leading-3.5 text-muted-foreground">{VIOLATION_LABELS[category]}</p>
                </li>
              );
            })}
          </ul>
          <ul className="divide-y divide-border border-t border-border">
            {analysis.violations.map((violation) => (
              <Finding
                key={violation.excerpt}
                tone={severityTone[violation.severity]}
                title={VIOLATION_LABELS[violation.category]}
                badge={<SeverityBadge severity={violation.severity} />}
                quote={violation.excerpt}
                meta={`${violation.reference} · page ${violation.page} · confidence ${formatRatio(violation.confidence)}`}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {analysis.clauses.length ? (
        <section className="border-t border-border">
          <h3 className="eyebrow px-4 pt-3.5 pb-2.5">Extracted clauses</h3>
          <ul className="divide-y divide-border border-t border-border">
            {analysis.clauses.map((clause) => (
              <Finding
                key={clause.type}
                tone={clause.detected ? severityTone[clause.risk] : "neutral"}
                title={
                  <>
                    {CLAUSE_LABELS[clause.type]}
                    <span className="eyebrow ml-2 text-[9.5px]">{clause.detected ? `Detected${clause.page ? ` · page ${clause.page}` : ""}` : "Not detected"}</span>
                  </>
                }
                badge={<SeverityBadge severity={clause.risk} />}
                quote={clause.excerpt}
              >
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{clause.interpretation}</p>
              </Finding>
            ))}
          </ul>
        </section>
      ) : null}

      {!analysis.violations.length && !analysis.clauses.length ? (
        <EmptyState icon={CircleCheck} title="Nothing flagged" description="No violations or clauses were returned for this document." />
      ) : null}
    </div>
  );
}

/* ── Progress ───────────────────────────────────────────────────────────── */

const STEPS = ["Queued", "Processing", "Analysed"] as const;

/** Where the document is in the analysis pipeline. */
function AnalysisProgress({ status }: { status: DocumentRecord["analysis_status"] }) {
  const reached = status === "queued" ? 0 : status === "processing" ? 1 : status === "analysed" ? 2 : -1;
  return (
    <ol className="flex items-center gap-2" aria-label={`Analysis status: ${status}`}>
      {STEPS.map((step, i) => {
        const done = reached > i || (reached === 2 && i === 2);
        const current = reached === i && !done;
        return (
          <li key={step} className="flex items-center gap-2">
            {i > 0 ? <span aria-hidden className={cn("h-px w-5", reached >= i ? "bg-foreground" : "bg-border")} /> : null}
            <span className={cn("eyebrow flex items-center gap-1.5 text-[9.5px]", (done || current) && "text-foreground")}>
              <span
                aria-hidden
                className={cn(
                  "flex size-3.5 items-center justify-center rounded-full border",
                  done ? "border-status-good bg-status-good text-background" : current ? "border-foreground" : "border-border",
                )}
              >
                {done ? <Check className="size-2.5" strokeWidth={3} /> : current ? <span className="size-1.5 animate-pulse rounded-full bg-foreground" /> : null}
              </span>
              {step}
            </span>
          </li>
        );
      })}
      {status === "failed" ? <li className="eyebrow text-[9.5px] text-foreground">· Failed</li> : null}
    </ol>
  );
}

/** One document on the desk: the sheet on the left, what was found in it on the right. */
export function DocumentWorkspace({ document, fileUrl }: { document: DocumentRecord; fileUrl: string | undefined }) {
  const analysed = document.analysis_status === "analysed";
  // Results exist only once analysis has finished; before that there is nothing to request.
  const analysis = useApi<DocumentAnalysis | null>(`analysis:${document.document_id}:${document.analysis_status}`, async () =>
    analysed ? getDocumentAnalysis(document.document_id) : { data: null, meta: { source: "mock", fetchedAt: "", origin: "" } },
  );
  const data = analysis.data ?? undefined;
  const source = analysed ? analysis.meta?.source : undefined;

  return (
    <div className="min-w-0 overflow-hidden rounded-md border border-border bg-card">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-border px-4 py-3.5">
        <div className="min-w-0">
          <p className="eyebrow">
            {DOCUMENT_TYPE_LABELS[document.document_type]} · <span className="text-foreground">{document.document_id}</span>
            {document.page_count ? ` · ${document.page_count} pages` : ""}
          </p>
          <h2 className="mt-1 truncate font-serif text-[1.375rem] leading-7 tracking-[-0.015em]" title={document.file_name}>
            {document.file_name}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <AnalysisProgress status={document.analysis_status} />
          <Button variant="outline" size="sm" disabled={!data} onClick={() => (data ? downloadReport(document, data, source) : undefined)}>
            <Download aria-hidden /> Report
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2">
        <section className="min-w-0 xl:border-r xl:border-border" aria-label="Document preview">
          <p className="eyebrow border-b border-border px-4 py-2 text-[9.5px]">Source document</p>
          <DocumentPreview document={document} analysis={data} fileUrl={fileUrl} />
        </section>

        <section className="min-w-0 max-xl:border-t max-xl:border-border" aria-label="Analysis results">
          <p className="eyebrow flex items-center justify-between gap-3 border-b border-border px-4 py-2 text-[9.5px]">
            <span className="truncate">{data ? `Findings · ${formatDateTime(data.analysed_at)} · ${data.model_version}` : "Findings"}</span>
            <DataSourceBadge source={source} className="h-4" />
          </p>

          {document.analysis_status === "queued" || document.analysis_status === "processing" ? (
            <div className={cn(PANE_HEIGHT, "flex flex-col items-center justify-center gap-3 px-6 text-center")} aria-live="polite">
              <Loader2 aria-hidden className="size-5 animate-spin text-signal" strokeWidth={1.5} />
              <p className="eyebrow text-foreground">{document.analysis_status === "queued" ? "Queued for analysis" : "Processing document"}</p>
              <p className="max-w-xs text-xs leading-5 text-muted-foreground">
                Simulated processing state. In the prototype no model reads the file; a canned result is attached when this step completes.
              </p>
            </div>
          ) : document.analysis_status === "failed" ? (
            <ErrorState message="Analysis failed for this document. Upload it again or contact the platform administrator." />
          ) : analysis.error ? (
            <ErrorState message={analysis.error} onRetry={analysis.refetch} />
          ) : !data ? (
            <PanelSkeleton rows={7} className="p-4" />
          ) : (
            <div className={cn(PANE_HEIGHT, "overflow-y-auto")}>
              <AnalysisBody analysis={data} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

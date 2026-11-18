"use client";

import { CircleCheck, ClipboardCheck, FileCheck2, Hand, ShieldCheck, Sparkles, UserCheck } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { KpiCard, MetricStrip } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, Panel, PanelSkeleton, SectionHeading } from "@/components/shared/panel";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { describeError, getAuditEvents, getRecommendations, submitDecision } from "@/services/api";
import { useSessionStore } from "@/stores/app-store";
import type { Recommendation } from "@/types";
import { AuditTimeline } from "./audit-timeline";
import type { DecisionPayload } from "./decision-dialogs";
import { RecommendationReview } from "./recommendation-review";

const workflow = [
  { icon: Sparkles, title: "Recommendation", body: "The engine proposes a supplier and allocation with its explanation." },
  { icon: UserCheck, title: "Human review", body: "An authorised reviewer inspects the scores, SHAP drivers and split." },
  { icon: ClipboardCheck, title: "Decision", body: "Approve, override with a reason, or reject with a reason." },
  { icon: FileCheck2, title: "Audit record", body: "The decision is time-stamped with user, scenario and allocation." },
  { icon: Hand, title: "Order raised manually", body: "Purchase orders are issued outside PharmaShield by procurement staff." },
];

const decisionToasts = {
  approve: "Allocation approved",
  override: "Override recorded",
  reject: "Recommendation rejected",
} as const;

export function AuditView() {
  const user = useSessionStore((state) => state.user);
  const recommendations = useApi("recommendations", getRecommendations);
  const audit = useApi("audit", getAuditEvents);

  const pending = (recommendations.data ?? []).filter((r) => r.status === "pending");
  const events = audit.data ?? [];
  const count = (action: string) => events.filter((event) => event.action === action).length;

  const decide = async (recommendation: Recommendation, payload: DecisionPayload) => {
    if (!user) throw new Error("No active session.");
    try {
      await submitDecision({
        recommendation_id: recommendation.recommendation_id,
        decision: payload.decision,
        reason: payload.reason,
        override_allocation: payload.override_allocation,
        user: { name: user.name, role: user.role },
      });
      toast.success(decisionToasts[payload.decision], {
        description: `${recommendation.recommendation_id} recorded in the audit trail. No purchase order was transmitted.`,
      });
      recommendations.refetch();
      audit.refetch();
    } catch (error) {
      toast.error("The decision could not be recorded.", { description: describeError(error) });
      throw error;
    }
  };

  const COUNT = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Module 07 · Governance and audit trail"
        title={
          recommendations.data ? (
            pending.length ? (
              <>
                {COUNT[pending.length] ?? pending.length} recommendation{pending.length === 1 ? "" : "s"}{" "}
                <em className="font-normal">await{pending.length === 1 ? "s" : ""} a human decision</em>.
              </>
            ) : (
              <>
                Nothing is waiting. <em className="font-normal">Every allocation has a recorded decision.</em>
              </>
            )
          ) : (
            "Governance and audit trail"
          )
        }
        description="Human approval is mandatory for every allocation. Review pending recommendations here and trace every decision that has been made."
      />

      <section aria-label="Human-in-the-loop policy" className="relative flex items-start gap-3 rounded-md border border-border bg-card py-3.5 pr-4 pl-6">
        <span aria-hidden className="absolute inset-y-0 left-0 w-1 rounded-l-md bg-signal" />
        <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-signal" strokeWidth={1.6} />
        <p className="text-[13px] leading-5.5">
          <span className="font-medium">PharmaShield never executes procurement orders autonomously.</span>{" "}
          <span className="text-muted-foreground">
            Approving, overriding or rejecting a recommendation in this prototype writes an audit record only. No purchase order is created,
            transmitted or scheduled.
          </span>
        </p>
      </section>

      <div className="grid grid-cols-1 gap-x-8 gap-y-6 xl:grid-cols-12">
        <section aria-labelledby="workflow-heading" className="xl:col-span-8">
          <SectionHeading id="workflow-heading" index="01" title="Approval workflow" description="Every allocation follows these steps" />
          <ol className="mt-4 grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-5">
            {workflow.map((step, i) => (
              <li key={step.title} className="relative">
                <div className="flex items-center gap-2">
                  <span className="tabular text-[11px] font-medium text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                  <span aria-hidden className="h-px flex-1 bg-border" />
                  <step.icon aria-hidden className="size-3.5 text-muted-foreground" strokeWidth={1.6} />
                </div>
                <p className="mt-2 text-[13px] font-medium">{step.title}</p>
                <p className="mt-1 text-xs leading-4.5 text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <div className="min-w-0 xl:col-span-4">
          <MetricStrip label="Decision counts" className="grid-cols-2">
            <KpiCard label="Awaiting review" value={pending.length} caption="Pending a decision" tone={pending.length ? "warning" : "good"} loading={recommendations.loading} />
            <KpiCard label="Approved" value={count("approved")} caption="In the trail" tone="good" loading={audit.loading} />
            <KpiCard label="Overridden" value={count("overridden")} caption="Allocation changed" tone="warning" loading={audit.loading} />
            <KpiCard label="Rejected" value={count("rejected")} caption="Declined" tone="critical" loading={audit.loading} />
          </MetricStrip>
        </div>
      </div>

      <section aria-labelledby="review-heading" className="space-y-4">
        <SectionHeading
          id="review-heading"
          index="02"
          title="Approval queue"
          description="Each pending recommendation with its explanation and the allocation it would put in place"
        />
        {recommendations.error ? (
          <Panel>
            <ErrorState message={recommendations.error} onRetry={recommendations.refetch} />
          </Panel>
        ) : recommendations.loading ? (
          <Panel>
            <PanelSkeleton rows={6} />
          </Panel>
        ) : pending.length === 0 ? (
          <Panel>
            <EmptyState
              icon={CircleCheck}
              title="Nothing is waiting for review"
              description="Submit an allocation for approval from Order Allocation to create a new review item."
              action={
                <Button variant="outline" size="sm" asChild>
                  <Link href="/allocation">Open Order Allocation</Link>
                </Button>
              }
            />
          </Panel>
        ) : (
          pending.map((recommendation) => (
            <RecommendationReview
              key={recommendation.recommendation_id}
              recommendation={recommendation}
              source={recommendations.meta?.source}
              onDecision={decide}
            />
          ))
        )}
      </section>

      <Panel
        flush
        index="03"
        title="Audit trail"
        description={audit.data ? `${events.length} time-stamped events, newest first` : audit.error ? "Audit events are unavailable" : "Loading audit events"}
        source={audit.meta?.source}
      >
        {audit.error ? (
          <ErrorState message={audit.error} onRetry={audit.refetch} />
        ) : audit.loading ? (
          <PanelSkeleton rows={6} className="p-4" />
        ) : (
          <AuditTimeline events={events} />
        )}
      </Panel>
    </div>
  );
}

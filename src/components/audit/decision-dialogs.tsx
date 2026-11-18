"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2, PenLine, ShieldCheck, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { RoleBadge } from "@/components/shared/badges";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ALLOCATION_RULES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { formatNumber, formatPct } from "@/lib/utils/format";
import {
  approveFormSchema,
  MIN_REASON_LENGTH,
  overrideFormSchema,
  rejectFormSchema,
  type ApproveFormValues,
  type OverrideFormValues,
  type RejectFormValues,
} from "@/lib/validation/forms";
import type { AllocationShare, Recommendation } from "@/types";

export type DecisionKind = "approve" | "override" | "reject";

export interface DecisionPayload {
  decision: DecisionKind;
  reason: string | null;
  override_allocation: AllocationShare[] | null;
}

interface DialogProps {
  recommendation: Recommendation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Resolves when the decision has been recorded; rejects to keep the dialog open. */
  onSubmit: (payload: DecisionPayload) => Promise<void>;
}

/** Shown in every decision dialog so the scope of the action is never ambiguous. */
function NoOrderNotice() {
  return (
    <p className="relative flex gap-2.5 border border-border py-2.5 pr-3 pl-4 text-xs leading-5 text-muted-foreground">
      <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-signal" />
      <ShieldCheck aria-hidden className="mt-0.5 size-3.5 shrink-0 text-signal" />
      <span>
        This records your decision in the audit trail. <strong className="font-medium text-foreground">It does not place, send or
        schedule a purchase order.</strong> Orders are raised separately through the procurement system.
      </span>
    </p>
  );
}

function FieldError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="text-xs text-destructive">
      {children}
    </p>
  );
}

function AllocationSummary({ shares }: { shares: AllocationShare[] }) {
  return (
    <ul className="divide-y divide-border rounded-[4px] border border-border">
      {shares.map((share) => (
        <li key={share.manufacturer_id} className="flex items-center justify-between gap-3 px-3 py-2 text-[13px]">
          <span className="flex min-w-0 items-center gap-2">
            <RoleBadge role={share.role} />
            <span className="truncate">{share.manufacturer_name}</span>
          </span>
          <span className="tabular shrink-0 font-medium">
            {formatPct(share.allocation_pct)} · {formatNumber(share.allocated_units)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function useSubmit(onSubmit: DialogProps["onSubmit"], onOpenChange: DialogProps["onOpenChange"]) {
  const [pending, setPending] = useState(false);
  const run = async (payload: DecisionPayload) => {
    setPending(true);
    try {
      await onSubmit(payload);
      onOpenChange(false);
    } catch {
      // The caller reports the failure; the dialog stays open so nothing typed is lost.
    } finally {
      setPending(false);
    }
  };
  return { pending, run };
}

/* ── Approve ────────────────────────────────────────────────────────────── */

export function ApproveDialog({ recommendation, open, onOpenChange, onSubmit }: DialogProps) {
  const { pending, run } = useSubmit(onSubmit, onOpenChange);
  const form = useForm<ApproveFormValues>({
    resolver: zodResolver(approveFormSchema),
    defaultValues: { reason: "", acknowledged: false as unknown as true },
  });
  const acknowledged = useWatch({ control: form.control, name: "acknowledged" });
  const { errors } = form.formState;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-[1.375rem] leading-7 font-normal tracking-[-0.015em]">Approve this allocation?</DialogTitle>
          <DialogDescription>
            {recommendation.recommendation_id} · {formatNumber(recommendation.monthly_demand_units)} vials of {recommendation.sku_name}
          </DialogDescription>
        </DialogHeader>
        <form
          id="approve-form"
          noValidate
          className="space-y-3.5"
          onSubmit={form.handleSubmit((values) =>
            run({ decision: "approve", reason: values.reason.trim() || null, override_allocation: null }),
          )}
        >
          <AllocationSummary shares={recommendation.proposed_allocation} />
          <div className="space-y-1.5">
            <Label htmlFor="approve-note">Note for the audit record (optional)</Label>
            <Textarea id="approve-note" rows={2} placeholder="Add context for this approval" {...form.register("reason")} />
            <FieldError>{errors.reason?.message}</FieldError>
          </div>
          <div className="flex items-start gap-2.5">
            <Checkbox
              id="approve-ack"
              className="mt-0.5"
              checked={acknowledged === true}
              aria-invalid={!!errors.acknowledged}
              onCheckedChange={(checked) =>
                form.setValue("acknowledged", (checked === true) as true, { shouldValidate: form.formState.isSubmitted })
              }
            />
            <Label htmlFor="approve-ack" className="text-[13px] leading-5 font-normal">
              I have reviewed the recommendation, its SHAP explanation and the proposed allocation.
            </Label>
          </div>
          <FieldError>{errors.acknowledged?.message}</FieldError>
          <NoOrderNotice />
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form="approve-form" disabled={pending}>
            {pending ? <Loader2 aria-hidden className="animate-spin" /> : <Check aria-hidden />} Confirm approval
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Reject ─────────────────────────────────────────────────────────────── */

export function RejectDialog({ recommendation, open, onOpenChange, onSubmit }: DialogProps) {
  const { pending, run } = useSubmit(onSubmit, onOpenChange);
  const form = useForm<RejectFormValues>({ resolver: zodResolver(rejectFormSchema), defaultValues: { reason: "" } });
  const error = form.formState.errors.reason?.message;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-[1.375rem] leading-7 font-normal tracking-[-0.015em]">Reject this recommendation?</DialogTitle>
          <DialogDescription>
            {recommendation.recommendation_id} will be closed and the current allocation stays in force.
          </DialogDescription>
        </DialogHeader>
        <form
          id="reject-form"
          noValidate
          className="space-y-3.5"
          onSubmit={form.handleSubmit((values) => run({ decision: "reject", reason: values.reason.trim(), override_allocation: null }))}
        >
          <div className="space-y-1.5">
            <Label htmlFor="reject-reason">Reason for rejection</Label>
            <Textarea
              id="reject-reason"
              rows={3}
              placeholder="Explain why this recommendation should not proceed"
              aria-invalid={!!error}
              {...form.register("reason")}
            />
            <FieldError>{error}</FieldError>
            {error ? null : <p className="text-xs text-muted-foreground">Required. At least {MIN_REASON_LENGTH} characters.</p>}
          </div>
          <NoOrderNotice />
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form="reject-form" variant="destructive" disabled={pending}>
            {pending ? <Loader2 aria-hidden className="animate-spin" /> : <X aria-hidden />} Confirm rejection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Override ───────────────────────────────────────────────────────────── */

export function OverrideDialog({ recommendation, open, onOpenChange, onSubmit }: DialogProps) {
  const { pending, run } = useSubmit(onSubmit, onOpenChange);
  const proposed = recommendation.proposed_allocation;
  const form = useForm<OverrideFormValues>({
    resolver: zodResolver(overrideFormSchema),
    defaultValues: {
      reason: "",
      shares: proposed.map((share) => ({ manufacturer_id: share.manufacturer_id, pct: share.allocation_pct })),
    },
  });
  const { fields } = useFieldArray({ control: form.control, name: "shares" });
  const shares = useWatch({ control: form.control, name: "shares" });
  const { errors } = form.formState;

  const total = shares.reduce((sum, share) => sum + (Number.isFinite(share.pct) ? share.pct : 0), 0);
  const overCap = shares.some((share) => share.pct > ALLOCATION_RULES.primaryMaxPct);
  const trialOutOfBand = shares.some((share, i) => {
    const role = proposed[i]?.role;
    return role === "probation" && share.pct > 0 && (share.pct < ALLOCATION_RULES.probationMinPct || share.pct > ALLOCATION_RULES.probationMaxPct);
  });
  const sharesError = errors.shares?.root?.message ?? errors.shares?.message ?? errors.shares?.find?.((e) => e?.pct)?.pct?.message;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-[1.375rem] leading-7 font-normal tracking-[-0.015em]">Override the proposed allocation</DialogTitle>
          <DialogDescription>
            Adjust each supplier&apos;s share of {formatNumber(recommendation.monthly_demand_units)} vials. Shares must total 100%.
          </DialogDescription>
        </DialogHeader>
        <form
          id="override-form"
          noValidate
          className="space-y-3.5"
          onSubmit={form.handleSubmit((values) => {
            if (values.shares.some((share) => share.pct > ALLOCATION_RULES.primaryMaxPct)) return;
            run({
              decision: "override",
              reason: values.reason.trim(),
              override_allocation: values.shares
                .map((share, i) => ({
                  ...proposed[i],
                  allocation_pct: share.pct,
                  allocated_units: Math.round((share.pct / 100) * recommendation.monthly_demand_units),
                }))
                .filter((share) => share.allocation_pct > 0),
            });
          })}
        >
          <fieldset className="rounded-[4px] border border-border">
            <legend className="sr-only">Allocation shares</legend>
            <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_6.5rem] gap-3 border-b border-border bg-muted/40 px-3 py-1.5 font-mono text-[9.5px] font-medium tracking-[0.1em] text-muted-foreground uppercase">
              <span>Supplier</span>
              <span className="text-right">Proposed</span>
              <span className="text-right">Override %</span>
            </div>
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-[minmax(0,1fr)_4.5rem_6.5rem] items-center gap-3 border-b border-border px-3 py-2 last:border-b-0">
                <span className="flex min-w-0 items-center gap-2 text-[13px]">
                  <RoleBadge role={proposed[index].role} />
                  <span className="truncate">{proposed[index].manufacturer_name}</span>
                </span>
                <span className="tabular text-right text-xs text-muted-foreground">{formatPct(proposed[index].allocation_pct, 1)}</span>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  step={1}
                  aria-label={`Override share for ${proposed[index].manufacturer_name}, percent`}
                  aria-invalid={!!errors.shares?.[index]?.pct || shares[index]?.pct > ALLOCATION_RULES.primaryMaxPct}
                  className="tabular h-8 text-right"
                  {...form.register(`shares.${index}.pct`, { valueAsNumber: true })}
                />
              </div>
            ))}
            <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_6.5rem] gap-3 border-t border-border bg-muted/40 px-3 py-2 text-[13px] font-semibold">
              <span>Total</span>
              <span className="tabular text-right">100%</span>
              <span className={cn("tabular pr-3 text-right", Math.abs(total - 100) >= 0.01 && "text-destructive")}>{formatPct(total, 1)}</span>
            </div>
          </fieldset>
          <FieldError>
            {overCap ? `No supplier may hold more than the ${ALLOCATION_RULES.primaryMaxPct}% Tier 1 cap.` : sharesError}
          </FieldError>
          {trialOutOfBand && !overCap ? (
            <p className="text-xs leading-5 text-muted-foreground">
              Note: the probation trial is outside the usual {ALLOCATION_RULES.probationMinPct}–{ALLOCATION_RULES.probationMaxPct}% band. Explain
              why in the reason below.
            </p>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="override-reason">Reason for override</Label>
            <Textarea
              id="override-reason"
              rows={3}
              placeholder="Explain why the proposed allocation is being changed"
              aria-invalid={!!errors.reason}
              {...form.register("reason")}
            />
            <FieldError>{errors.reason?.message}</FieldError>
            {errors.reason ? null : <p className="text-xs text-muted-foreground">Required. At least {MIN_REASON_LENGTH} characters.</p>}
          </div>
          <NoOrderNotice />
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form="override-form" disabled={pending || overCap}>
            {pending ? <Loader2 aria-hidden className="animate-spin" /> : <PenLine aria-hidden />} Record override
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

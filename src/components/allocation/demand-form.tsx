"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_MONTHLY_DEMAND } from "@/lib/constants";
import { formatNumber } from "@/lib/utils/format";
import { demandFormSchema, MAX_DEMAND, MIN_DEMAND, type DemandFormValues } from "@/lib/validation/forms";

const PRESETS = [5_000, DEFAULT_MONTHLY_DEMAND, 20_000, 40_000];

export function DemandForm({ demand, onSubmit, busy }: { demand: number; onSubmit: (demand: number) => void; busy?: boolean }) {
  const form = useForm<DemandFormValues>({
    resolver: zodResolver(demandFormSchema),
    defaultValues: { monthlyDemand: demand },
  });
  const error = form.formState.errors.monthlyDemand?.message;

  // Keep the field in step when demand changes elsewhere (presets, Settings).
  useEffect(() => {
    form.reset({ monthlyDemand: demand });
  }, [demand, form]);

  return (
    <form noValidate onSubmit={form.handleSubmit((values) => onSubmit(values.monthlyDemand))} className="space-y-2.5">
      <div>
        <Label htmlFor="monthly-demand" className="text-xs">
          Monthly demand (vials)
        </Label>
        <div className="mt-1.5 flex gap-2">
          <Input
            id="monthly-demand"
            type="number"
            inputMode="numeric"
            min={MIN_DEMAND}
            max={MAX_DEMAND}
            step={500}
            className="tabular h-9"
            aria-invalid={!!error}
            aria-describedby="monthly-demand-hint"
            {...form.register("monthlyDemand", { valueAsNumber: true })}
          />
          <Button type="submit" className="h-9" disabled={busy}>
            <RefreshCw aria-hidden className={busy ? "animate-spin" : undefined} /> Update
          </Button>
        </div>
        <p id="monthly-demand-hint" role={error ? "alert" : undefined} className={error ? "mt-1.5 text-xs text-destructive" : "mt-1.5 text-xs text-muted-foreground"}>
          {error ?? `Between ${formatNumber(MIN_DEMAND)} and ${formatNumber(MAX_DEMAND)} vials. Default is ${formatNumber(DEFAULT_MONTHLY_DEMAND)}.`}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Demand presets">
        {PRESETS.map((preset) => (
          <Button
            key={preset}
            type="button"
            variant={preset === demand ? "secondary" : "outline"}
            size="xs"
            aria-pressed={preset === demand}
            onClick={() => onSubmit(preset)}
          >
            {formatNumber(preset)}
          </Button>
        ))}
      </div>
    </form>
  );
}

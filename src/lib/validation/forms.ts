import { z } from "zod";

export const loginFormSchema = z.object({
  email: z.string().trim().min(1, "Enter your work email.").pipe(z.email("Enter a valid email address.")),
  password: z.string().min(8, "Password must be at least 8 characters."),
  remember: z.boolean(),
});
export type LoginFormValues = z.infer<typeof loginFormSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1, "Enter your work email.").pipe(z.email("Enter a valid email address.")),
});
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const MIN_DEMAND = 500;
export const MAX_DEMAND = 60_000;

export const demandFormSchema = z.object({
  monthlyDemand: z
    .number({ error: "Enter a number of vials." })
    .int("Demand must be a whole number of vials.")
    .min(MIN_DEMAND, `Minimum demand is ${MIN_DEMAND.toLocaleString("en-GB")} vials.`)
    .max(MAX_DEMAND, `Maximum demand is ${MAX_DEMAND.toLocaleString("en-GB")} vials.`),
});
export type DemandFormValues = z.infer<typeof demandFormSchema>;

export const MIN_REASON_LENGTH = 15;

const reason = z
  .string()
  .trim()
  .min(MIN_REASON_LENGTH, `Give a reason of at least ${MIN_REASON_LENGTH} characters for the audit record.`)
  .max(600, "Keep the reason under 600 characters.");

export const approveFormSchema = z.object({
  reason: z.string().trim().max(600, "Keep the note under 600 characters."),
  acknowledged: z.literal(true, { error: "Confirm that you have reviewed the recommendation." }),
});
export type ApproveFormValues = z.input<typeof approveFormSchema>;

export const rejectFormSchema = z.object({ reason });
export type RejectFormValues = z.infer<typeof rejectFormSchema>;

export const overrideFormSchema = z
  .object({
    reason,
    shares: z.array(
      z.object({
        manufacturer_id: z.string(),
        pct: z.number({ error: "Enter a percentage." }).min(0, "Cannot be negative.").max(100, "Cannot exceed 100%."),
      }),
    ),
  })
  .refine((value) => Math.abs(value.shares.reduce((sum, share) => sum + share.pct, 0) - 100) < 0.01, {
    message: "Allocation shares must total 100%.",
    path: ["shares"],
  });
export type OverrideFormValues = z.infer<typeof overrideFormSchema>;

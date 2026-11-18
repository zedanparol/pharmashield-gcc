"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeOff, Info, Loader2, PlayCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useHydrated } from "@/hooks/use-hydrated";
import {
  forgotPasswordSchema,
  loginFormSchema,
  type ForgotPasswordValues,
  type LoginFormValues,
} from "@/lib/validation/forms";
import { DEMO_USER, useSessionStore } from "@/stores/app-store";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-xs text-destructive">
      {message}
    </p>
  );
}

function ForgotPasswordDialog() {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const form = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" } });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setSubmitted(null);
          form.reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <button type="button" className="rounded-sm text-xs font-medium text-signal outline-none hover:underline hover:underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring">
          Forgot password?
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset your password</DialogTitle>
          <DialogDescription>Enter your work email and we will send reset instructions.</DialogDescription>
        </DialogHeader>
        {submitted ? (
          <div className="flex gap-2.5 rounded-[4px] border border-border bg-muted/50 p-3 text-sm leading-5">
            <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-signal" />
            <p>
              Password reset is not connected in this prototype, so <strong>no email was sent</strong> to {submitted}. Use demo
              access to enter the workspace.
            </p>
          </div>
        ) : (
          <form
            id="forgot-password-form"
            noValidate
            onSubmit={form.handleSubmit((values) => setSubmitted(values.email))}
            className="space-y-1.5"
          >
            <Label htmlFor="reset-email">Work email</Label>
            <Input
              id="reset-email"
              type="email"
              autoComplete="email"
              placeholder="name@organisation.ae"
              aria-invalid={!!form.formState.errors.email}
              aria-describedby="reset-email-error"
              {...form.register("email")}
            />
            <FieldError id="reset-email-error" message={form.formState.errors.email?.message} />
          </form>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {submitted ? "Close" : "Cancel"}
          </Button>
          {submitted ? null : (
            <Button type="submit" form="forgot-password-form">
              Send reset link
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function LoginForm() {
  const router = useRouter();
  const hydrated = useHydrated();
  const user = useSessionStore((state) => state.user);
  const signIn = useSessionStore((state) => state.signIn);
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState<"form" | "demo" | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "", remember: true },
  });
  const { errors } = form.formState;
  const remember = useWatch({ control: form.control, name: "remember" });

  useEffect(() => {
    if (hydrated && user) router.replace("/dashboard");
  }, [hydrated, user, router]);

  const enter = (kind: "form" | "demo", email?: string, rememberSession = true) => {
    setPending(kind);
    // Brief pause so the pending state is perceptible; nothing is sent anywhere.
    window.setTimeout(() => {
      signIn(
        kind === "demo" || !email
          ? DEMO_USER
          : { ...DEMO_USER, name: displayNameFromEmail(email), email, role: "Procurement Analyst" },
        rememberSession,
      );
      router.replace("/dashboard");
    }, 450);
  };

  return (
    <div className="w-full max-w-sm">
      <p className="eyebrow">PharmaShield Intelligence System</p>
      <h1 className="display mt-3 text-[2.25rem]">Sign in</h1>
      <p className="mt-2.5 text-sm text-muted-foreground">Access the procurement intelligence workspace.</p>

      <form
        noValidate
        className="mt-7 space-y-4"
        onSubmit={form.handleSubmit((values) => enter("form", values.email, values.remember))}
      >
        <div className="space-y-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="name@organisation.ae"
            className="h-10"
            aria-invalid={!!errors.email}
            aria-describedby="email-error"
            {...form.register("email")}
          />
          <FieldError id="email-error" message={errors.email?.message} />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <ForgotPasswordDialog />
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              className="h-10 pr-10"
              aria-invalid={!!errors.password}
              aria-describedby="password-error"
              {...form.register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              {showPassword ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
            </button>
          </div>
          <FieldError id="password-error" message={errors.password?.message} />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="remember"
            checked={remember}
            onCheckedChange={(checked) => form.setValue("remember", checked === true)}
          />
          <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground">
            Remember me on this device
          </Label>
        </div>

        <Button type="submit" size="lg" className="h-10 w-full" disabled={pending !== null}>
          {pending === "form" ? <Loader2 aria-hidden className="animate-spin" /> : null}
          Sign in
          {pending === "form" ? null : <ArrowRight aria-hidden />}
        </Button>
      </form>

      <div className="eyebrow my-5 flex items-center gap-3 text-[9.5px]">
        <span className="h-px flex-1 bg-border" />
        Prototype access
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button variant="outline" size="lg" className="h-10 w-full" disabled={pending !== null} onClick={() => enter("demo")}>
        {pending === "demo" ? <Loader2 aria-hidden className="animate-spin" /> : <PlayCircle aria-hidden />}
        Continue with demo account
      </Button>

      <div className="relative mt-6 flex gap-2.5 border border-border py-3 pr-3 pl-4 text-xs leading-5 text-muted-foreground">
        <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-status-warning" />
        <Info aria-hidden className="mt-0.5 size-3.5 shrink-0 text-status-warning" />
        <p>
          <strong className="font-medium text-foreground">No authentication service is connected.</strong> Any valid email
          and 8+ character password opens a prototype session. Credentials are not verified, stored or transmitted.
        </p>
      </div>
    </div>
  );
}

function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const words = local.split(/[._-]+/).filter(Boolean);
  if (!words.length) return "Prototype User";
  return words.map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
}

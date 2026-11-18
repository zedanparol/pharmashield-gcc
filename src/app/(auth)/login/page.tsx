import { Lock } from "lucide-react";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { Brand } from "@/components/layout/brand";
import { countryAnchor } from "@/lib/geo/countries";
import { landDotsPath, type MapView } from "@/lib/geo/dots";

export const metadata: Metadata = { title: "Sign in" };

const capabilities = [
  {
    title: "Multi-source supplier risk profiling",
    body: "Five normalised criteria, TOPSIS ranking and SHAP explanations for every manufacturer.",
  },
  {
    title: "Crisis scenario simulation",
    body: "Stress-test sourcing against a Strait of Hormuz disruption or a cost-constrained budget in one click.",
  },
  {
    title: "Shortage and compliance monitoring",
    body: "Drug shortage signals, CGMP warning letters and contract clauses in a single view.",
  },
  {
    title: "Human-in-the-loop governance",
    body: "Every allocation is reviewed, approved or overridden by a person and recorded in the audit trail.",
  },
];

// Europe to East Asia, centred on the Gulf — the region this platform serves.
const VIEW: MapView = { lonMin: -24, latMax: 74, width: 176, height: 80 };
const DOTS = landDotsPath(VIEW);

/** Decorative backdrop: the land mask only, with the destination market marked. No data is plotted. */
function WorldBackdrop() {
  const uae = countryAnchor("United Arab Emirates")!;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 [mask-image:linear-gradient(to_top,black_45%,transparent_95%)]">
      <div className="relative w-full" style={{ aspectRatio: `${VIEW.width} / ${VIEW.height}` }}>
        <svg viewBox={`0 0 ${VIEW.width} ${VIEW.height}`} className="absolute inset-0 size-full">
          <path d={DOTS} fill="#aab9d7" opacity={0.24} />
        </svg>
        <span
          className="absolute"
          style={{ left: `${((uae.lon - VIEW.lonMin) / VIEW.width) * 100}%`, top: `${((VIEW.latMax - uae.lat) / VIEW.height) * 100}%` }}
        >
          <span className="animate-signal absolute -inset-1.5 rounded-full border border-cyan" />
          <span className="absolute block size-2 -translate-x-1/2 -translate-y-1/2 border-[1.5px] border-white bg-background" />
          <span className="absolute top-2.5 left-2.5 font-mono text-[9px] tracking-[0.16em] whitespace-nowrap text-white/80 uppercase">UAE</span>
        </span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    // The sign-in screen is always presented in the graphite theme.
    <div className="dark grid min-h-screen bg-background text-foreground lg:grid-cols-[1.15fr_1fr]">
      <section className="relative hidden flex-col justify-between gap-10 overflow-hidden border-r border-border bg-navy p-10 lg:flex xl:p-14">
        <WorldBackdrop />
        <Brand className="relative" />
        <div className="relative max-w-xl">
          <p className="eyebrow text-cyan">GCC healthcare procurement</p>
          <h2 className="display mt-4 text-[2.75rem] text-white xl:text-[3.25rem]">
            Resilient sourcing decisions for <em className="font-normal">critical medicines</em>.
          </h2>
          <p className="mt-5 max-w-lg text-[15px] leading-7 text-muted-foreground">
            Supplier selection, risk profiling and dual-source order allocation for group purchasing organisations — explainable, auditable
            and always subject to human approval.
          </p>
          <ol className="mt-9 grid gap-x-10 border-t border-white/15 sm:grid-cols-2">
            {capabilities.map(({ title, body }, i) => (
              <li key={title} className="flex gap-3.5 border-b border-white/10 py-4">
                <span className="tabular mt-0.5 text-[11px] text-cyan">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <p className="text-[13px] leading-5 font-medium text-white">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <p className="relative flex items-center gap-2 text-xs text-muted-foreground">
          <Lock aria-hidden className="size-3.5" strokeWidth={1.6} />
          University research prototype. Demonstration data only — not for clinical or procurement use.
        </p>
      </section>

      <section className="flex flex-col items-center justify-center px-5 py-10 sm:px-10">
        <div className="mb-10 lg:hidden">
          <Brand />
        </div>
        <LoginForm />
      </section>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useMemo, useState } from "react";
import { RISK_LABELS, ROLE_LABELS } from "@/lib/constants";
import { countryAnchor, HORMUZ } from "@/lib/geo/countries";
import { GRID_BOUNDS, landDotsPath } from "@/lib/geo/dots";
import { cn } from "@/lib/utils";
import { formatPct, formatRatio, formatScore } from "@/lib/utils/format";
import { categoryTone, toneColor } from "@/lib/utils/risk";
import type { AllocationRole, RiskCategory } from "@/types";

export interface SupplyMapPoint {
  id: string;
  name: string;
  country: string;
  rank: number;
  riskCategory: RiskCategory;
  topsis: number;
  overallRisk: number;
  /** C5 route exposure for the active scenario, 0–1, lower is better. */
  exposure: number;
  gulfAirShare: number;
  /** Share of monthly demand, when this manufacturer is in the allocation. */
  sharePct?: number;
  role?: AllocationRole;
  href: string;
}

interface SupplyMapProps {
  points: SupplyMapPoint[];
  destinationCountry?: string;
  /** What the link to the destination encodes: allocation share or route exposure. */
  arcs?: "allocation" | "exposure";
  /** Hormuz Crisis Mode: the corridor marker is raised to an alert. */
  stressed?: boolean;
  activeId?: string | null;
  onActiveChange?: (id: string | null) => void;
  className?: string;
}

const TARGET_ASPECT = 2.15;
const { lonMin: GRID_LON_MIN, lonMax: GRID_LON_MAX, latMin: GRID_LAT_MIN, latMax: GRID_LAT_MAX } = GRID_BOUNDS;

interface Placed extends SupplyMapPoint {
  lon: number;
  lat: number;
  domestic: boolean;
}

/** Positions each manufacturer on its country anchor, fanning out countries with several sites. */
function place(points: SupplyMapPoint[], destinationCountry: string): { placed: Placed[]; missing: string[] } {
  const byCountry = new Map<string, SupplyMapPoint[]>();
  points.forEach((point) => byCountry.set(point.country, [...(byCountry.get(point.country) ?? []), point]));
  const destination = countryAnchor(destinationCountry);
  const placed: Placed[] = [];
  const missing: string[] = [];

  byCountry.forEach((group, country) => {
    const anchor = countryAnchor(country);
    if (!anchor) {
      missing.push(country);
      return;
    }
    const domestic = !!destination && destination.lon === anchor.lon && destination.lat === anchor.lat;
    group.forEach((point, i) => {
      let { lon, lat } = anchor;
      if (domestic) {
        // A domestic site sits just beside the destination marker rather than on top of it.
        lon -= 7 + i * 3.5;
        lat -= 1;
      } else if (group.length > 1) {
        const angle = (2 * Math.PI * i) / group.length - Math.PI / 2;
        lon += Math.cos(angle) * 4.2;
        lat += Math.sin(angle) * 3.4;
      }
      placed.push({ ...point, lon, lat, domestic });
    });
  });
  return { placed, missing };
}

/**
 * Dot-matrix supply-network map. Manufacturers sit on their country of
 * manufacture and link to the destination market. The links are schematic —
 * they show which origins feed the allocation, not real shipping lanes.
 */
export function SupplyMap({
  points,
  destinationCountry = "United Arab Emirates",
  arcs = "allocation",
  stressed = false,
  activeId,
  onActiveChange,
  className,
}: SupplyMapProps) {
  const [localActive, setLocalActive] = useState<string | null>(null);
  const active = activeId !== undefined ? activeId : localActive;
  const setActive = (id: string | null) => {
    setLocalActive(id);
    onActiveChange?.(id);
  };

  const destination = countryAnchor(destinationCountry);
  const { placed, missing } = useMemo(() => place(points, destinationCountry), [points, destinationCountry]);

  // Frame the map on the network: bounding box of every site, padded, at a fixed aspect ratio.
  const view = useMemo(() => {
    const lons = [...placed.map((p) => p.lon), HORMUZ.lon, ...(destination ? [destination.lon] : [])];
    const lats = [...placed.map((p) => p.lat), HORMUZ.lat, ...(destination ? [destination.lat] : [])];
    let lonMin = Math.min(...lons) - 24;
    let lonMax = Math.max(...lons) + 24;
    let latMin = Math.min(...lats) - 16;
    let latMax = Math.max(...lats) + 18;
    const width = lonMax - lonMin;
    const height = latMax - latMin;
    if (width / height > TARGET_ASPECT) {
      const extra = width / TARGET_ASPECT - height;
      latMin -= extra * 0.55;
      latMax += extra * 0.45;
    } else {
      const extra = height * TARGET_ASPECT - width;
      lonMin -= extra / 2;
      lonMax += extra / 2;
    }
    lonMin = Math.max(GRID_LON_MIN, lonMin);
    lonMax = Math.min(GRID_LON_MAX, lonMax);
    latMin = Math.max(GRID_LAT_MIN, latMin);
    latMax = Math.min(GRID_LAT_MAX, latMax);
    return { lonMin, latMax, width: lonMax - lonMin, height: latMax - latMin };
  }, [placed, destination]);

  const x = (lon: number) => lon - view.lonMin;
  const y = (lat: number) => view.latMax - lat;

  // Every land cell in view, drawn as one path so the map is a single DOM node.
  const dots = useMemo(() => landDotsPath(view), [view]);

  const links = destination
    ? placed
        .map((point) => {
          const sx = x(point.lon);
          const sy = y(point.lat);
          const dx = x(destination.lon);
          const dy = y(destination.lat);
          const length = Math.hypot(dx - sx, dy - sy);
          // Lift the curve on the side of the chord that points north.
          let nx = -(dy - sy) / (length || 1);
          let ny = (dx - sx) / (length || 1);
          if (ny > 0) {
            nx = -nx;
            ny = -ny;
          }
          const lift = point.domestic ? 0 : length * 0.2;
          const path = `M${sx.toFixed(2)} ${sy.toFixed(2)}Q${((sx + dx) / 2 + nx * lift).toFixed(2)} ${((sy + dy) / 2 + ny * lift).toFixed(2)} ${dx.toFixed(2)} ${dy.toFixed(2)}`;
          const allocated = (point.sharePct ?? 0) > 0;
          const style =
            arcs === "exposure"
              ? {
                  stroke: `color-mix(in oklab, var(--heat) ${Math.round(18 + point.exposure * 82)}%, var(--faint))`,
                  width: 1.1 + point.exposure * 2.2,
                  dash: undefined,
                  opacity: 0.95,
                }
              : allocated
                ? { stroke: "var(--cyan)", width: 1.2 + ((point.sharePct ?? 0) / 100) * 4.2, dash: undefined, opacity: 0.95 }
                : { stroke: "var(--faint)", width: 0.9, dash: "2 4", opacity: 0.7 };
          return { id: point.id, path, allocated, ...style };
        })
        // Draw emphasised links last so they sit on top.
        .sort((a, b) => a.width - b.width)
    : [];

  const left = (lon: number) => `${(x(lon) / view.width) * 100}%`;
  const top = (lat: number) => `${(y(lat) / view.height) * 100}%`;
  const activePoint = placed.find((point) => point.id === active);

  return (
    <div className={className}>
      <div className="relative w-full overflow-x-clip" style={{ aspectRatio: `${view.width} / ${view.height}` }}>
        <svg viewBox={`0 0 ${view.width} ${view.height}`} className="absolute inset-0 size-full" aria-hidden>
          <path d={dots} fill="var(--foreground)" opacity={0.2} />
          {links.map((link, i) => (
            <motion.path
              key={link.id}
              d={link.path}
              fill="none"
              stroke={link.stroke}
              strokeDasharray={link.dash}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: link.dash ? 1 : 0, opacity: 0 }}
              animate={{
                pathLength: 1,
                opacity: active && active !== link.id ? 0.22 : link.opacity,
                strokeWidth: link.width + (active === link.id ? 1 : 0),
              }}
              transition={{ pathLength: { duration: 0.9, delay: 0.15 + i * 0.05, ease: "easeOut" }, opacity: { duration: 0.25 }, strokeWidth: { duration: 0.4 } }}
            />
          ))}
        </svg>

        {/* Corridor marker */}
        <div className="pointer-events-none absolute" style={{ left: left(HORMUZ.lon), top: top(HORMUZ.lat) }}>
          <span className="absolute -translate-x-1/2 -translate-y-1/2">
            {stressed ? <span aria-hidden className="animate-signal absolute -inset-1 rounded-full border border-status-critical" /> : null}
            <span
              aria-hidden
              className={cn("block size-1.5 rotate-45 border", stressed ? "border-status-critical bg-status-critical" : "border-muted-foreground bg-card")}
            />
          </span>
          <span aria-hidden className={cn("absolute bottom-1 left-0 h-6 w-px", stressed ? "bg-status-critical" : "bg-muted-foreground/60")} />
          <span
            className={cn(
              "absolute -top-10 left-1.5 font-mono text-[8.5px] tracking-[0.14em] whitespace-nowrap uppercase",
              stressed ? "font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            <span className="hidden sm:inline">Strait of </span>Hormuz{stressed ? " · stressed" : ""}
          </span>
        </div>

        {/* Destination market */}
        {destination ? (
          <div className="pointer-events-none absolute" style={{ left: left(destination.lon), top: top(destination.lat) }}>
            <span aria-hidden className="absolute block size-2.5 -translate-x-1/2 -translate-y-1/2 border-[1.5px] border-foreground bg-background" />
            <span className="absolute top-2.5 left-0 -translate-x-1/2 font-mono text-[8.5px] font-medium tracking-[0.14em] whitespace-nowrap text-foreground uppercase">
              UAE<span className="hidden sm:inline"> · destination</span>
            </span>
          </div>
        ) : null}

        {/* Manufacturer sites */}
        {placed.map((point) => {
          const color = toneColor[categoryTone[point.riskCategory]];
          const isActive = point.id === active;
          return (
            <Link
              key={point.id}
              href={point.href}
              aria-label={`${point.name}, ${point.country}. Rank ${point.rank}, ${RISK_LABELS[point.riskCategory]}. Open profile.`}
              onMouseEnter={() => setActive(point.id)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(point.id)}
              onBlur={() => setActive(null)}
              className={cn(
                "group absolute flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full outline-none",
                isActive ? "z-20" : "z-10",
              )}
              style={{ left: left(point.lon), top: top(point.lat) }}
            >
              <span
                aria-hidden
                className={cn(
                  "block size-2.5 rounded-full ring-2 ring-background transition-transform duration-200",
                  isActive ? "scale-150" : active ? "scale-90 opacity-50" : "",
                  "group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-ring",
                )}
                style={{ background: color }}
              />
              <span
                aria-hidden
                className={cn(
                  "tabular absolute -top-1.5 left-4 text-[9px] font-medium transition-opacity",
                  active && !isActive ? "opacity-30" : "text-foreground",
                )}
              >
                {String(point.rank).padStart(2, "0")}
              </span>
            </Link>
          );
        })}

        {/* Site readout */}
        {activePoint ? (
          <div
            role="status"
            className={cn(
              "pointer-events-none absolute z-30 w-56 rounded-[4px] border border-rule bg-popover p-3 text-xs shadow-xl shadow-black/25",
              x(activePoint.lon) / view.width > 0.62 ? "-translate-x-[calc(100%+14px)]" : "translate-x-3.5",
              y(activePoint.lat) / view.height > 0.55 ? "-translate-y-full" : "",
            )}
            style={{ left: left(activePoint.lon), top: top(activePoint.lat) }}
          >
            <p className="eyebrow">
              Rank {String(activePoint.rank).padStart(2, "0")} · {activePoint.country}
            </p>
            <p className="mt-1 text-[13px] leading-4.5 font-medium">{activePoint.name}</p>
            <dl className="mt-2.5 space-y-1 border-t border-border pt-2.5">
              {[
                ["TOPSIS · higher is better", formatScore(activePoint.topsis)],
                [`Overall risk · ${RISK_LABELS[activePoint.riskCategory].toLowerCase()}`, formatScore(activePoint.overallRisk)],
                ["C5 route exposure", formatScore(activePoint.exposure)],
                ["Gulf air share", formatRatio(activePoint.gulfAirShare)],
                [
                  "Allocation",
                  activePoint.sharePct && activePoint.role ? `${formatPct(activePoint.sharePct)} · ${ROLE_LABELS[activePoint.role]}` : "None",
                ],
              ].map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="tabular font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </div>

      {missing.length ? (
        <p className="mt-2 text-[11px] text-muted-foreground">Not shown on the map (no map anchor for the country): {missing.join(", ")}.</p>
      ) : null}
    </div>
  );
}

/** Key for the map's encodings. Text stays in ink; the marks carry colour. */
export function SupplyMapLegend({ arcs = "allocation", className }: { arcs?: "allocation" | "exposure"; className?: string }) {
  const categories: RiskCategory[] = ["low", "medium", "high"];
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-muted-foreground", className)}>
      {categories.map((category) => (
        <li key={category} className="flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-full" style={{ background: toneColor[categoryTone[category]] }} />
          {RISK_LABELS[category]}
        </li>
      ))}
      {arcs === "allocation" ? (
        <>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="h-[3px] w-5 rounded-full bg-cyan" />
            In allocation · width is share
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="w-5 border-t border-dashed border-faint" />
            Evaluated, not allocated
          </li>
        </>
      ) : (
        <li className="flex items-center gap-2">
          <span
            aria-hidden
            className="h-[3px] w-12 rounded-full"
            style={{ background: "linear-gradient(to right, color-mix(in oklab, var(--heat) 18%, var(--faint)), var(--heat))" }}
          />
          C5 route exposure · low to high
        </li>
      )}
    </ul>
  );
}

"use client";

import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpRight, ChevronsUpDown, PackageX } from "lucide-react";
import Link from "next/link";
import { HeatCell } from "@/components/charts/risk-matrix";
import { QualificationBadge, RiskBadge, ToneBadge } from "@/components/shared/badges";
import { InfoTip } from "@/components/shared/info-tip";
import { TopsisMeter } from "@/components/shared/meters";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CRITERIA } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { formatCurrency, formatScore } from "@/lib/utils/format";
import type { CriterionKey, Supplier } from "@/types";

// Module-scope so the table model stays stable between renders.
const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { basic: sortFn_basic, alphanumeric: sortFn_alphanumeric },
});
const helper = createColumnHelper<typeof features, Supplier>();

interface ColumnMeta {
  label: string;
  hint?: string;
  className?: string;
}

const metaByColumn: Record<string, ColumnMeta> = {
  rank: { label: "#", hint: "Position by TOPSIS score for the active scenario. 1 is best.", className: "w-12 pl-4" },
  manufacturer_name: { label: "Manufacturer", className: "min-w-60" },
  manufacturing_country: { label: "Country" },
  qualification_status: { label: "Qualification" },
  topsis_score: {
    label: "TOPSIS ↑",
    hint: "Closeness to the ideal supplier across all five weighted criteria. HIGHER is better. This is not a risk score.",
    className: "min-w-32",
  },
  overall_risk: { label: "Overall risk ↓", hint: "Composite risk for the active scenario, 0–1. LOWER is better.", className: "min-w-40" },
  landed_cost_per_unit: {
    label: "Landed cost",
    hint: `${CRITERIA.C1_landed_cost.description} Shown as cost per vial; the cell is the normalised C1 score.`,
    className: "min-w-32",
  },
  C2_delivery_risk: { label: "C2 Delivery", hint: `${CRITERIA.C2_delivery_risk.description} Lower is better.` },
  C3_price_integrity: { label: "C3 Price", hint: `${CRITERIA.C3_price_integrity.description} Lower is better.` },
  C4_compliance_risk: { label: "C4 Compl.", hint: `${CRITERIA.C4_compliance_risk.description} Lower is better.` },
  C5_route_exposure: { label: "C5 Route", hint: `${CRITERIA.C5_route_exposure.description} Lower is better.` },
};

const criterionColumn = (key: CriterionKey) =>
  helper.accessor(key, {
    sortFn: "basic",
    cell: (ctx) => <HeatCell value={ctx.getValue()} title={`${CRITERIA[key].label}: ${formatScore(ctx.getValue(), 3)} · lower is better`} />,
  });

const columns = helper.columns([
  helper.accessor("rank", {
    sortFn: "basic",
    cell: (ctx) => <span className="tabular text-xs text-muted-foreground">{String(ctx.getValue()).padStart(2, "0")}</span>,
  }),
  helper.accessor("manufacturer_name", {
    sortFn: "alphanumeric",
    cell: (ctx) => {
      const supplier = ctx.row.original;
      return (
        <div className="min-w-0">
          <p className="flex items-center gap-2">
            <span className="text-[13px] font-medium">{supplier.manufacturer_name}</span>
            {supplier.active_fda_shortage ? (
              <ToneBadge tone="critical" icon={PackageX} className="h-4.5 text-[9.5px]">
                Shortage
              </ToneBadge>
            ) : null}
            {supplier.is_probation && supplier.qualification_status !== "probation" ? (
              <ToneBadge tone="warning" className="h-4.5 text-[9.5px]">
                On probation
              </ToneBadge>
            ) : null}
          </p>
          <p className="flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
            <span className="tabular">{supplier.manufacturer_id}</span>
            <span aria-hidden>·</span>
            <span className="truncate" title={`FDA labeler: ${supplier.labeler_name_fda}`}>
              Labeler {supplier.labeler_name_fda}
            </span>
          </p>
        </div>
      );
    },
  }),
  helper.accessor("manufacturing_country", { sortFn: "alphanumeric", cell: (ctx) => <span className="text-xs whitespace-nowrap">{ctx.getValue()}</span> }),
  helper.accessor("qualification_status", { sortFn: "alphanumeric", cell: (ctx) => <QualificationBadge status={ctx.getValue()} /> }),
  helper.accessor("topsis_score", { sortFn: "basic", cell: (ctx) => <TopsisMeter value={ctx.getValue()} /> }),
  helper.accessor("overall_risk", {
    sortFn: "basic",
    cell: (ctx) => (
      <div className="flex items-center gap-2">
        <HeatCell value={ctx.getValue()} className="min-w-12 border border-foreground/15" />
        <RiskBadge category={ctx.row.original.risk_category} />
      </div>
    ),
  }),
  helper.accessor("landed_cost_per_unit", {
    sortFn: "basic",
    cell: (ctx) => (
      <div className="flex items-center gap-2">
        <HeatCell value={ctx.row.original.C1_landed_cost} title={`Normalised landed cost (C1): ${formatScore(ctx.row.original.C1_landed_cost, 3)} · lower is better`} />
        <span className="tabular text-xs">{formatCurrency(ctx.getValue(), ctx.row.original.currency, 2)}</span>
      </div>
    ),
  }),
  criterionColumn("C2_delivery_risk"),
  criterionColumn("C3_price_integrity"),
  criterionColumn("C4_compliance_risk"),
  criterionColumn("C5_route_exposure"),
]);

interface SupplierTableProps {
  suppliers: Supplier[];
  /** Opens the quick-look panel for a row. */
  onSelect: (supplier: Supplier) => void;
  selectedId?: string | null;
}

export function SupplierTable({ suppliers, onSelect, selectedId }: SupplierTableProps) {
  const table = useTable({
    features,
    columns,
    data: suppliers,
    initialState: { sorting: [{ id: "rank", desc: false }] },
  });

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id} className="hover:bg-transparent">
            {group.headers.map((header) => {
              const meta = metaByColumn[header.column.id];
              const sorted = header.column.getIsSorted();
              return (
                <TableHead
                  key={header.id}
                  aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none"}
                  className={cn("h-9 font-mono text-[10px] font-medium tracking-[0.1em] text-muted-foreground uppercase", meta?.className)}
                >
                  <span className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={header.column.getToggleSortingHandler()}
                      className={cn(
                        "-ml-1 flex items-center gap-1 rounded-sm px-1 py-0.5 uppercase outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                        sorted && "text-foreground",
                      )}
                    >
                      {meta?.label ?? header.column.id}
                      {sorted === "asc" ? (
                        <ArrowUp aria-hidden className="size-3 text-signal" />
                      ) : sorted === "desc" ? (
                        <ArrowDown aria-hidden className="size-3 text-signal" />
                      ) : (
                        <ChevronsUpDown aria-hidden className="size-3 opacity-40" />
                      )}
                    </button>
                    {meta?.hint ? <InfoTip label={`About ${meta.label}`}>{meta.hint}</InfoTip> : null}
                  </span>
                </TableHead>
              );
            })}
            <TableHead className="w-10 pr-4">
              <span className="sr-only">Open report</span>
            </TableHead>
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => {
          const supplier = row.original;
          return (
            <TableRow
              key={row.id}
              tabIndex={0}
              data-state={selectedId === supplier.manufacturer_id ? "selected" : undefined}
              onClick={() => onSelect(supplier)}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(supplier);
                }
              }}
              aria-label={`${supplier.manufacturer_name}: open quick look`}
              className={cn(
                "group cursor-pointer outline-none focus-visible:bg-accent data-[state=selected]:bg-accent",
                supplier.qualification_status === "disqualified" && "opacity-70",
              )}
            >
              {row.getAllCells().map((cell, i) => (
                <TableCell key={cell.id} className={cn("py-2 align-middle", i === 0 && "pl-4", cell.column.id.startsWith("C") && "px-0.5")}>
                  <table.FlexRender cell={cell} />
                </TableCell>
              ))}
              <TableCell className="py-2 pr-4 text-right">
                <Link
                  href={`/suppliers/${supplier.manufacturer_id}`}
                  onClick={(event) => event.stopPropagation()}
                  aria-label={`Open the full report for ${supplier.manufacturer_name}`}
                  title="Open full report"
                  className="inline-flex size-7 items-center justify-center rounded-[4px] border border-transparent text-muted-foreground opacity-50 outline-none transition-all group-hover:border-border group-hover:opacity-100 hover:bg-background hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ArrowUpRight aria-hidden className="size-3.5" />
                </Link>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

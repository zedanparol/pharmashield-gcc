"use client";

import { Activity, Factory, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useApi } from "@/hooks/use-api";
import { ALL_NAV_ITEMS } from "@/lib/navigation";
import { getShortages, getSuppliers } from "@/services/api";
import { useWorkspaceStore } from "@/stores/app-store";

/** Loads searchable records only once the palette is opened. */
function SearchResults({ onSelect }: { onSelect: (href: string) => void }) {
  const mode = useWorkspaceStore((state) => state.mode);
  const suppliers = useApi(`search-suppliers:${mode}`, () => getSuppliers(mode));
  const shortages = useApi("search-shortages", getShortages);

  return (
    <>
      <CommandGroup heading="Modules">
        {ALL_NAV_ITEMS.map((item) => (
          <CommandItem key={item.href} value={`${item.label} ${item.description}`} onSelect={() => onSelect(item.href)}>
            <item.icon aria-hidden />
            <span>{item.label}</span>
            <span className="ml-auto hidden truncate text-xs text-muted-foreground sm:inline">{item.description}</span>
          </CommandItem>
        ))}
      </CommandGroup>
      {suppliers.data?.length ? (
        <>
          <CommandSeparator />
          <CommandGroup heading="Manufacturers">
            {suppliers.data.map((supplier) => (
              <CommandItem
                key={supplier.manufacturer_id}
                value={`${supplier.manufacturer_name} ${supplier.manufacturing_country} ${supplier.manufacturer_id}`}
                onSelect={() => onSelect(`/suppliers/${supplier.manufacturer_id}`)}
              >
                <Factory aria-hidden />
                <span className="truncate">{supplier.manufacturer_name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{supplier.manufacturing_country}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </>
      ) : null}
      {shortages.data?.length ? (
        <>
          <CommandSeparator />
          <CommandGroup heading="Shortages">
            {shortages.data.slice(0, 12).map((shortage) => (
              <CommandItem
                key={shortage.shortage_id}
                value={`${shortage.drug_name} ${shortage.manufacturer_name} ${shortage.shortage_id}`}
                onSelect={() => onSelect(`/shortages?alert=${encodeURIComponent(shortage.shortage_id)}`)}
              >
                <Activity aria-hidden />
                <span className="truncate">{shortage.drug_name}</span>
                <span className="ml-auto truncate text-xs text-muted-foreground">{shortage.manufacturer_name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </>
      ) : null}
    </>
  );
}

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search modules, manufacturers and shortages"
        className="group mr-1 flex h-8 items-center gap-2.5 rounded-[4px] border border-border px-2.5 text-xs text-muted-foreground outline-none transition-colors hover:border-rule hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring md:w-64 xl:w-80"
      >
        <Search aria-hidden className="size-3.5 shrink-0" strokeWidth={1.6} />
        <span className="hidden flex-1 text-left md:inline">Search or jump to…</span>
        <kbd className="hidden rounded-[2px] border border-border px-1 py-px font-mono text-[9.5px] tracking-wider text-faint uppercase transition-colors group-hover:text-muted-foreground md:inline">
          Ctrl K
        </kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Search" description="Search modules, manufacturers and shortages">
        {/* cmdk items need a Command root; the dialog wrapper does not provide one. */}
        <Command>
          <CommandInput placeholder="Search modules, manufacturers, shortages…" />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            {open ? <SearchResults onSelect={go} /> : null}
          </CommandList>
          <p className="eyebrow flex items-center justify-between gap-3 border-t border-border px-3 py-2 text-[9.5px]">
            <span>↑↓ to move · Enter to open · Esc to close</span>
            <span className="text-faint">Ctrl K</span>
          </p>
        </Command>
      </CommandDialog>
    </>
  );
}

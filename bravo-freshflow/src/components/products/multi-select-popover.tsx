"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  value: string;
  label: string;
  hint?: string;
}

interface MultiSelectPopoverProps {
  label: string;
  options: MultiSelectOption[];
  values: string[];
  onChange: (next: string[]) => void;
  searchable?: boolean;
  className?: string;
}

export function MultiSelectPopover({
  label,
  options,
  values,
  onChange,
  searchable = true,
  className,
}: MultiSelectPopoverProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q)
    );
  }, [options, query]);

  const set = new Set(values);
  function toggle(v: string) {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    onChange(Array.from(next));
  }

  const summary = values.length === 0 ? "All" : values.length === 1 ? options.find((o) => o.value === values[0])?.label ?? "1 selected" : `${values.length} selected`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-8 justify-between gap-2 text-xs font-medium", className)}
        >
          <span className="truncate text-muted-foreground">{label}:</span>
          <span className="truncate">{summary}</span>
          <ChevronDown className="size-3 opacity-60" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        {searchable && options.length > 6 ? (
          <div className="mb-2 flex items-center gap-2 rounded-md border px-2">
            <Search className="size-3.5 text-muted-foreground" aria-hidden />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="h-7 border-0 px-0 text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
        ) : null}
        <div className="max-h-64 space-y-0.5 overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <div className="py-4 text-center text-xs text-muted-foreground">No results.</div>
          ) : (
            filtered.map((o) => {
              const checked = set.has(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => toggle(o.value)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-accent hover:text-accent-foreground",
                    checked && "bg-accent/50"
                  )}
                >
                  <div className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{o.label}</span>
                    {o.hint ? (
                      <span className="ml-1.5 text-muted-foreground">{o.hint}</span>
                    ) : null}
                  </div>
                  {checked ? <Check className="size-3.5" aria-hidden /> : null}
                </button>
              );
            })
          )}
        </div>
        <div className="mt-2 flex items-center justify-between border-t pt-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onChange([])}
            disabled={values.length === 0}
          >
            Clear
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => setOpen(false)}
          >
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

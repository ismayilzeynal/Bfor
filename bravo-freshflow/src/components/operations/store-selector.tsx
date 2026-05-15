"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Store as StoreIcon } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Store, User } from "@/types";

const ALL_VALUE = "__all__";

interface StoreSelectorProps {
  stores: Store[];
  currentUser: User;
  value: string | null;
  onChange: (storeId: string | null) => void;
}

export function StoreSelector({ stores, currentUser, value, onChange }: StoreSelectorProps) {
  const [open, setOpen] = useState(false);

  const locked = useMemo(() => {
    return (
      (currentUser.role === "store_manager" ||
        currentUser.role === "supervisor" ||
        currentUser.role === "employee") &&
      !!currentUser.store_id
    );
  }, [currentUser]);

  const lockedStore = locked
    ? stores.find((s) => s.id === currentUser.store_id) ?? null
    : null;

  const selected = locked ? lockedStore : stores.find((s) => s.id === value) ?? null;
  const label = locked
    ? lockedStore?.name ?? "Store"
    : selected?.name ?? "All stores";

  if (locked) {
    return (
      <Button variant="outline" size="sm" disabled className="h-9 min-w-[200px] justify-start">
        <StoreIcon className="mr-2 size-4" aria-hidden />
        <span className="truncate">{label}</span>
        <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
          Locked
        </span>
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          className="h-9 min-w-[220px] justify-between"
        >
          <span className="flex items-center gap-2 truncate">
            <StoreIcon className="size-4 text-muted-foreground" aria-hidden />
            <span className="truncate">{label}</span>
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="end">
        <Command>
          <CommandInput placeholder="Search store…" />
          <CommandList>
            <CommandEmpty>No stores found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value={ALL_VALUE}
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn("mr-2 size-4", value === null ? "opacity-100" : "opacity-0")}
                  aria-hidden
                />
                All stores
              </CommandItem>
              {stores.map((s) => (
                <CommandItem
                  key={s.id}
                  value={`${s.name} ${s.code}`}
                  onSelect={() => {
                    onChange(s.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 size-4",
                      value === s.id ? "opacity-100" : "opacity-0"
                    )}
                    aria-hidden
                  />
                  <div className="flex flex-col">
                    <span className="text-sm">{s.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {s.code} · {s.region}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { RiskyRow } from "@/components/products/types";

interface RejectSheetProps {
  row: RiskyRow | null;
  onCancel: () => void;
  onConfirm: (row: RiskyRow, reasonCodes: string[], note: string | null) => void;
}

const REASONS = [
  { code: "already_sold", label: "Already sold" },
  { code: "discount_too_aggressive", label: "Discount too aggressive" },
  { code: "transfer_not_feasible", label: "Transfer not feasible" },
  { code: "manual_management", label: "Will manage manually" },
  { code: "other", label: "Other" },
];

export function RejectSheet({ row, onCancel, onConfirm }: RejectSheetProps) {
  const [codes, setCodes] = useState<string[]>([]);
  const [note, setNote] = useState("");

  function toggle(code: string) {
    setCodes((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  }

  return (
    <Sheet open={row !== null} onOpenChange={(o) => !o && onCancel()}>
      <SheetContent side="right" className="flex w-full flex-col gap-4 sm:max-w-md">
        {row ? (
          <>
            <SheetHeader>
              <SheetTitle>Reject recommendation</SheetTitle>
              <SheetDescription>
                Tell us why so we can improve future recommendations.
              </SheetDescription>
            </SheetHeader>

            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <div className="font-medium">{row.product.name}</div>
              <div className="text-xs text-muted-foreground">
                <span className="font-mono">{row.store.code}</span>
                <span className="mx-1.5">·</span>
                {row.store.name}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-xs font-medium">Reason</p>
              <div className="space-y-1">
                {REASONS.map((r) => {
                  const checked = codes.includes(r.code);
                  return (
                    <button
                      key={r.code}
                      type="button"
                      onClick={() => toggle(r.code)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-xs",
                        checked
                          ? "border-primary/40 bg-primary/5 text-foreground"
                          : "hover:bg-muted/40"
                      )}
                    >
                      <span>{r.label}</span>
                      {checked ? <Check className="size-3.5 text-primary" aria-hidden /> : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium">Notes (optional)</p>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Add more context…"
                className="text-xs"
              />
            </div>

            <SheetFooter className="mt-auto">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                disabled={codes.length === 0}
                onClick={() => onConfirm(row, codes, note.trim() || null)}
              >
                Reject
              </Button>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

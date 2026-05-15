"use client";

import { CheckCircle2, PackageX, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  count: number;
  highCount: number;
  onResolve: () => void;
  onIgnore: () => void;
  onCreateStockChecks: () => void;
  onClear: () => void;
}

export function BulkActionsBar({
  count,
  highCount,
  onResolve,
  onIgnore,
  onCreateStockChecks,
  onClear,
}: Props) {
  if (count === 0) return null;
  return (
    <div className="sticky bottom-3 z-30 mx-auto flex w-fit max-w-full flex-wrap items-center gap-3 rounded-full border bg-card/95 px-4 py-2 shadow-lg backdrop-blur">
      <span className="text-sm font-medium">
        {count} selected
        {highCount > 0 ? (
          <span className="ml-1 text-rose-600">({highCount} high)</span>
        ) : null}
      </span>
      <span className="hidden h-4 w-px bg-border sm:inline-block" />
      <Button size="sm" variant="outline" onClick={onCreateStockChecks}>
        <PackageX className="mr-2 size-4" aria-hidden />
        Create stock checks
      </Button>
      <Button size="sm" onClick={onResolve}>
        <CheckCircle2 className="mr-2 size-4" aria-hidden />
        Resolve
      </Button>
      <Button size="sm" variant="ghost" onClick={onIgnore}>
        <XCircle className="mr-2 size-4" aria-hidden />
        Ignore
      </Button>
      <Button size="sm" variant="ghost" onClick={onClear}>
        <X className="size-4" aria-hidden />
      </Button>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  PackageX,
  Wrench,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  DATA_QUALITY_ISSUE_TYPE_LABELS,
  DATA_QUALITY_SEVERITY_LABELS,
  DATA_QUALITY_STATUS_LABELS,
} from "@/lib/constants";
import { formatDateTime, formatRelative } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useActionsStore } from "@/store/actions-store";
import { useAuthStore } from "@/store/auth-store";
import type { DataQualitySeverity, DataQualityStatus } from "@/types";
import { ISSUE_SUGGESTED_FIX, type IssueRow } from "./types";

const SEV_CLASSES: Record<DataQualitySeverity, string> = {
  low: "bg-slate-100 text-slate-700 border-slate-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  high: "bg-rose-100 text-rose-700 border-rose-200",
};

const STATUS_CLASSES: Record<DataQualityStatus, string> = {
  open: "bg-amber-100 text-amber-700",
  investigating: "bg-sky-100 text-sky-700",
  resolved: "bg-emerald-100 text-emerald-700",
  ignored: "bg-zinc-200 text-zinc-600",
};

interface Props {
  row: IssueRow | null;
  onOpenChange: (open: boolean) => void;
}

export function IssueDetailDrawer({ row, onOpenChange }: Props) {
  const setIssueStatus = useActionsStore((s) => s.setIssueStatus);
  const appendAudit = useActionsStore((s) => s.appendAudit);
  const currentUser = useAuthStore((s) => s.currentUser);

  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [note, setNote] = useState("");

  useEffect(() => {
    setChecked({});
    setNote("");
  }, [row?.issue.id]);

  if (!row) return null;
  const checklist = ISSUE_SUGGESTED_FIX[row.issue.issue_type];

  const audit = (action: string, oldVal: unknown, newVal: unknown) => {
    appendAudit({
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      user_id: currentUser?.id ?? "system",
      action,
      entity_type: "data_issue",
      entity_id: row.issue.id,
      old_value: oldVal,
      new_value: newVal,
      created_at: new Date().toISOString(),
      ip_address: "10.0.0.1",
    });
  };

  const handleResolve = () => {
    if (!note.trim()) {
      toast.error("Qeyd tələb olunur", {
        description: "Resolve etmək üçün qısa bir qeyd əlavə edin.",
      });
      return;
    }
    setIssueStatus(row.issue.id, "resolved", {
      note: note.trim(),
      userId: currentUser?.id,
    });
    audit("resolve_data_issue", { status: row.effectiveStatus }, { status: "resolved", note });
    toast.success("Issue resolved", { description: row.issue.id });
    onOpenChange(false);
  };

  const handleIgnore = () => {
    setIssueStatus(row.issue.id, "ignored", { userId: currentUser?.id });
    audit("ignore_data_issue", { status: row.effectiveStatus }, { status: "ignored" });
    toast.success("Issue ignored");
    onOpenChange(false);
  };

  const handleInvestigate = () => {
    setIssueStatus(row.issue.id, "investigating", { userId: currentUser?.id });
    audit(
      "investigate_data_issue",
      { status: row.effectiveStatus },
      { status: "investigating" }
    );
    toast.success("Marked as investigating");
  };

  const handleCreateStockCheckTask = () => {
    audit(
      "create_stock_check_task",
      null,
      { product_id: row.issue.product_id, store_id: row.issue.store_id }
    );
    toast.success("Stock check task yaradıldı", {
      description: row.product
        ? `${row.product.name} • ${row.store?.name ?? "—"}`
        : row.issue.id,
    });
  };

  return (
    <Sheet open={Boolean(row)} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn("uppercase", SEV_CLASSES[row.issue.severity])}
            >
              {DATA_QUALITY_SEVERITY_LABELS[row.issue.severity]}
            </Badge>
            <Badge variant="secondary" className={STATUS_CLASSES[row.effectiveStatus]}>
              {DATA_QUALITY_STATUS_LABELS[row.effectiveStatus]}
            </Badge>
            <span className="ml-auto text-xs text-muted-foreground">
              {formatRelative(row.issue.created_at)}
            </span>
          </div>
          <SheetTitle className="text-lg">
            {DATA_QUALITY_ISSUE_TYPE_LABELS[row.issue.issue_type]}
          </SheetTitle>
          <SheetDescription className="text-sm">{row.issue.description}</SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-5">
          <section className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Affected entities
            </p>
            <div className="grid grid-cols-2 gap-2">
              {row.product ? (
                <Link
                  href={`/products/${row.product.id}`}
                  className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-muted/50"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{row.product.name}</span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {row.product.sku}
                    </span>
                  </div>
                  <ExternalLink className="size-3.5 text-muted-foreground" aria-hidden />
                </Link>
              ) : (
                <div className="rounded-md border p-3 text-sm text-muted-foreground">
                  No product linked
                </div>
              )}
              {row.store ? (
                <Link
                  href={`/operations?store=${row.store.id}`}
                  className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-muted/50"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{row.store.name}</span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {row.store.code}
                    </span>
                  </div>
                  <ExternalLink className="size-3.5 text-muted-foreground" aria-hidden />
                </Link>
              ) : (
                <div className="rounded-md border p-3 text-sm text-muted-foreground">
                  No store linked
                </div>
              )}
            </div>
            {row.issue.batch_id ? (
              <p className="text-xs text-muted-foreground">
                Batch: <span className="font-mono">{row.issue.batch_id}</span>
              </p>
            ) : null}
          </section>

          <Separator />

          <section className="space-y-2">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <Wrench className="size-3.5" aria-hidden />
              Suggested fix
            </div>
            <ul className="space-y-1.5">
              {checklist.map((step, i) => (
                <li key={i} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1 size-3.5 rounded border-border"
                    checked={Boolean(checked[i])}
                    onChange={(e) =>
                      setChecked((prev) => ({ ...prev, [i]: e.target.checked }))
                    }
                    id={`fix-${i}`}
                  />
                  <label
                    htmlFor={`fix-${i}`}
                    className={cn(
                      "cursor-pointer text-sm leading-snug",
                      checked[i] && "text-muted-foreground line-through"
                    )}
                  >
                    {step}
                  </label>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleCreateStockCheckTask}
              disabled={!row.product || !row.store}
            >
              <PackageX className="mr-2 size-4" aria-hidden />
              Create stock check task
            </Button>
          </section>

          <Separator />

          <section className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Audit
            </p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>
                Created: <span className="font-mono">{formatDateTime(row.issue.created_at)}</span>
              </p>
              {row.effectiveResolvedAt ? (
                <p>
                  Resolved:{" "}
                  <span className="font-mono">{formatDateTime(row.effectiveResolvedAt)}</span>
                </p>
              ) : null}
              {row.override?.resolution_note ? (
                <p>
                  Note: <span className="italic">{row.override.resolution_note}</span>
                </p>
              ) : null}
            </div>
          </section>

          <Separator />

          {row.effectiveStatus !== "resolved" && row.effectiveStatus !== "ignored" ? (
            <section className="space-y-2">
              <Label htmlFor="resolve-note" className="text-xs uppercase tracking-wide">
                Resolution note (required)
              </Label>
              <Textarea
                id="resolve-note"
                placeholder="Hansı addımlar atıldı? Hansı sistemdə dəyişiklik edildi?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleResolve} className="flex-1">
                  <CheckCircle2 className="mr-2 size-4" aria-hidden />
                  Mark resolved
                </Button>
                <Button variant="outline" onClick={handleInvestigate} className="flex-1">
                  <ClipboardCheck className="mr-2 size-4" aria-hidden />
                  Investigating
                </Button>
                <Button variant="ghost" onClick={handleIgnore}>
                  <XCircle className="mr-2 size-4" aria-hidden />
                  Ignore
                </Button>
              </div>
            </section>
          ) : (
            <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
              Bu issue artıq{" "}
              <span className="font-medium">
                {DATA_QUALITY_STATUS_LABELS[row.effectiveStatus]}
              </span>{" "}
              statusundadır.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

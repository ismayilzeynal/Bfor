"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FlaskConical,
  XCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ActionBadge } from "@/components/badges/action-badge";
import { ConfidenceBadge } from "@/components/badges/confidence-badge";
import { PriorityBadge } from "@/components/badges/priority-badge";
import { StatusBadge } from "@/components/badges/status-badge";
import { formatAZN, formatRelative } from "@/lib/formatters";
import { ScenariosMiniBar } from "./scenarios-mini-bar";
import { OutcomeBlock } from "./outcome-block";
import {
  APPROVAL_ROLE_LABELS,
  deriveOutcome,
  type RecommendationRow,
} from "./types";

interface RecommendationCardProps {
  row: RecommendationRow;
  selected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onApprove: (row: RecommendationRow) => void;
  onReject: (row: RecommendationRow) => void;
}

export function RecommendationCard({
  row,
  selected,
  onSelect,
  onApprove,
  onReject,
}: RecommendationCardProps) {
  const router = useRouter();
  const [showAlts, setShowAlts] = useState(false);
  const rec = row.recommendation;
  const product = row.row.product;
  const store = row.row.store;
  const category = row.row.category;

  const status = row.effectiveStatus;
  const isDecided = status !== "pending_approval" && status !== "generated";
  const isApproved = status === "approved" || status === "converted_to_task";
  const isRejected = status === "rejected";
  const isCompleted = status === "completed";

  const netPositive = rec.net_saved_value >= 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md",
        selected && "ring-2 ring-primary/40",
        isApproved && "border-blue-200/70",
        isRejected && "opacity-70",
        isCompleted && "border-emerald-200/70"
      )}
    >
      {/* Row 1 — Identity */}
      <div className="flex items-start gap-3 border-b bg-muted/10 px-4 py-3">
        {!isDecided ? (
          <Checkbox
            checked={selected}
            onCheckedChange={(v) => onSelect(rec.id, v === true)}
            aria-label="Select recommendation"
            className="mt-1"
          />
        ) : (
          <div className="size-4" aria-hidden />
        )}
        <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-slate-200 to-slate-100 text-sm font-semibold text-slate-600">
          {product.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push(`/products/${product.id}`)}
              className="truncate text-left text-sm font-semibold hover:underline"
              title={product.name}
            >
              {product.name}
            </button>
            <span className="font-mono text-[10px] text-muted-foreground">{product.sku}</span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {category ? (
              <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[11px] font-medium">
                {category.name}
              </span>
            ) : null}
            <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[11px] font-medium">
              <span className="font-mono">{store.code}</span> · {store.name}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[11px] text-muted-foreground">{formatRelative(rec.created_at)}</span>
          <PriorityBadge priority={rec.priority} />
        </div>
      </div>

      {/* Row 2 — Recommendation */}
      <div className="space-y-1.5 px-4 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <ActionBadge type={rec.recommendation_type} />
          <StatusBadge kind="recommendation" status={status} />
        </div>
        <p className="text-sm font-medium leading-snug">{rec.recommendation_text}</p>
        <p className="text-xs italic leading-snug text-muted-foreground">{rec.reason_text}</p>
      </div>

      {/* Row 3 — Financial */}
      <div className="grid grid-cols-2 gap-2 px-4 pb-3 sm:grid-cols-5">
        <Metric label="Recovered" value={formatAZN(rec.expected_recovered_value, { compact: true })} />
        <Metric label="Cost" value={formatAZN(rec.expected_cost, { compact: true })} />
        <div
          className={cn(
            "rounded-md border-2 px-2.5 py-1.5 text-xs",
            netPositive
              ? "border-emerald-300/60 bg-emerald-50 text-emerald-800"
              : "border-rose-300/60 bg-rose-50 text-rose-800"
          )}
        >
          <div className="text-[10px] font-medium uppercase tracking-wide opacity-80">
            Net Saved
          </div>
          <div className="mt-0.5 text-base font-bold tabular-nums">
            {formatAZN(rec.net_saved_value, { sign: true })}
          </div>
        </div>
        <ConfidenceChip score={rec.confidence_score} />
        <ApproverChip role={rec.requires_approval_by_role} />
      </div>

      {/* Outcome block (completed only) */}
      {isCompleted ? (
        <div className="px-4 pb-3">
          <OutcomeBlock outcome={deriveOutcome(rec, row.decision)} />
        </div>
      ) : null}

      {/* Row 4 — Alternatives collapsible */}
      <div className="border-t bg-muted/10">
        <button
          type="button"
          onClick={() => setShowAlts((v) => !v)}
          className="flex w-full items-center gap-1.5 px-4 py-2 text-left text-xs font-medium text-muted-foreground hover:bg-muted/30"
          aria-expanded={showAlts}
        >
          {showAlts ? (
            <ChevronDown className="size-3.5" aria-hidden />
          ) : (
            <ChevronRight className="size-3.5" aria-hidden />
          )}
          Show {row.scenarios.length || 0} alternative scenario{row.scenarios.length === 1 ? "" : "s"}
        </button>
        {showAlts ? (
          <div className="space-y-2 px-4 pb-3">
            <ScenariosMiniBar scenarios={row.scenarios} />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-[11px]"
              onClick={() => router.push(`/products/${product.id}#whatif`)}
            >
              <FlaskConical className="size-3" aria-hidden />
              Open in What-If Lab
              <ExternalLink className="size-3" aria-hidden />
            </Button>
          </div>
        ) : null}
      </div>

      {/* Row 5 — Actions */}
      <div className="flex flex-wrap items-center gap-2 border-t bg-background px-4 py-2.5">
        {!isDecided ? (
          <>
            <Button size="sm" className="h-8 gap-1.5" onClick={() => onApprove(row)}>
              <CheckCircle2 className="size-3.5" aria-hidden />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5"
              onClick={() => onReject(row)}
            >
              <XCircle className="size-3.5" aria-hidden />
              Reject
            </Button>
          </>
        ) : (
          <DecidedBanner status={status} />
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => router.push(`/products/${product.id}`)}
        >
          View details
          <ChevronRight className="size-3.5" aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => router.push(`/products/${product.id}#whatif`)}
        >
          <FlaskConical className="size-3.5" aria-hidden />
          Open in What-If
        </Button>
      </div>
    </motion.div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background px-2.5 py-1.5">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function ConfidenceChip({ score }: { score: number }) {
  return (
    <div className="rounded-md border bg-background px-2.5 py-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Confidence
        </span>
        <ConfidenceBadge score={score} showIcon={false} />
      </div>
      <Progress value={Math.round(score)} className="mt-1.5 h-1" />
    </div>
  );
}

function ApproverChip({ role }: { role: string | null }) {
  return (
    <div className="rounded-md border bg-background px-2.5 py-1.5">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Approver
      </div>
      <div className="mt-0.5 truncate text-xs font-medium">
        {role ? APPROVAL_ROLE_LABELS[role] ?? role : "Auto-applied"}
      </div>
    </div>
  );
}

function DecidedBanner({ status }: { status: string }) {
  const isApproved = status === "approved" || status === "converted_to_task";
  const isRejected = status === "rejected";
  if (isApproved) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
        <CheckCircle2 className="size-3.5" aria-hidden />
        Approved — task created
      </div>
    );
  }
  if (isRejected) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
        <XCircle className="size-3.5" aria-hidden />
        Rejected
      </div>
    );
  }
  return null;
}

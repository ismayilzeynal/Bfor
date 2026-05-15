"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ActionBadge } from "@/components/badges/action-badge";
import { PriorityBadge } from "@/components/badges/priority-badge";
import { formatAZN, formatRelative } from "@/lib/formatters";
import { useActionsStore } from "@/store/actions-store";
import { LivePulse } from "@/components/operations/live-pulse";
import type { Product, Recommendation, Store, User } from "@/types";

interface ActionableNowCardProps {
  recommendations: Recommendation[];
  products: Product[];
  stores: Store[];
  currentUser: User;
}

export function ActionableNowCard({
  recommendations,
  products,
  stores,
  currentUser,
}: ActionableNowCardProps) {
  const router = useRouter();
  const decisions = useActionsStore((s) => s.decisions);
  const approve = useActionsStore((s) => s.approve);
  const appendAudit = useActionsStore((s) => s.appendAudit);
  const [target, setTarget] = useState<Recommendation | null>(null);

  const items = useMemo(() => {
    const decidedIds = new Set(decisions.map((d) => d.recommendation_id));
    return recommendations
      .filter(
        (r) =>
          (r.priority === "critical" || r.priority === "high") &&
          (r.status === "pending_approval" || r.status === "generated") &&
          !decidedIds.has(r.id)
      )
      .sort((a, b) => {
        const prio: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        const ap = prio[a.priority] ?? 9;
        const bp = prio[b.priority] ?? 9;
        if (ap !== bp) return ap - bp;
        return b.net_saved_value - a.net_saved_value;
      })
      .slice(0, 5);
  }, [recommendations, decisions]);

  function handleApprove() {
    if (!target) return;
    approve({
      recommendation_id: target.id,
      user_id: currentUser.id,
      note: null,
    });
    appendAudit({
      id: `aud-${Date.now()}`,
      user_id: currentUser.id,
      action: "approve_recommendation",
      entity_type: "recommendation",
      entity_id: target.id,
      old_value: { status: target.status },
      new_value: { status: "approved" },
      created_at: new Date().toISOString(),
      ip_address: "mock",
    });
    const product = products.find((p) => p.id === target.product_id);
    toast.success("Tövsiyə təsdiqləndi", {
      description: `${product?.name ?? target.product_id} üçün tapşırıqlar yaradıldı.`,
      action: { label: "View tasks", onClick: () => router.push("/tasks") },
    });
    setTarget(null);
  }

  const targetProduct = target ? products.find((p) => p.id === target.product_id) : null;
  const targetStore = target ? stores.find((s) => s.id === target.store_id) : null;

  return (
    <>
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" aria-hidden />
            Actionable Now
            <LivePulse />
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => router.push("/recommendations")}>
            View all
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.length === 0 ? (
            <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
              No high-priority recommendations waiting.
            </div>
          ) : (
            items.map((r) => {
              const product = products.find((p) => p.id === r.product_id);
              const store = stores.find((s) => s.id === r.store_id);
              return (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center gap-3 rounded-md border bg-background/50 p-2 hover:bg-muted/40"
                >
                  <PriorityBadge priority={r.priority} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {product?.name ?? r.product_id}
                    </div>
                    <div className="flex items-center gap-2 truncate text-xs text-muted-foreground">
                      <span>{store?.code ?? r.store_id}</span>
                      <span>·</span>
                      <span>{formatRelative(r.created_at)}</span>
                    </div>
                  </div>
                  <ActionBadge type={r.recommendation_type} />
                  <span className="whitespace-nowrap rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 tabular-nums">
                    {formatAZN(r.net_saved_value, { compact: true, sign: true })}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      className="h-7"
                      onClick={() => setTarget(r)}
                    >
                      <CheckCircle2 className="mr-1 size-3.5" aria-hidden />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7"
                      onClick={() => product && router.push(`/products/${product.id}`)}
                    >
                      View
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <AlertDialog open={target !== null} onOpenChange={(o) => !o && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve AI recommendation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create the related operational tasks and notify assignees.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {target ? (
            <div className="space-y-3 rounded-md border bg-muted/30 p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-medium">
                    {targetProduct?.name ?? target.product_id}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {targetStore?.name ?? target.store_id}
                  </div>
                </div>
                <ActionBadge type={target.recommendation_type} />
              </div>
              <p className="text-xs text-muted-foreground">{target.recommendation_text}</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <Metric label="Recovered" value={formatAZN(target.expected_recovered_value, { compact: true })} />
                <Metric label="Cost" value={formatAZN(target.expected_cost, { compact: true })} />
                <Metric
                  label="Net saved"
                  value={formatAZN(target.net_saved_value, { compact: true, sign: true })}
                  tone="text-emerald-700"
                />
              </div>
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove}>Approve</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-md border bg-background p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-0.5 font-semibold tabular-nums ${tone ?? ""}`}>{value}</div>
    </div>
  );
}

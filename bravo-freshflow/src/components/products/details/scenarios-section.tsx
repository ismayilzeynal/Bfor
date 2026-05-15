"use client";

import {
  Activity,
  Eye,
  FlaskConical,
  Layers,
  Lock,
  Percent,
  Sparkles,
  Truck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ActionBadge } from "@/components/badges/action-badge";
import { ConfidenceBadge } from "@/components/badges/confidence-badge";
import { SCENARIO_TYPE_LABELS } from "@/lib/constants";
import { formatAZN } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { RecommendationScenario, ScenarioType } from "@/types";

interface Props {
  scenarios: RecommendationScenario[];
}

const SCENARIO_ICON: Record<ScenarioType, typeof Activity> = {
  no_action: Activity,
  discount: Percent,
  transfer: Truck,
  bundle: Layers,
  shelf_visibility: Eye,
  combined: Sparkles,
};

const SCENARIO_DESC: Record<ScenarioType, string> = {
  no_action: "Heç bir aksiya — bazar dövriyyəsi ilə hərəkət.",
  discount: "Endirim tətbiq et və satış sürətini artır.",
  transfer: "Stoku daha tələbatlı filiala transfer et.",
  bundle: "Tamamlayıcı məhsulla paket aksiyası yarat.",
  shelf_visibility: "Rəf görünüşünü və yerləşməsini artır.",
  combined: "Bir neçə aksiyanı birləşdirərək maksimum xilas.",
};

export function ScenariosSection({ scenarios }: Props) {
  const ordered = [...scenarios].sort((a, b) =>
    a.scenario_type.localeCompare(b.scenario_type)
  );

  return (
    <section id="whatif" className="space-y-3 scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <FlaskConical className="size-4 text-muted-foreground" aria-hidden />
            What-If Scenarios
          </h2>
          <p className="text-xs text-muted-foreground">
            Pre-computed alternatives the AI compared before recommending.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-dashed bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground">
          <Lock className="size-3" aria-hidden />
          Interactive simulator unlocks in PHASE 7
        </div>
      </div>

      {ordered.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No scenarios computed.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {ordered.map((s) => {
            const Icon = SCENARIO_ICON[s.scenario_type];
            const netSaved = s.net_saved_value;
            return (
              <Card
                key={s.id}
                className={cn(
                  "relative overflow-hidden",
                  s.is_recommended &&
                    "border-primary/40 ring-2 ring-primary/20"
                )}
              >
                {s.is_recommended ? (
                  <div className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                    <Sparkles className="size-3" aria-hidden />
                    Recommended
                  </div>
                ) : null}
                <CardContent className="space-y-3 p-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-muted p-1.5">
                      <Icon className="size-3.5 text-foreground" aria-hidden />
                    </span>
                    <span className="text-sm font-semibold">
                      {SCENARIO_TYPE_LABELS[s.scenario_type]}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {SCENARIO_DESC[s.scenario_type]}
                  </p>

                  <div className="space-y-1 rounded-md border bg-background p-2 text-xs">
                    <KV label="Sold qty" value={s.expected_sold_quantity.toFixed(0)} />
                    <KV
                      label="Recovered"
                      value={formatAZN(s.expected_recovered_value, { compact: true })}
                    />
                    <KV
                      label="Costs"
                      value={formatAZN(
                        s.discount_cost + s.transfer_cost + s.operational_cost,
                        { compact: true }
                      )}
                    />
                  </div>

                  <div
                    className={cn(
                      "rounded-md border px-2 py-1.5 text-center",
                      netSaved >= 0
                        ? "border-emerald-500/40 bg-emerald-50/60 dark:bg-emerald-950/30"
                        : "border-rose-500/40 bg-rose-50/60 dark:bg-rose-950/30"
                    )}
                  >
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Net saved
                    </div>
                    <div
                      className={cn(
                        "text-lg font-semibold tabular-nums",
                        netSaved >= 0
                          ? "text-emerald-700 dark:text-emerald-300"
                          : "text-rose-700 dark:text-rose-300"
                      )}
                    >
                      {formatAZN(netSaved, { compact: true, sign: true })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <ConfidenceBadge score={s.confidence_score} />
                    {s.scenario_type !== "no_action" ? (
                      <ActionBadge
                        type={
                          s.scenario_type === "combined"
                            ? "discount"
                            : (s.scenario_type as Parameters<typeof ActionBadge>[0]["type"])
                        }
                        showIcon={false}
                      />
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

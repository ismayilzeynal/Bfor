"use client";

import { useMemo } from "react";
import { CalendarClock } from "lucide-react";
import { parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MOCK_DATE } from "@/lib/constants";
import { formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { RiskPrediction } from "@/types";

interface Props {
  prediction: RiskPrediction;
}

export function ExpiryTimelineCard({ prediction }: Props) {
  const today = parseISO(`${MOCK_DATE}T00:00:00.000Z`);
  const expiryDate = new Date(today);
  expiryDate.setDate(expiryDate.getDate() + prediction.days_to_expiry);

  const stock = prediction.current_stock;
  const expectedSold = Math.max(
    0,
    Math.min(stock, Math.round(prediction.avg_daily_sales_7d * prediction.days_to_expiry))
  );
  const atRisk = Math.max(0, stock - expectedSold);

  const expectedSelloutDays = useMemo(() => {
    if (prediction.avg_daily_sales_7d <= 0) return null;
    return Math.min(
      Math.ceil(stock / prediction.avg_daily_sales_7d),
      prediction.days_to_expiry + 14
    );
  }, [prediction, stock]);

  const selloutDate = expectedSelloutDays
    ? new Date(today.getTime() + expectedSelloutDays * 86400000)
    : null;

  const totalRange = Math.max(
    prediction.days_to_expiry + 2,
    expectedSelloutDays ?? 0
  );
  const todayPct = 0;
  const selloutPct = expectedSelloutDays
    ? (expectedSelloutDays / totalRange) * 100
    : null;
  const expiryPct = (prediction.days_to_expiry / totalRange) * 100;

  const expectedSoldPct = stock > 0 ? (expectedSold / stock) * 100 : 0;
  const atRiskPct = stock > 0 ? (atRisk / stock) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <CalendarClock className="size-4 text-muted-foreground" aria-hidden />
          Expiry Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <div className="relative h-3 w-full overflow-visible rounded-full">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-200 via-amber-200 to-rose-300 dark:from-emerald-900/40 dark:via-amber-900/40 dark:to-rose-900/40" />
            <Marker
              percent={todayPct}
              color="hsl(var(--foreground))"
              label="Today"
              dateLabel={formatDate(today, "dd MMM")}
            />
            {selloutPct !== null && selloutDate ? (
              <Marker
                percent={Math.min(selloutPct, 100)}
                color="hsl(217 91% 60%)"
                label="Sellout"
                dateLabel={formatDate(selloutDate, "dd MMM")}
              />
            ) : null}
            <Marker
              percent={Math.min(expiryPct, 100)}
              color="hsl(0 75% 55%)"
              label="Expiry"
              dateLabel={formatDate(expiryDate, "dd MMM")}
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Units before expiry
          </p>
          <div className="flex h-7 w-full overflow-hidden rounded-md border">
            <div
              className={cn(
                "flex items-center justify-center bg-emerald-100 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
              )}
              style={{ width: `${expectedSoldPct}%` }}
              title={`Expected to sell: ${expectedSold}`}
            >
              {expectedSoldPct > 12 ? `${expectedSold} sell` : null}
            </div>
            <div
              className={cn(
                "flex items-center justify-center bg-rose-100 text-[10px] font-medium text-rose-700 dark:bg-rose-900/40 dark:text-rose-200"
              )}
              style={{ width: `${atRiskPct}%` }}
              title={`At risk: ${atRisk}`}
            >
              {atRiskPct > 12 ? `${atRisk} at risk` : null}
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{stock} units total</span>
            <span>
              <span className="text-emerald-700 dark:text-emerald-300">{expectedSold} expected</span>{" "}
              ·{" "}
              <span className="text-rose-700 dark:text-rose-300">{atRisk} at risk</span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Marker({
  percent,
  color,
  label,
  dateLabel,
}: {
  percent: number;
  color: string;
  label: string;
  dateLabel: string;
}) {
  return (
    <div
      className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${percent}%` }}
    >
      <div
        className="size-3 rounded-full ring-2 ring-background"
        style={{ background: color }}
        aria-hidden
      />
      <div className="absolute left-1/2 top-5 -translate-x-1/2 whitespace-nowrap text-[10px] leading-tight">
        <div className="font-medium" style={{ color }}>
          {label}
        </div>
        <div className="text-muted-foreground">{dateLabel}</div>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO, startOfMonth } from "date-fns";
import { Download, Gift, Leaf, TreePine, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/formatters";
import {
  CO2_PER_KG_FOOD,
  KG_CO2_PER_TREE_YEAR,
  KG_PER_PARCEL,
  globalSnapshots,
  inRange,
  type ResolvedRange,
} from "@/lib/analytics-utils";
import type { AnalyticsData } from "./analytics-shell";
import { toast } from "sonner";

interface Props {
  data: AnalyticsData;
  range: ResolvedRange;
}

export function SustainabilityTab({ data, range }: Props) {
  const [esgOpen, setEsgOpen] = useState(false);

  const view = useMemo(() => {
    const periodSnaps = globalSnapshots(data.snapshots).filter((s) =>
      inRange(s.date, range.from, range.to)
    );

    const wasteKgInPeriod = periodSnaps.reduce((sum, s) => sum + s.waste_kg, 0);
    const savedRevenue = periodSnaps.reduce((sum, s) => sum + s.recovered_value, 0);
    const avgPricePerKg = wasteKgInPeriod > 0 ? savedRevenue / wasteKgInPeriod : 6;
    const kgSaved = savedRevenue / Math.max(1, avgPricePerKg);

    const co2 = kgSaved * CO2_PER_KG_FOOD;
    const trees = Math.round(co2 / KG_CO2_PER_TREE_YEAR);
    const parcels = Math.round(kgSaved / KG_PER_PARCEL);

    const byMonth = new Map<string, { month: string; kgSaved: number; co2: number }>();
    for (const s of periodSnaps) {
      const m = format(startOfMonth(parseISO(s.date)), "yyyy-MM");
      const e = byMonth.get(m) ?? { month: m, kgSaved: 0, co2: 0 };
      const monthKg = (s.recovered_value / Math.max(1, avgPricePerKg));
      e.kgSaved += monthKg;
      e.co2 += monthKg * CO2_PER_KG_FOOD;
      byMonth.set(m, e);
    }
    const monthly = Array.from(byMonth.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((r) => ({ ...r, label: format(parseISO(`${r.month}-01`), "MMM yy") }));

    return { kgSaved, co2, trees, parcels, monthly, savedRevenue };
  }, [data, range]);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Leaf className="size-5 text-emerald-600" aria-hidden />
            <CardTitle className="text-base">Avoided Waste</CardTitle>
            <Badge variant="outline" className="ml-auto text-[10px]">
              Period total
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-bold tabular-nums tracking-tight text-emerald-700">
                {formatNumber(view.kgSaved, 0)}
              </span>
              <span className="text-2xl text-muted-foreground">kg</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              equivalent to ~{formatNumber(view.kgSaved * 4, 0)} meals or {formatNumber(view.parcels)} 5-kg parcels
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-sky-500">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <TreePine className="size-5 text-sky-700" aria-hidden />
            <CardTitle className="text-base">Tree Equivalent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-semibold tabular-nums text-sky-700">
                {formatNumber(view.trees)}
              </span>
              <span className="text-sm text-muted-foreground">trees / year</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              based on {KG_CO2_PER_TREE_YEAR} kg CO₂ absorbed per tree annually
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SimpleStatCard
          icon={<Leaf className="size-5 text-emerald-600" aria-hidden />}
          label="CO₂ avoided"
          value={`≈ ${formatNumber(view.co2, 0)} kg`}
          hint="2.5 kg CO₂ per kg food"
          tone="emerald"
        />
        <SimpleStatCard
          icon={<Gift className="size-5 text-amber-600" aria-hidden />}
          label="Donation-ready parcels"
          value={formatNumber(view.parcels)}
          hint="5 kg per parcel · ready for charity partners"
          tone="amber"
        />
        <SimpleStatCard
          icon={<TreePine className="size-5 text-emerald-700" aria-hidden />}
          label="Forest equivalent"
          value={`${formatNumber(view.trees)} trees`}
          hint="annual CO₂ absorption"
          tone="emerald"
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Monthly Sustainability Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {view.monthly.length === 0 ? (
            <Empty h={280}>No monthly data.</Empty>
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={view.monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="kgG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(160 70% 42%)" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="hsl(160 70% 42%)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${v.toFixed(0)} kg`}
                    width={64}
                  />
                  <RTooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v) => [`${Number(v).toFixed(1)} kg`, "Saved"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="kgSaved"
                    name="kg saved"
                    fill="url(#kgG)"
                    stroke="hsl(160 70% 42%)"
                    strokeWidth={2.5}
                    isAnimationActive
                    animationDuration={700}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-emerald-500">
        <CardContent className="flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Leaf className="size-4 text-emerald-600" aria-hidden />
              Ready to share your ESG impact?
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Generate an annual sustainability report for investors, regulators and partners.
            </p>
          </div>
          <Button onClick={() => setEsgOpen(true)} size="lg">
            <Download className="mr-2 size-4" aria-hidden />
            Generate ESG report
          </Button>
        </CardContent>
      </Card>

      <Dialog open={esgOpen} onOpenChange={setEsgOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Leaf className="size-4 text-emerald-600" aria-hidden />
              ESG Report — Preview
            </DialogTitle>
          </DialogHeader>
          <EsgPdfMock view={view} />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEsgOpen(false)}>
              <X className="mr-2 size-4" aria-hidden />
              Close
            </Button>
            <Button
              onClick={() => {
                toast.success("ESG hesabatı yüklənir…", { description: "Mock PDF export" });
                setEsgOpen(false);
              }}
            >
              <Download className="mr-2 size-4" aria-hidden />
              Download PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SimpleStatCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  tone: "emerald" | "amber";
}) {
  const bg = tone === "emerald" ? "bg-emerald-50/40" : "bg-amber-50/40";
  return (
    <Card className={bg}>
      <CardContent className="space-y-1 p-4">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
        </div>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function EsgPdfMock({
  view,
}: {
  view: { kgSaved: number; co2: number; trees: number; parcels: number; savedRevenue: number };
}) {
  return (
    <div className="rounded-md border bg-card p-4">
      <svg viewBox="0 0 360 220" className="w-full">
        <rect x="0" y="0" width="360" height="220" fill="hsl(var(--background))" stroke="hsl(var(--border))" />
        <rect x="0" y="0" width="360" height="32" fill="hsl(160 70% 42%)" />
        <text x="14" y="20" fontSize="13" fontWeight="600" fill="white">
          Bravo FreshFlow — ESG Impact Report
        </text>
        <text x="14" y="56" fontSize="10" fill="hsl(var(--muted-foreground))">
          Period: {format(new Date(), "MMM yyyy")} · Generated automatically
        </text>
        <line x1="14" y1="68" x2="346" y2="68" stroke="hsl(var(--border))" />

        <text x="14" y="92" fontSize="11" fontWeight="600">
          Key Metrics
        </text>
        <text x="14" y="110" fontSize="10">
          • Food waste avoided: {formatNumber(view.kgSaved, 0)} kg
        </text>
        <text x="14" y="124" fontSize="10">
          • CO₂ emissions avoided: ≈ {formatNumber(view.co2, 0)} kg
        </text>
        <text x="14" y="138" fontSize="10">
          • Tree equivalent (annual): {formatNumber(view.trees)} trees
        </text>
        <text x="14" y="152" fontSize="10">
          • Donation-ready parcels: {formatNumber(view.parcels)}
        </text>
        <text x="14" y="166" fontSize="10">
          • Revenue preserved: ₼ {formatNumber(view.savedRevenue, 0)}
        </text>

        <rect x="14" y="180" width="332" height="26" rx="4" fill="hsl(160 70% 42% / 0.1)" stroke="hsl(160 70% 42% / 0.4)" />
        <text x="22" y="197" fontSize="9" fill="hsl(160 70% 25%)">
          Aligned with UN SDG 12 (Responsible Consumption) and SDG 13 (Climate Action).
        </text>
      </svg>
    </div>
  );
}

function Empty({ h, children }: { h: number; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height: h }}>
      {children}
    </div>
  );
}

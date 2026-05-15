"use client";

import { Download, Gift, Leaf } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/formatters";
import type { KpiSnapshot } from "@/types";

interface SustainabilityCardProps {
  snapshots: KpiSnapshot[];
}

const CO2_PER_KG_FOOD = 2.5;
const KG_PER_PARCEL = 5;

export function SustainabilityCard({ snapshots }: SustainabilityCardProps) {
  const wasteKg = snapshots
    .filter((s) => s.store_id === null && s.category_id === null)
    .reduce((sum, s) => sum + s.waste_kg, 0);
  const co2 = wasteKg * CO2_PER_KG_FOOD;
  const parcels = Math.round(wasteKg / KG_PER_PARCEL);

  return (
    <Card className="h-full border-l-4 border-l-emerald-500">
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <Leaf className="size-5 text-emerald-600" aria-hidden />
        <CardTitle className="text-base">Sustainability</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Avoided waste
          </div>
          <div className="text-3xl font-semibold tabular-nums">
            {formatNumber(wasteKg, 1)} <span className="text-base font-normal text-muted-foreground">kg</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border bg-emerald-50/40 p-2">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              CO₂ avoided
            </div>
            <div className="text-lg font-semibold tabular-nums">
              ≈ {formatNumber(co2)} kg
            </div>
          </div>
          <div className="rounded-md border bg-emerald-50/40 p-2">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
              <Gift className="size-3" aria-hidden />
              Parcels
            </div>
            <div className="text-lg font-semibold tabular-nums">
              {formatNumber(parcels)}
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => toast.success("ESG report yüklənir…", { description: "Mock export" })}
        >
          <Download className="mr-2 size-4" aria-hidden />
          Download ESG report
        </Button>
      </CardContent>
    </Card>
  );
}

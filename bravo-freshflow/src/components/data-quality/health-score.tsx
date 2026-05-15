"use client";

import { useMemo } from "react";
import {
  PolarAngleAxis,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";
import type { InventorySnapshot } from "@/types";

interface Props {
  snapshots: InventorySnapshot[];
}

export function HealthScore({ snapshots }: Props) {
  const score = useMemo(() => {
    if (!snapshots.length) return 0;
    const sum = snapshots.reduce((acc, s) => acc + (s.confidence_score ?? 0), 0);
    const avg = sum / snapshots.length;
    return Math.round(avg * 100);
  }, [snapshots]);

  const tone =
    score >= 85
      ? { fill: "#10b981", label: "Excellent", text: "text-emerald-600" }
      : score >= 70
      ? { fill: "#0ea5e9", label: "Healthy", text: "text-sky-600" }
      : score >= 55
      ? { fill: "#f59e0b", label: "Needs attention", text: "text-amber-600" }
      : { fill: "#f43f5e", label: "Critical", text: "text-rose-600" };

  const chartData = [{ name: "score", value: score, fill: tone.fill }];

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-center gap-6 p-5">
        <div className="relative h-[160px] w-[160px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="72%"
              outerRadius="100%"
              barSize={14}
              data={chartData}
              startAngle={90}
              endAngle={-270}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <PolarRadiusAxis tick={false} axisLine={false} />
              <RadialBar background={{ fill: "#f1f5f9" }} dataKey="value" cornerRadius={20} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-semibold tabular-nums tracking-tight ${tone.text}`}>
              {score}
            </span>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              / 100
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <ShieldCheck className={`size-4 ${tone.text}`} aria-hidden />
            Data Health Score
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">{tone.label}</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Mağaza inventar snapshot-larından ortalanmış data confidence göstəricisi. POS, ERP,
            və scanner məlumatlarının ümumi etibarlılığını əks etdirir.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

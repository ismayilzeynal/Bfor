import { cn } from "@/lib/utils";
import { RECOMMENDATION_TYPE_LABELS } from "@/lib/constants";
import type { RecommendationType } from "@/types";
import {
  Activity,
  AlertOctagon,
  Combine,
  Eye,
  Layers,
  Megaphone,
  Package,
  Percent,
  RefreshCw,
  RotateCcw,
  Truck,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

const ACTION_ICON: Record<RecommendationType, typeof Activity> = {
  no_action: Activity,
  monitor: Eye,
  stock_check: Package,
  shelf_visibility: Layers,
  discount: Percent,
  transfer: Truck,
  combined: Combine,
  bundle: Layers,
  reorder_reduce: TrendingDown,
  reorder_increase: TrendingUp,
  supplier_review: RefreshCw,
  return_to_supplier: RotateCcw,
  campaign_add: Megaphone,
};

const ACTION_TONE: Record<RecommendationType, string> = {
  no_action: "bg-slate-100 text-slate-700",
  monitor: "bg-slate-100 text-slate-700",
  stock_check: "bg-amber-100 text-amber-800",
  shelf_visibility: "bg-amber-100 text-amber-800",
  discount: "bg-rose-100 text-rose-700",
  transfer: "bg-blue-100 text-blue-700",
  combined: "bg-purple-100 text-purple-700",
  bundle: "bg-indigo-100 text-indigo-700",
  reorder_reduce: "bg-orange-100 text-orange-700",
  reorder_increase: "bg-emerald-100 text-emerald-700",
  supplier_review: "bg-violet-100 text-violet-700",
  return_to_supplier: "bg-zinc-100 text-zinc-700",
  campaign_add: "bg-fuchsia-100 text-fuchsia-700",
};

interface ActionBadgeProps {
  type: RecommendationType;
  className?: string;
  showIcon?: boolean;
}

export function ActionBadge({ type, className, showIcon = true }: ActionBadgeProps) {
  const Icon = ACTION_ICON[type] ?? AlertOctagon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        ACTION_TONE[type],
        className
      )}
    >
      {showIcon ? <Icon className="size-3" aria-hidden /> : null}
      {RECOMMENDATION_TYPE_LABELS[type]}
    </span>
  );
}

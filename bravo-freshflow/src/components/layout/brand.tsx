import Link from "next/link";
import { Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

interface BrandProps {
  variant?: "full" | "icon";
  href?: string;
  className?: string;
}

export function Brand({ variant = "full", href = "/", className }: BrandProps) {
  const inner = (
    <span className={cn("flex items-center gap-2", className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-600 text-white shadow-sm">
        <Leaf className="h-4 w-4" />
      </span>
      {variant === "full" ? (
        <span className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight">Bravo</span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">FreshFlow AI</span>
        </span>
      ) : null}
    </span>
  );
  return href ? (
    <Link href={href} className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700",
        className
      )}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-600" />
      </span>
      Demo
    </span>
  );
}

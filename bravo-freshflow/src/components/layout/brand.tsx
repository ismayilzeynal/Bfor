"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface BrandProps {
  variant?: "full" | "icon";
  href?: string;
  className?: string;
}

export function Brand({ variant = "full", href = "/", className }: BrandProps) {
  const inner = (
    <span className={cn("flex items-center gap-2", className)}>
      <Image
        src="/bfor-logo.svg"
        alt="Bfor logo"
        width={variant === "full" ? 96 : 36}
        height={variant === "full" ? 36 : 36}
        priority
        className={cn(
          "transition-transform group-hover:scale-105",
          variant === "full" ? "h-9 w-auto" : "h-9 w-9"
        )}
      />
      {variant === "full" ? (
        <span className="sr-only">Bfor</span>
      ) : null}
    </span>
  );

  if (!href) {
    return <span className="group relative">{inner}</span>;
  }

  return (
    <Link
      href={href}
      className="group relative rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="Bfor home"
    >
      {inner}
    </Link>
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

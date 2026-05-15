"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

interface BrandProps {
  variant?: "full" | "icon";
  href?: string;
  className?: string;
}

interface ConfettiPiece {
  id: number;
  left: number;
  delay: number;
  color: string;
  rotate: number;
}

const COLORS = ["#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#a855f7", "#14b8a6", "#fb923c"];

export function Brand({ variant = "full", href = "/", className }: BrandProps) {
  const clickTimes = useRef<number[]>([]);
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  const onTap = (e: React.MouseEvent) => {
    const now = Date.now();
    clickTimes.current = [...clickTimes.current, now].filter((t) => now - t < 1500);
    if (clickTimes.current.length >= 5) {
      clickTimes.current = [];
      e.preventDefault();
      const next: ConfettiPiece[] = Array.from({ length: 36 }).map((_, i) => ({
        id: now + i,
        left: 4 + Math.random() * 92,
        delay: Math.random() * 0.35,
        color: COLORS[i % COLORS.length],
        rotate: Math.random() * 360,
      }));
      setPieces(next);
      window.setTimeout(() => setPieces([]), 1800);
    }
  };

  const inner = (
    <span className={cn("flex items-center gap-2", className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-600 text-white shadow-sm transition-transform group-hover:scale-105">
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

  return (
    <>
      {href ? (
        <Link
          href={href}
          onClick={onTap}
          className="group relative rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Bravo FreshFlow AI home"
        >
          {inner}
        </Link>
      ) : (
        <span onClick={onTap} className="group relative">
          {inner}
        </span>
      )}
      {pieces.length > 0 ? (
        <div className="pointer-events-none fixed inset-0 z-[80]" aria-hidden>
          {pieces.map((p) => (
            <span
              key={p.id}
              className="absolute top-0 block h-2.5 w-2.5 rounded-sm"
              style={{
                left: `${p.left}%`,
                backgroundColor: p.color,
                transform: `rotate(${p.rotate}deg)`,
                animation: `bravo-confetti-fall 1.6s cubic-bezier(0.22, 1, 0.36, 1) ${p.delay}s forwards`,
              }}
            />
          ))}
        </div>
      ) : null}
    </>
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

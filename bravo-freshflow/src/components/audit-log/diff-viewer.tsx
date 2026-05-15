"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

type DiffStatus = "unchanged" | "added" | "removed" | "changed";

interface DiffLine {
  key: string;
  oldValue: string | null;
  newValue: string | null;
  status: DiffStatus;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function asLines(value: unknown): Map<string, string> {
  const out = new Map<string, string>();
  if (value === null || value === undefined) return out;
  if (isObject(value)) {
    for (const [k, v] of Object.entries(value)) {
      out.set(k, JSON.stringify(v));
    }
    return out;
  }
  out.set("value", JSON.stringify(value));
  return out;
}

export function flattenDiff(oldValue: unknown, newValue: unknown): DiffLine[] {
  const oldMap = asLines(oldValue);
  const newMap = asLines(newValue);
  const keys = new Set<string>([...Array.from(oldMap.keys()), ...Array.from(newMap.keys())]);
  const rows: DiffLine[] = [];
  Array.from(keys)
    .sort()
    .forEach((k) => {
      const o = oldMap.has(k) ? (oldMap.get(k) ?? null) : null;
      const n = newMap.has(k) ? (newMap.get(k) ?? null) : null;
      let status: DiffStatus = "unchanged";
      if (oldMap.has(k) && !newMap.has(k)) status = "removed";
      else if (!oldMap.has(k) && newMap.has(k)) status = "added";
      else if (o !== n) status = "changed";
      rows.push({ key: k, oldValue: o, newValue: n, status });
    });
  return rows;
}

interface DiffViewerProps {
  oldValue: unknown;
  newValue: unknown;
}

const STATUS_CLASS: Record<DiffStatus, { row: string; tag: string; label: string }> = {
  unchanged: { row: "", tag: "bg-slate-100 text-slate-600", label: "—" },
  added: { row: "bg-emerald-50/70 dark:bg-emerald-950/30", tag: "bg-emerald-100 text-emerald-700", label: "+" },
  removed: { row: "bg-rose-50/70 dark:bg-rose-950/30", tag: "bg-rose-100 text-rose-700", label: "−" },
  changed: { row: "bg-amber-50/70 dark:bg-amber-950/30", tag: "bg-amber-100 text-amber-700", label: "~" },
};

export function DiffViewer({ oldValue, newValue }: DiffViewerProps) {
  const rows = useMemo(() => flattenDiff(oldValue, newValue), [oldValue, newValue]);

  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed bg-muted/30 p-4 text-center text-xs text-muted-foreground">
        No changes recorded.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <div className="rounded-md bg-rose-100/60 px-2 py-1 text-rose-700">old_value</div>
        <div className="rounded-md bg-emerald-100/60 px-2 py-1 text-emerald-700">new_value</div>
      </div>
      <div className="overflow-hidden rounded-md border">
        <table className="w-full font-mono text-[11px]">
          <tbody className="divide-y">
            {rows.map((r) => {
              const meta = STATUS_CLASS[r.status];
              return (
                <tr key={r.key} className={cn("align-top", meta.row)}>
                  <td className="w-8 px-2 py-1.5 text-center">
                    <span
                      className={cn(
                        "inline-flex h-4 w-4 items-center justify-center rounded text-[10px] font-bold",
                        meta.tag
                      )}
                    >
                      {meta.label}
                    </span>
                  </td>
                  <td className="w-1/4 px-2 py-1.5 font-semibold text-foreground">{r.key}</td>
                  <td className="w-[37%] whitespace-pre-wrap break-all px-2 py-1.5 text-rose-700/90">
                    {r.oldValue ?? <span className="text-muted-foreground italic">∅</span>}
                  </td>
                  <td className="w-[37%] whitespace-pre-wrap break-all px-2 py-1.5 text-emerald-700/90">
                    {r.newValue ?? <span className="text-muted-foreground italic">∅</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-2 gap-3 text-[10px]">
        <pre className="overflow-auto rounded-md border bg-rose-50/40 p-2 text-rose-900/80 dark:bg-rose-950/20 dark:text-rose-200/80">
          {oldValue === null || oldValue === undefined ? "null" : JSON.stringify(oldValue, null, 2)}
        </pre>
        <pre className="overflow-auto rounded-md border bg-emerald-50/40 p-2 text-emerald-900/80 dark:bg-emerald-950/20 dark:text-emerald-200/80">
          {newValue === null || newValue === undefined ? "null" : JSON.stringify(newValue, null, 2)}
        </pre>
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { RotateCcw, AlertTriangle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof console !== "undefined") {
      console.error("[bravo] route error:", error);
    }
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-5 rounded-xl border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            We hit an unexpected error rendering this section. Local state is preserved — you can safely retry.
          </p>
          {error.digest ? (
            <p className="font-mono text-[10px] text-muted-foreground">ref: {error.digest}</p>
          ) : null}
        </div>
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="outline" onClick={() => (window.location.href = "/")}>
            <Home className="mr-1.5 h-3.5 w-3.5" /> Home
          </Button>
          <Button size="sm" onClick={() => reset()}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Try again
          </Button>
        </div>
      </div>
    </div>
  );
}

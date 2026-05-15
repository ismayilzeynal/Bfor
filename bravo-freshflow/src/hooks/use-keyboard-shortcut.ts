"use client";

import { useEffect } from "react";

export interface ShortcutOptions {
  key: string;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  enabled?: boolean;
  preventDefault?: boolean;
}

export function useKeyboardShortcut(opts: ShortcutOptions, handler: (e: KeyboardEvent) => void) {
  useEffect(() => {
    if (opts.enabled === false) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (opts.meta && !(e.metaKey || e.ctrlKey)) return;
      if (!opts.meta && (e.metaKey || e.ctrlKey)) return;
      if (opts.shift !== undefined && opts.shift !== e.shiftKey) return;
      if (opts.alt !== undefined && opts.alt !== e.altKey) return;
      if (e.key.toLowerCase() !== opts.key.toLowerCase()) return;
      if (opts.preventDefault !== false) e.preventDefault();
      handler(e);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [opts.key, opts.meta, opts.shift, opts.alt, opts.enabled, opts.preventDefault, handler]);
}

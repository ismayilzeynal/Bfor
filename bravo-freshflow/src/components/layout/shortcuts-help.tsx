"use client";

import { Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUiStore } from "@/store/ui-store";
import { usePlatformKeys } from "@/hooks/use-platform";

interface ShortcutEntry {
  keys: string[];
  label: string;
}

interface ShortcutSection {
  title: string;
  entries: ShortcutEntry[];
}

function buildSections(mod: string, shift: string): ShortcutSection[] {
  return [
    {
      title: "Navigation",
      entries: [
        { keys: ["G", "D"], label: "Go to Executive dashboard" },
        { keys: ["G", "P"], label: "Go to Risky Products" },
        { keys: ["G", "T"], label: "Go to Tasks" },
        { keys: ["G", "R"], label: "Go to Recommendations" },
      ],
    },
    {
      title: "Global",
      entries: [
        { keys: [mod, "K"], label: "Command palette / search" },
        { keys: [mod, shift, "R"], label: "Open role switcher" },
        { keys: ["N"], label: "New task (manager only)" },
        { keys: ["?"], label: "Show this cheat sheet" },
        { keys: ["Esc"], label: "Close any modal or drawer" },
      ],
    },
  ];
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium uppercase tracking-wide text-muted-foreground shadow-[inset_0_-1px_0_rgba(0,0,0,0.05)]">
      {children}
    </kbd>
  );
}

export function ShortcutsHelp() {
  const open = useUiStore((s) => s.shortcutsOpen);
  const setOpen = useUiStore((s) => s.setShortcutsOpen);
  const { mod, shift } = usePlatformKeys();
  const sections = buildSections(mod, shift);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="hidden h-9 w-9 md:inline-flex"
        aria-label="Keyboard shortcuts"
        onClick={() => setOpen(true)}
      >
        <Keyboard className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-4 w-4 text-muted-foreground" />
              Keyboard shortcuts
            </DialogTitle>
            <DialogDescription>
              Press <Kbd>?</Kbd> anywhere to open this list.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            {sections.map((section) => (
              <div key={section.title} className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {section.title}
                </h4>
                <ul className="space-y-1.5">
                  {section.entries.map((entry) => (
                    <li
                      key={entry.label}
                      className="flex items-center justify-between rounded-md border bg-card px-3 py-1.5"
                    >
                      <span className="text-sm">{entry.label}</span>
                      <span className="flex items-center gap-1">
                        {entry.keys.map((k, i) => (
                          <Kbd key={`${entry.label}-${i}`}>{k}</Kbd>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
              Tip: <Kbd>G</Kbd> then a destination key — works while not typing in an input.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

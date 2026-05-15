import Link from "next/link";
import { Compass, Home, ListChecks, PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";

const SUGGESTIONS = [
  { href: "/executive", label: "Executive dashboard", icon: Home },
  { href: "/products", label: "Risky Products", icon: PackageSearch },
  { href: "/recommendations", label: "AI Recommendations", icon: ListChecks },
];

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-5 rounded-xl border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <Compass className="h-6 w-6" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold">Page not found</h1>
          <p className="text-sm text-muted-foreground">
            We couldn't locate that route. Pick a starting point below or jump to the executive dashboard.
          </p>
        </div>
        <ul className="space-y-1.5 text-left">
          {SUGGESTIONS.map((s) => (
            <li key={s.href}>
              <Link
                href={s.href}
                className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm hover:bg-muted"
              >
                <span className="flex items-center gap-2">
                  <s.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  {s.label}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">{s.href}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="pt-1">
          <Button asChild size="sm" className="w-full">
            <Link href="/executive">
              <Home className="mr-1.5 h-3.5 w-3.5" /> Back to dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

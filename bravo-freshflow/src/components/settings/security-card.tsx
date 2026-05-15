"use client";

import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Smartphone, Monitor, LogOut } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Session {
  id: string;
  device: string;
  os: string;
  location: string;
  ip: string;
  lastActive: string;
  isCurrent: boolean;
  Icon: typeof Monitor;
}

const INITIAL_SESSIONS: Session[] = [
  {
    id: "s-1",
    device: "MacBook Pro",
    os: "macOS 15 · Chrome 132",
    location: "Bakı, AZ",
    ip: "10.0.128.31",
    lastActive: "Active now",
    isCurrent: true,
    Icon: Monitor,
  },
  {
    id: "s-2",
    device: "iPhone 15",
    os: "iOS 18 · Safari",
    location: "Bakı, AZ",
    ip: "10.0.42.118",
    lastActive: "2 hours ago",
    isCurrent: false,
    Icon: Smartphone,
  },
  {
    id: "s-3",
    device: "Windows Desktop",
    os: "Windows 11 · Edge 132",
    location: "Sumqayıt, AZ",
    ip: "10.0.92.7",
    lastActive: "Yesterday",
    isCurrent: false,
    Icon: Monitor,
  },
];

export function SecurityCard() {
  const [sessions, setSessions] = useState<Session[]>(INITIAL_SESSIONS);

  const revoke = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    toast.success("Session revoked (mock)");
  };

  return (
    <Card id="security">
      <CardHeader>
        <CardTitle>Security</CardTitle>
        <CardDescription>Account credentials and active sessions across devices.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-md border bg-card p-3">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">Change password</div>
              <p className="text-[11px] text-muted-foreground">Disabled in demo mode — production version uses SSO.</p>
            </div>
          </div>
          <Button variant="outline" size="sm" disabled>
            Change…
          </Button>
        </div>
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active sessions</div>
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex items-start gap-3 rounded-md border bg-card p-3"
              >
                <span className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                  s.isCurrent ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                )}>
                  <s.Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{s.device}</span>
                    {s.isCurrent ? (
                      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                        This device
                      </Badge>
                    ) : null}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{s.os}</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">
                    {s.location} · <span className="font-mono">{s.ip}</span> · {s.lastActive}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  onClick={() => revoke(s.id)}
                  disabled={s.isCurrent}
                >
                  <LogOut className="mr-1 h-3 w-3" /> Revoke
                </Button>
              </li>
            ))}
          </ul>
          {sessions.length === 0 ? (
            <p className="rounded-md border border-dashed bg-muted/40 py-4 text-center text-xs text-muted-foreground">
              All sessions revoked.
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

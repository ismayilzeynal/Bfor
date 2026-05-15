"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NOTIFICATION_TYPE_LABELS } from "@/lib/constants";
import type { NotificationType } from "@/types";
import { useUiStore } from "@/store/ui-store";
import { NotificationIcon } from "@/components/notifications/notification-icon";

const TYPES: NotificationType[] = [
  "critical_risk",
  "approval_needed",
  "task_assigned",
  "task_deadline_approaching",
  "task_expired",
  "transfer_pending",
  "stock_mismatch",
  "low_data_confidence",
  "supplier_issue",
  "result_ready",
];

export function NotificationPrefsCard() {
  const prefs = useUiStore((s) => s.notificationPreferences);
  const setNotifPref = useUiStore((s) => s.setNotifPref);
  const quietHours = useUiStore((s) => s.quietHours);
  const setQuietHours = useUiStore((s) => s.setQuietHours);

  return (
    <Card id="notification-preferences" className="scroll-mt-24">
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>Choose how each notification type reaches you.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="w-[88px] px-3 py-2 text-center">In-app</th>
                <th className="w-[88px] px-3 py-2 text-center">Push</th>
                <th className="w-[88px] px-3 py-2 text-center">Email</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {TYPES.map((t) => {
                const p = prefs[t] ?? { email: true, push: true, in_app: true };
                return (
                  <tr key={t} className="hover:bg-accent/30">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <NotificationIcon type={t} className="h-6 w-6" />
                        <span className="font-medium">{NOTIFICATION_TYPE_LABELS[t]}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Switch
                        checked={p.in_app}
                        onCheckedChange={(v) => setNotifPref(t, "in_app", v)}
                        aria-label={`${t} in-app`}
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Switch
                        checked={p.push}
                        onCheckedChange={(v) => setNotifPref(t, "push", v)}
                        aria-label={`${t} push`}
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Switch
                        checked={p.email}
                        onCheckedChange={(v) => setNotifPref(t, "email", v)}
                        aria-label={`${t} email`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="rounded-md border bg-card p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Quiet hours</div>
              <div className="text-[11px] text-muted-foreground">
                Suppress push notifications between these hours. In-app alerts still appear.
              </div>
            </div>
            <Switch
              checked={quietHours.enabled}
              onCheckedChange={(v) => setQuietHours({ enabled: v })}
              aria-label="Quiet hours"
            />
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="quiet-start" className="text-xs">Start</Label>
              <Input
                id="quiet-start"
                type="time"
                value={quietHours.start}
                onChange={(e) => setQuietHours({ start: e.target.value })}
                disabled={!quietHours.enabled}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="quiet-end" className="text-xs">End</Label>
              <Input
                id="quiet-end"
                type="time"
                value={quietHours.end}
                onChange={(e) => setQuietHours({ end: e.target.value })}
                disabled={!quietHours.enabled}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

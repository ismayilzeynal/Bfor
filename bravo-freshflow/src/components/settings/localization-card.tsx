"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useUiStore, type DateFormat } from "@/store/ui-store";

const DATE_FORMATS: { value: DateFormat; label: string; preview: string }[] = [
  { value: "dd MMM yyyy", label: "dd MMM yyyy", preview: "15 May 2026" },
  { value: "yyyy-MM-dd", label: "yyyy-MM-dd", preview: "2026-05-15" },
  { value: "dd/MM/yyyy", label: "dd/MM/yyyy", preview: "15/05/2026" },
];

export function LocalizationCard() {
  const language = useUiStore((s) => s.language);
  const setLanguage = useUiStore((s) => s.setLanguage);
  const dateFormat = useUiStore((s) => s.dateFormat);
  const setDateFormat = useUiStore((s) => s.setDateFormat);

  return (
    <Card id="localization">
      <CardHeader>
        <CardTitle>Localization</CardTitle>
        <CardDescription>Language, currency, and date format used across the app.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Language</Label>
            <Select value={language} onValueChange={(v) => setLanguage(v as "en" | "az")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English (default)</SelectItem>
                <SelectItem value="az" disabled>
                  Azərbaycan <Badge variant="secondary" className="ml-2 h-4 px-1 text-[9px]">Coming soon</Badge>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Currency</Label>
            <Input value="AZN (₼)" disabled className="bg-muted/60" />
            <p className="text-[10px] text-muted-foreground">Locked. The platform reports all values in Azerbaijani manat.</p>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Date format</Label>
          <Select value={dateFormat} onValueChange={(v) => setDateFormat(v as DateFormat)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_FORMATS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  <span className="font-mono">{f.label}</span>
                  <span className="ml-2 text-muted-foreground">→ {f.preview}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

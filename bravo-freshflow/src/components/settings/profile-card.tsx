"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Save, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROLE_LABELS } from "@/lib/constants";
import { loadStores } from "@/lib/mock-loader";
import { useAuthStore } from "@/store/auth-store";
import { useCurrentUser } from "@/hooks/use-role";
import type { Store } from "@/types";

export function ProfileCard() {
  const user = useCurrentUser();
  const updateUser = useAuthStore((s) => s.updateUser);
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [name, setName] = useState(user.full_name);
  const [email, setEmail] = useState(user.email);
  const [storeId, setStoreId] = useState<string | null>(user.store_id);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatar_url);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadStores().then(setStores);
  }, []);

  useEffect(() => {
    setName(user.full_name);
    setEmail(user.email);
    setStoreId(user.store_id);
    setAvatarUrl(user.avatar_url);
  }, [user.id, user.full_name, user.email, user.store_id, user.avatar_url]);

  const dirty =
    name !== user.full_name ||
    email !== user.email ||
    storeId !== user.store_id ||
    avatarUrl !== user.avatar_url;

  const handleSave = () => {
    if (!dirty) return;
    setSaving(true);
    setTimeout(() => {
      updateUser(user.id, {
        full_name: name.trim(),
        email: email.trim(),
        store_id: storeId,
        avatar_url: avatarUrl,
      });
      setSaving(false);
      toast.success("Profile updated");
    }, 350);
  };

  const handleNewAvatar = () => {
    const seed = `${user.id}-${Date.now().toString(36)}`;
    const url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
    setAvatarUrl(url);
    toast.message("New avatar generated — Save to apply");
  };

  return (
    <Card id="profile">
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>How your name, email, and avatar appear in audits and approvals.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
            <AvatarFallback className="text-base">{name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1.5">
            <Button variant="outline" size="sm" onClick={handleNewAvatar}>
              <Camera className="mr-1.5 h-3.5 w-3.5" /> Generate new avatar
            </Button>
            <span className="text-[10px] text-muted-foreground">DiceBear mock — change is local only.</span>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="full-name" className="text-xs">Full name</Label>
            <Input id="full-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email" className="text-xs">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Role</Label>
            <Input value={ROLE_LABELS[user.role]} disabled className="bg-muted/60" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Store</Label>
            <Select
              value={storeId ?? "__none__"}
              onValueChange={(v) => setStoreId(v === "__none__" ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pick a store" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No store · network role</SelectItem>
                {stores.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} <span className="text-muted-foreground">— {s.code}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setName(user.full_name);
              setEmail(user.email);
              setStoreId(user.store_id);
              setAvatarUrl(user.avatar_url);
            }}
            disabled={!dirty || saving}
          >
            Discard
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!dirty || saving}>
            {saving ? (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-3.5 w-3.5" />
            )}
            Save
          </Button>
        </div>
        {dirty ? (
          <p className="text-[10px] text-muted-foreground">
            Tip: after saving, the role switcher in the topbar reflects the new name and avatar. Use it to keep navigating without losing your edits — {""}
            <button onClick={() => router.refresh()} className="text-primary hover:underline">
              refresh
            </button>{" "}
            if anything looks stale.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

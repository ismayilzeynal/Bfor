"use client";

import { useState } from "react";
import { PackageCheck } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useActionsStore } from "@/store/actions-store";
import { useAuthStore } from "@/store/auth-store";

interface Props {
  storesCount: number;
}

export function NetworkStockCheckDialog({ storesCount }: Props) {
  const [open, setOpen] = useState(false);
  const appendAudit = useActionsStore((s) => s.appendAudit);
  const currentUser = useAuthStore((s) => s.currentUser);

  const handleConfirm = () => {
    const taskCount = storesCount;
    appendAudit({
      id: `aud-${Date.now()}`,
      user_id: currentUser?.id ?? "system",
      action: "network_wide_stock_check",
      entity_type: "data_issue",
      entity_id: "network",
      old_value: null,
      new_value: { tasks_created: taskCount },
      created_at: new Date().toISOString(),
      ip_address: "10.0.0.1",
    });
    toast.success(`${taskCount} stock-check tapşırığı yaradıldı`, {
      description: "Mağaza menecerlərinə paylandı",
    });
    setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PackageCheck className="mr-2 size-4" aria-hidden />
          Run network-wide stock check
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Network-wide stock check</AlertDialogTitle>
          <AlertDialogDescription>
            Bütün aktiv mağazalarda fiziki sayım tapşırığı yaradılacaq.{" "}
            <span className="font-medium">{storesCount}</span> mağaza üçün ayrıca tapşırıq
            yaradılacaq. Bu əməliyyatın geri dönüşü yoxdur.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

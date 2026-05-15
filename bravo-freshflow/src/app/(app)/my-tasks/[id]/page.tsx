"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, CheckCircle2, Image as ImageIcon, Loader2, Package } from "lucide-react";
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { PriorityBadge } from "@/components/badges/priority-badge";
import { StatusBadge } from "@/components/badges/status-badge";
import { cn } from "@/lib/utils";
import { TASK_TYPE_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/formatters";
import { useAuthStore } from "@/store/auth-store";
import { useActionsStore } from "@/store/actions-store";
import { useTasksData } from "@/components/tasks/use-tasks-data";
import { deriveLocation, type TaskRow } from "@/components/tasks/types";
import type { TaskType } from "@/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

const CHECKLISTS: Record<TaskType, string[]> = {
  apply_discount: [
    "Mövcud qiyməti yoxla",
    "Endirim faizini tətbiq et",
    "Yeni etiketi çap et",
    "Etiketi rəfdə yerləşdir",
  ],
  prepare_transfer: [
    "Məhsulu yığ və say",
    "Daşıma qutusuna yerləşdir",
    "Transfer sənədini imzala",
    "Daşıma planını təsdiqlə",
  ],
  stock_check: [
    "Rəfdəki sayı yoxla",
    "Sistemlə tutuşdur",
    "Fərqi qeydə al",
    "Düzəliş tələbi göndər",
  ],
  shelf_action: [
    "Məhsulu gözə dəyən rəfə keçir",
    "Etiket və qiyməti yenilə",
    "POS-da sistemə qeyd düş",
  ],
  create_bundle: [
    "Komplementar məhsulu seç",
    "Birlikdə qablaşdır",
    "Yeni qiymət etiketi yarat",
    "Aksiyanı rəfdə qur",
  ],
  record_waste: [
    "Məhsulu rəfdən çıxar",
    "İtkinin səbəbini seç",
    "Sistemə qeydə al",
    "Lazımi imzanı topla",
  ],
  supplier_followup: [
    "Təchizatçıya zəng et",
    "Problemi izah et",
    "Razılaşmanı təsdiqlə",
    "Qaytarma planını sənədləşdir",
  ],
};

export default function MyTaskDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.currentUser);
  const updateTaskStatus = useActionsStore((s) => s.updateTaskStatus);
  const appendAudit = useActionsStore((s) => s.appendAudit);

  const { rows, loading, now } = useTasksData();
  const row: TaskRow | undefined = useMemo(() => rows.find((r) => r.task.id === id), [rows, id]);

  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [note, setNote] = useState("");
  const [proofUploaded, setProofUploaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const checklist = row ? CHECKLISTS[row.task.task_type] ?? [] : [];

  useEffect(() => {
    setChecked(new Set());
    setNote("");
    setProofUploaded(false);
    setUploading(false);
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-md space-y-3 pb-20">
        <Skeleton className="h-64" />
        <Skeleton className="h-40" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  if (!row) {
    return (
      <div className="mx-auto w-full max-w-md space-y-4 py-10 text-center">
        <Package className="mx-auto size-10 text-muted-foreground" />
        <h2 className="text-base font-semibold">Tapşırıq tapılmadı</h2>
        <p className="text-xs text-muted-foreground">
          Bu tapşırıq artıq mövcud olmaya bilər.
        </p>
        <Button asChild size="sm">
          <Link href="/my-tasks">My Tasks</Link>
        </Button>
      </div>
    );
  }

  const { task, product, store } = row;
  const location = product ? deriveLocation(product.id, task.store_id) : null;
  const isClosed =
    task.status === "completed" || task.status === "cancelled" || task.status === "expired";

  function toggle(index: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function audit(action: string, oldVal: unknown, newVal: unknown) {
    appendAudit({
      id: `aud-task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      user_id: currentUser.id,
      action,
      entity_type: "task",
      entity_id: id,
      old_value: oldVal,
      new_value: newVal,
      created_at: new Date().toISOString(),
      ip_address: "0.0.0.0",
    });
  }

  function handleProofUpload() {
    setUploading(true);
    window.setTimeout(() => {
      setUploading(false);
      setProofUploaded(true);
      toast.success("Foto əlavə edildi (demo)");
    }, 900);
  }

  function handleComplete() {
    if (!row) return;
    const completion = note.trim() || null;
    const proofUrl = proofUploaded ? `mock://proof/${id}.jpg` : null;
    updateTaskStatus(id, "completed", { note: completion, proofUrl, userId: currentUser.id });
    audit(
      "task_completed",
      { status: task.status },
      {
        status: "completed",
        completion_note: completion,
        proof_image_url: proofUrl,
        checklist_done: Array.from(checked),
      }
    );
    toast.success("Tapşırıq tamamlandı 🎉", { description: task.title });
    router.push("/my-tasks");
  }

  return (
    <div className="mx-auto w-full max-w-md pb-24">
      <button
        type="button"
        className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        onClick={() => router.back()}
      >
        <ArrowLeft className="size-3.5" /> Geri
      </button>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex aspect-[5/3] w-full items-center justify-center bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-600">
          <Package className="size-20" />
        </div>
        <div className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <PriorityBadge priority={task.priority} />
            <StatusBadge kind="task" status={task.status} />
          </div>
          <h1 className="text-lg font-bold leading-tight">{task.title}</h1>
          {product ? (
            <Link
              href={`/products/${product.id}`}
              className="block text-sm font-medium hover:underline"
            >
              {product.name}
            </Link>
          ) : null}
          <p className="text-xs text-muted-foreground">{task.description}</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Stat label="Type" value={TASK_TYPE_LABELS[task.task_type]} />
            <Stat label="Deadline" value={formatDateTime(task.deadline)} />
            <Stat label="Store" value={store ? `${store.code}` : "—"} />
            <Stat label="Yer" value={location ?? "—"} />
          </div>
        </div>
      </div>

      {checklist.length > 0 ? (
        <section className="mt-4 rounded-2xl border bg-card shadow-sm">
          <div className="border-b px-4 py-3 text-sm font-semibold">Mərhələlər</div>
          <ul className="space-y-2 px-4 py-3">
            {checklist.map((label, idx) => {
              const isChecked = checked.has(idx);
              return (
                <li
                  key={idx}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border bg-background p-3",
                    isChecked && "bg-emerald-50/50"
                  )}
                >
                  <Checkbox
                    id={`step-${idx}`}
                    checked={isChecked}
                    onCheckedChange={() => toggle(idx)}
                    disabled={isClosed}
                    className="mt-0.5"
                  />
                  <label
                    htmlFor={`step-${idx}`}
                    className={cn(
                      "text-sm leading-snug",
                      isChecked && "text-muted-foreground line-through"
                    )}
                  >
                    {label}
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {!isClosed ? (
        <section className="mt-4 space-y-3 rounded-2xl border bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold">Foto və qeyd əlavə et</h3>
          <Button
            type="button"
            variant="outline"
            onClick={handleProofUpload}
            disabled={uploading || proofUploaded}
            className="h-12 w-full gap-2 text-sm"
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : proofUploaded ? (
              <ImageIcon className="size-4 text-emerald-600" />
            ) : (
              <Camera className="size-4" />
            )}
            {proofUploaded ? "Foto əlavə edildi" : uploading ? "Yüklənir…" : "Foto çək"}
          </Button>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Qeyd əlavə et (opsional)…"
            rows={3}
            className="text-sm"
          />
        </section>
      ) : null}

      {task.completion_note ? (
        <section className="mt-4 rounded-2xl border bg-emerald-50/40 p-4 text-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Tamamlanma qeydi
          </div>
          <p className="mt-1">{task.completion_note}</p>
        </section>
      ) : null}

      {!isClosed ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 py-3 backdrop-blur md:absolute md:bottom-4 md:left-1/2 md:w-full md:max-w-md md:-translate-x-1/2 md:rounded-2xl md:border md:shadow-lg">
          <Button
            size="lg"
            className="h-12 w-full gap-2 text-base font-semibold"
            onClick={() => setConfirmOpen(true)}
          >
            <CheckCircle2 className="size-5" /> Tapşırığı tamamla
          </Button>
        </div>
      ) : null}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tapşırığı tamamla?</AlertDialogTitle>
            <AlertDialogDescription>
              Tapşırıq tamamlanmış kimi qeydiyyata düşəcək və supervisor məlumatlandırılacaq.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleComplete}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate text-xs font-medium">{value}</div>
    </div>
  );
}

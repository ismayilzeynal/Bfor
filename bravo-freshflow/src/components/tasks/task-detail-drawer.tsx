"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Camera,
  CheckCircle2,
  Clock3,
  Image as ImageIcon,
  Loader2,
  MapPin,
  MessageSquare,
  Package,
  PauseCircle,
  Send,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PriorityBadge } from "@/components/badges/priority-badge";
import { StatusBadge } from "@/components/badges/status-badge";
import { cn } from "@/lib/utils";
import { TASK_TYPE_LABELS } from "@/lib/constants";
import { formatDateTime, formatRelative } from "@/lib/formatters";
import { useActionsStore, type TaskComment } from "@/store/actions-store";
import { useAuthStore } from "@/store/auth-store";
import type { TaskStatus } from "@/types";
import { deriveLocation, type TaskRow } from "./types";

interface Props {
  row: TaskRow | null;
  onClose: () => void;
}

interface SeedComment {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
}

function buildSeedComments(taskId: string, createdAt: string): SeedComment[] {
  const seed = taskId.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  if (seed % 3 === 0) {
    return [
      {
        id: `${taskId}-c1`,
        user_id: "u-007",
        body: "Etiketləri çap məsuluna göndərdim.",
        created_at: createdAt,
      },
    ];
  }
  if (seed % 3 === 1) {
    return [
      {
        id: `${taskId}-c1`,
        user_id: "u-005",
        body: "Müştəri rəyi: aksiyada olduğunu görmədi. Görünməni artırmaq lazımdır.",
        created_at: createdAt,
      },
      {
        id: `${taskId}-c2`,
        user_id: "u-002",
        body: "Razıyıq, rəfin gözə dəyən hissəsinə keçirin.",
        created_at: createdAt,
      },
    ];
  }
  return [];
}

export function TaskDetailDrawer({ row, onClose }: Props) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const allUsers = useAuthStore((s) => s.allUsers);
  const updateTaskStatus = useActionsStore((s) => s.updateTaskStatus);
  const appendAudit = useActionsStore((s) => s.appendAudit);
  const addComment = useActionsStore((s) => s.addTaskComment);
  const storedComments = useActionsStore((s) => s.taskComments);

  const [draft, setDraft] = useState("");
  const [completionNote, setCompletionNote] = useState("");
  const [proofUploaded, setProofUploaded] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setDraft("");
    setCompletionNote("");
    setProofUploaded(false);
    setUploading(false);
  }, [row?.task.id]);

  const seedComments = useMemo(() => {
    if (!row) return [];
    return buildSeedComments(row.task.id, row.task.created_at);
  }, [row]);

  const liveComments = row ? storedComments[row.task.id] ?? [] : [];
  const merged: (SeedComment | TaskComment)[] = useMemo(() => {
    const list = [...seedComments, ...liveComments];
    return list.sort((a, b) => a.created_at.localeCompare(b.created_at));
  }, [seedComments, liveComments]);

  if (!row) return null;
  const { task, product, store, assignee, recommendation } = row;
  const location = product ? deriveLocation(product.id, task.store_id) : null;

  function changeStatus(next: TaskStatus, extras?: { note?: string | null; proofUrl?: string | null }) {
    if (!row) return;
    updateTaskStatus(row.task.id, next, {
      ...extras,
      userId: currentUser.id,
    });
    appendAudit({
      id: `aud-task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      user_id: currentUser.id,
      action: `task_${next}`,
      entity_type: "task",
      entity_id: row.task.id,
      old_value: { status: row.task.status },
      new_value: {
        status: next,
        ...(extras?.note !== undefined ? { completion_note: extras.note } : {}),
        ...(extras?.proofUrl !== undefined ? { proof_image_url: extras.proofUrl } : {}),
      },
      created_at: new Date().toISOString(),
      ip_address: "0.0.0.0",
    });
  }

  function handleStart() {
    changeStatus("in_progress");
    toast.success("Tapşırıq icraya götürüldü", {
      description: task.title,
    });
  }

  function handleComplete() {
    const note = completionNote.trim() || null;
    const proofUrl = proofUploaded ? `mock://proof/${row?.task.id}.jpg` : null;
    changeStatus("completed", { note, proofUrl });
    toast.success("Tapşırıq tamamlandı", {
      description: task.title,
    });
    onClose();
  }

  function handleSendComment() {
    if (!row || !draft.trim()) return;
    addComment({
      task_id: row.task.id,
      user_id: currentUser.id,
      body: draft.trim(),
    });
    setDraft("");
  }

  function handleProofUpload() {
    setUploading(true);
    window.setTimeout(() => {
      setUploading(false);
      setProofUploaded(true);
      toast.success("Foto əlavə edildi (demo)");
    }, 900);
  }

  const STATUS_ORDER: TaskStatus[] = ["pending", "assigned", "in_progress", "completed"];
  const statusIndex = (() => {
    const i = STATUS_ORDER.indexOf(task.status);
    if (i >= 0) return i;
    if (task.status === "expired" || task.status === "cancelled" || task.status === "rejected") {
      return STATUS_ORDER.length;
    }
    return 0;
  })();

  const isClosed =
    task.status === "completed" || task.status === "cancelled" || task.status === "expired";

  return (
    <Sheet open={row !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="space-y-1 border-b px-6 py-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <SheetTitle className="line-clamp-2 text-base">{task.title}</SheetTitle>
              <SheetDescription className="line-clamp-2 text-xs">
                {task.description}
              </SheetDescription>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <StatusBadge kind="task" status={task.status} />
              <PriorityBadge priority={task.priority} />
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-5 px-6 py-5 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <Info label="Type" value={TASK_TYPE_LABELS[task.task_type]} icon={<Sparkles className="size-3" />} />
              <Info label="Deadline" value={formatDateTime(task.deadline)} icon={<Clock3 className="size-3" />} />
              <Info label="Store" value={store ? `${store.code} · ${store.name}` : "—"} icon={<MapPin className="size-3" />} />
              <Info
                label="Assignee"
                value={assignee?.full_name ?? "—"}
                icon={
                  assignee ? (
                    <Avatar className="size-4">
                      <AvatarImage src={assignee.avatar_url ?? undefined} alt="" />
                      <AvatarFallback className="text-[8px]">
                        {assignee.full_name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                  ) : null
                }
              />
            </div>

            {product ? (
              <div className="rounded-md border bg-muted/30 p-3">
                <div className="flex items-start gap-3">
                  <div className="size-12 rounded-md bg-gradient-to-br from-emerald-100 to-emerald-50">
                    <div className="flex h-full items-center justify-center text-emerald-600">
                      <Package className="size-5" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/products/${product.id}`}
                      className="block truncate text-sm font-semibold hover:underline"
                    >
                      {product.name}
                    </Link>
                    <p className="font-mono text-[11px] text-muted-foreground">{product.sku}</p>
                    {location ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">{location}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {recommendation ? (
              <div className="rounded-md border border-dashed bg-background p-3">
                <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                  Source recommendation
                </div>
                <Link
                  href={`/products/${recommendation.product_id}`}
                  className="text-xs font-medium hover:underline"
                >
                  {recommendation.id} · {recommendation.recommendation_type}
                </Link>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {recommendation.recommendation_text}
                </p>
              </div>
            ) : null}

            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Status timeline
              </h4>
              <ol className="space-y-2">
                {STATUS_ORDER.map((s, idx) => {
                  const reached = idx <= statusIndex && !isClosed
                    ? true
                    : idx <= statusIndex;
                  return (
                    <li key={s} className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex size-5 items-center justify-center rounded-full border text-[10px]",
                          reached
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted bg-background text-muted-foreground"
                        )}
                      >
                        {idx + 1}
                      </span>
                      <div className="text-xs">
                        <div className={cn("font-medium", !reached && "text-muted-foreground")}>
                          {labelFor(s)}
                        </div>
                        {s === task.status && task.completed_at ? (
                          <div className="text-[11px] text-muted-foreground">
                            {formatDateTime(task.completed_at)}
                          </div>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
                {task.status === "expired" ? (
                  <li className="flex items-center gap-3">
                    <span className="flex size-5 items-center justify-center rounded-full bg-rose-500 text-[10px] text-white">
                      !
                    </span>
                    <div className="text-xs font-medium text-rose-600">Expired</div>
                  </li>
                ) : null}
                {task.status === "cancelled" ? (
                  <li className="flex items-center gap-3">
                    <span className="flex size-5 items-center justify-center rounded-full bg-zinc-400 text-[10px] text-white">
                      ×
                    </span>
                    <div className="text-xs font-medium text-zinc-600">Cancelled</div>
                  </li>
                ) : null}
              </ol>
            </div>

            <Separator />

            <div>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <MessageSquare className="size-3" /> Comments ({merged.length})
              </h4>
              <div className="space-y-2">
                {merged.length === 0 ? (
                  <p className="rounded-md border border-dashed py-3 text-center text-xs text-muted-foreground">
                    Şərh yoxdur.
                  </p>
                ) : (
                  merged.map((c) => {
                    const author = allUsers.find((u) => u.id === c.user_id);
                    return (
                      <div key={c.id} className="flex items-start gap-2 rounded-md border bg-muted/20 p-2">
                        <Avatar className="size-7 shrink-0">
                          <AvatarImage src={author?.avatar_url ?? undefined} alt="" />
                          <AvatarFallback className="text-[10px]">
                            {(author?.full_name ?? "??")
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate font-medium">{author?.full_name ?? "Sistem"}</span>
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              {formatRelative(c.created_at)}
                            </span>
                          </div>
                          <p className="mt-0.5 leading-snug">{c.body}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              {!isClosed ? (
                <div className="mt-2 flex items-end gap-2">
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Şərh əlavə et…"
                    rows={2}
                    className="text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9"
                    onClick={handleSendComment}
                    disabled={!draft.trim()}
                  >
                    <Send className="size-3.5" />
                  </Button>
                </div>
              ) : null}
            </div>

            {!isClosed ? (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Complete task
                  </h4>
                  <Textarea
                    value={completionNote}
                    onChange={(e) => setCompletionNote(e.target.value)}
                    placeholder="Tamamlanma qeydi (opsional)…"
                    rows={2}
                    className="text-xs"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleProofUpload}
                      disabled={uploading || proofUploaded}
                      className="h-8 gap-1.5 text-xs"
                    >
                      {uploading ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : proofUploaded ? (
                        <ImageIcon className="size-3.5 text-emerald-600" />
                      ) : (
                        <Camera className="size-3.5" />
                      )}
                      {proofUploaded ? "Foto əlavə edildi" : uploading ? "Yüklənir…" : "Foto əlavə et"}
                    </Button>
                  </div>
                </div>
              </>
            ) : null}

            {task.completion_note ? (
              <div className="rounded-md border bg-emerald-50/40 p-3 text-xs">
                <div className="mb-1 font-medium text-emerald-700">Tamamlanma qeydi</div>
                <p>{task.completion_note}</p>
              </div>
            ) : null}
            {task.proof_image_url ? (
              <div className="rounded-md border bg-muted/30 p-3 text-xs">
                <div className="mb-1 flex items-center gap-1.5 font-medium text-muted-foreground">
                  <ImageIcon className="size-3.5" /> Proof
                </div>
                <p className="font-mono text-[10px] text-muted-foreground">{task.proof_image_url}</p>
              </div>
            ) : null}
          </div>
        </ScrollArea>

        {!isClosed ? (
          <div className="flex items-center gap-2 border-t bg-background/90 px-6 py-3">
            {task.status !== "in_progress" ? (
              <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={handleStart}>
                <PauseCircle className="size-4" /> Mark in progress
              </Button>
            ) : null}
            <Button size="sm" className="ml-auto h-9 gap-1.5" onClick={handleComplete}>
              <CheckCircle2 className="size-4" /> Mark completed
            </Button>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function Info({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-md border bg-background p-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 truncate text-xs font-medium">{value}</div>
    </div>
  );
}

function labelFor(s: TaskStatus): string {
  switch (s) {
    case "pending":
      return "Pending";
    case "assigned":
      return "Assigned";
    case "in_progress":
      return "In Progress";
    case "completed":
      return "Completed";
    default:
      return s;
  }
}

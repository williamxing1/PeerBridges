"use client";

import { FormEvent, useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X } from "lucide-react";
import { supabase } from "../../lib/supabase/client";

const storedUserKey = "tutorflow-user";

type VolunteerEntry = {
  id: string;
  taskName: string;
  uploadedAt: string;
  uploadedAtMs: number;
  totalMinutes: number;
};

type VolunteerRecordRow = {
  record_id: string;
  tutor_uid: string;
  task_name: string;
  uploaded_at: string;
  minutes: number;
};

type StoredUser = {
  uid: string;
};

function formatUploadedAt(date: Date) {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
}

function toVolunteerEntry(record: VolunteerRecordRow): VolunteerEntry {
  const uploadedAt = new Date(record.uploaded_at);

  return {
    id: record.record_id,
    taskName: record.task_name,
    uploadedAt: formatUploadedAt(uploadedAt),
    uploadedAtMs: uploadedAt.getTime(),
    totalMinutes: record.minutes,
  };
}

function readStoredUser() {
  if (typeof window === "undefined") return null;

  try {
    const stored = sessionStorage.getItem(storedUserKey);
    return stored ? (JSON.parse(stored) as StoredUser) : null;
  } catch {
    return null;
  }
}

export function VolunteerRecordPage({ lang }: { lang: string }) {
  const [entries, setEntries] = useState<VolunteerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [taskName, setTaskName] = useState("");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");

  async function getTutorUid() {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? readStoredUser()?.uid;
  }

  useEffect(() => {
    let cancelled = false;

    async function loadRecords() {
      setLoading(true);
      setError("");

      const tutorUid = await getTutorUid();
      if (!tutorUid) {
        if (!cancelled) {
          setEntries([]);
          setError("No tutor uid available.");
          setLoading(false);
        }
        return;
      }

      const { data, error: recordsError } = await supabase
        .from("volunteer_records")
        .select("record_id, tutor_uid, task_name, uploaded_at, minutes")
        .eq("tutor_uid", tutorUid)
        .order("uploaded_at", { ascending: false });

      if (cancelled) return;

      if (recordsError) {
        setEntries([]);
        setError(recordsError.message);
        setLoading(false);
        return;
      }

      setEntries(((data ?? []) as VolunteerRecordRow[]).map(toVolunteerEntry));
      setLoading(false);
    }

    loadRecords();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const parsedHours = Number(hours || 0);
    const parsedMinutes = Number(minutes || 0);
    const uploadedAt = new Date();
    const totalMinutes = parsedHours * 60 + parsedMinutes;
    const tutorUid = await getTutorUid();

    if (!tutorUid) {
      setError("No tutor uid available.");
      return;
    }

    const { data, error: insertError } = await supabase
      .from("volunteer_records")
      .insert({
        record_id: crypto.randomUUID(),
        tutor_uid: tutorUid,
        task_name: taskName,
        uploaded_at: uploadedAt.toISOString(),
        minutes: totalMinutes,
      })
      .select("record_id, tutor_uid, task_name, uploaded_at, minutes")
      .single();

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setEntries((current) => [toVolunteerEntry(data as VolunteerRecordRow), ...current]);
    setTaskName("");
    setHours("");
    setMinutes("");
    setDialogOpen(false);
  }

  const sortedEntries = [...entries].sort((a, b) => b.uploadedAtMs - a.uploadedAtMs);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div>
          <h2 className="text-foreground">
            {lang === "zh" ? "志愿记录" : "Volunteer Record"}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {lang === "zh" ? "查看和添加你的志愿服务时间。" : "Track tutoring tasks and volunteer hours."}
          </p>
        </div>

        <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
          <Dialog.Trigger asChild>
            <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 sm:w-auto">
              <Plus size={15} />
              {lang === "zh" ? "手动添加" : "Add manual entry"}
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" />
            <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-5 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Dialog.Title className="text-card-foreground">
                    {lang === "zh" ? "添加志愿记录" : "Add Volunteer Entry"}
                  </Dialog.Title>
                  <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                    {lang === "zh" ? "上传时间会自动记录。" : "Upload date and time will be added automatically."}
                  </Dialog.Description>
                </div>
                <Dialog.Close asChild>
                  <button className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground cursor-pointer transition-colors">
                    <X size={15} />
                  </button>
                </Dialog.Close>
              </div>

              <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
                <label className="block">
                  <span className="text-sm text-card-foreground">
                    {lang === "zh" ? "任务名称" : "Task name"}
                  </span>
                  <input
                    required
                    value={taskName}
                    onChange={(event) => setTaskName(event.target.value)}
                    placeholder="e.g. Lesson prep"
                    className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/40 focus:bg-card"
                  />
                </label>

                <div>
                  <p className="text-sm text-card-foreground">
                    {lang === "zh" ? "总时长" : "Total time"}
                  </p>
                  <div className="mt-2 flex gap-3">
                    <label className="block w-24">
                      <span className="text-xs text-muted-foreground">Hours</span>
                      <input
                        required
                        min="0"
                        type="number"
                        value={hours}
                        onChange={(event) => setHours(event.target.value)}
                        className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition focus:border-primary/40 focus:bg-card"
                      />
                    </label>
                    <label className="block w-24">
                      <span className="text-xs text-muted-foreground">Minutes</span>
                      <input
                        required
                        min="0"
                        max="59"
                        type="number"
                        value={minutes}
                        onChange={(event) => setMinutes(event.target.value)}
                        className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition focus:border-primary/40 focus:bg-card"
                      />
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  className="mt-1 w-full rounded-xl bg-primary py-3 text-sm text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                >
                  {lang === "zh" ? "添加记录" : "Enter"}
                </button>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full text-left text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">#</th>
                <th className="px-5 py-3 font-medium">{lang === "zh" ? "任务名称" : "Task name"}</th>
                <th className="px-5 py-3 font-medium">{lang === "zh" ? "上传时间" : "Uploaded"}</th>
                <th className="px-5 py-3 font-medium text-right">{lang === "zh" ? "小时数" : "Hours"}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="border-t border-border">
                  <td colSpan={4} className="px-5 py-10 text-center text-muted-foreground">
                    {lang === "zh" ? "正在加载志愿记录..." : "Loading volunteer records..."}
                  </td>
                </tr>
              ) : sortedEntries.length === 0 ? (
                <tr className="border-t border-border">
                  <td colSpan={4} className="px-5 py-10 text-center text-muted-foreground">
                    {lang === "zh" ? "暂无志愿记录" : "No volunteer records yet."}
                  </td>
                </tr>
              ) : (
                sortedEntries.map((entry, index) => (
                  <tr key={entry.id} className="border-t border-border">
                    <td className="px-5 py-4 text-muted-foreground">{index + 1}</td>
                    <td className="px-5 py-4 text-card-foreground">{entry.taskName}</td>
                    <td className="px-5 py-4 text-muted-foreground">{entry.uploadedAt}</td>
                    <td className="px-5 py-4 text-right text-card-foreground">
                      {formatDuration(entry.totalMinutes)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

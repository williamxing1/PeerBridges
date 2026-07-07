"use client";

import { FormEvent, useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X } from "lucide-react";
import { supabase } from "../../lib/supabase/client";
import { useLanguage } from "../i18n";

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

function formatUploadedAt(date: Date, lang: string) {
  return date.toLocaleString(lang === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(totalMinutes: number, t: ReturnType<typeof useLanguage>["t"]) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return t("common.minuteShort", { count: minutes });
  if (minutes === 0) return t("common.hourShort", { count: hours });
  return t("common.hourMinuteShort", { hours, minutes });
}

function toVolunteerEntry(record: VolunteerRecordRow, lang: string): VolunteerEntry {
  const uploadedAt = new Date(record.uploaded_at);

  return {
    id: record.record_id,
    taskName: record.task_name,
    uploadedAt: formatUploadedAt(uploadedAt, lang),
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
  const { t } = useLanguage();
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
          setError(t("common.noTutorUid"));
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

      setEntries(((data ?? []) as VolunteerRecordRow[]).map((record) => toVolunteerEntry(record, lang)));
      setLoading(false);
    }

    loadRecords();

    return () => {
      cancelled = true;
    };
  }, [lang, t]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const parsedHours = Number(hours || 0);
    const parsedMinutes = Number(minutes || 0);
    const totalMinutes = parsedHours * 60 + parsedMinutes;
    const tutorUid = await getTutorUid();

    if (!tutorUid) {
      setError(t("common.noTutorUid"));
      return;
    }

    const { data, error: insertError } = await supabase.rpc("secure_add_volunteer_record", {
      p_task_name: taskName.trim(),
      p_minutes: totalMinutes,
    });

    if (insertError) {
      console.error("secure_add_volunteer_record failed", insertError);
      setError(insertError.message);
      return;
    }

    const insertedRecord = ((data ?? []) as VolunteerRecordRow[])[0];
    if (!insertedRecord) {
      setError(t("common.unexpectedError"));
      return;
    }
    setEntries((current) => [toVolunteerEntry(insertedRecord, lang), ...current]);
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
            {t("volunteer.title")}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("volunteer.help")}
          </p>
        </div>

        <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
          <Dialog.Trigger asChild>
            <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 sm:w-auto">
              <Plus size={15} />
              {t("volunteer.addManual")}
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" />
            <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Dialog.Title className="text-card-foreground">
                    {t("volunteer.addEntry")}
                  </Dialog.Title>
                  <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                    {t("volunteer.uploadAuto")}
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
                    {t("volunteer.taskName")}
                  </span>
                  <input
                    required
                    value={taskName}
                    onChange={(event) => setTaskName(event.target.value)}
                    placeholder={t("volunteer.taskPlaceholder")}
                    className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/40 focus:bg-card"
                  />
                </label>

                <div>
                  <p className="text-sm text-card-foreground">
                    {t("volunteer.totalTime")}
                  </p>
                  <div className="mt-2 flex gap-3">
                    <label className="block w-24">
                      <span className="text-xs text-muted-foreground">{t("common.hours")}</span>
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
                      <span className="text-xs text-muted-foreground">{t("common.minutes")}</span>
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
                  {t("volunteer.enter")}
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
        <div className="lg:hidden">
          {loading ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              {t("volunteer.loading")}
            </div>
          ) : sortedEntries.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              {t("volunteer.empty")}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {sortedEntries.map((entry, index) => (
                <article key={entry.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words text-sm text-card-foreground">{entry.taskName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{entry.uploadedAt}</p>
                    </div>
                    <span className="shrink-0 rounded-lg bg-muted px-2.5 py-1 text-xs text-card-foreground">
                      {formatDuration(entry.totalMinutes, t)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">#{index + 1}</p>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">#</th>
                <th className="px-5 py-3 font-medium">{t("volunteer.taskName")}</th>
                <th className="px-5 py-3 font-medium">{t("volunteer.uploaded")}</th>
                <th className="px-5 py-3 font-medium text-right">{t("common.hours")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="border-t border-border">
                  <td colSpan={4} className="px-5 py-10 text-center text-muted-foreground">
                    {t("volunteer.loading")}
                  </td>
                </tr>
              ) : sortedEntries.length === 0 ? (
                <tr className="border-t border-border">
                  <td colSpan={4} className="px-5 py-10 text-center text-muted-foreground">
                    {t("volunteer.empty")}
                  </td>
                </tr>
              ) : (
                sortedEntries.map((entry, index) => (
                  <tr key={entry.id} className="border-t border-border">
                    <td className="px-5 py-4 text-muted-foreground">{index + 1}</td>
                    <td className="px-5 py-4 text-card-foreground">{entry.taskName}</td>
                    <td className="px-5 py-4 text-muted-foreground">{entry.uploadedAt}</td>
                    <td className="px-5 py-4 text-right text-card-foreground">
                      {formatDuration(entry.totalMinutes, t)}
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

"use client";

import { FormEvent, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X } from "lucide-react";

type VolunteerEntry = {
  id: number;
  taskName: string;
  uploadedAt: string;
  uploadedAtMs: number;
  hours: number;
  minutes: number;
};

const INITIAL_ENTRIES: VolunteerEntry[] = [
  {
    id: 1,
    taskName: "Level 5 Unit 7 Lesson 2 tutoring session",
    uploadedAt: "Jun 9, 2026 at 09:12 AM",
    uploadedAtMs: new Date("2026-06-09T09:12:00").getTime(),
    hours: 1,
    minutes: 0,
  },
  {
    id: 2,
    taskName: "Homework review and lesson notes",
    uploadedAt: "Jun 8, 2026 at 04:38 PM",
    uploadedAtMs: new Date("2026-06-08T16:38:00").getTime(),
    hours: 0,
    minutes: 45,
  },
];

function formatUploadedAt(date: Date) {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(hours: number, minutes: number) {
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
}

export function VolunteerRecordPage({ lang }: { lang: string }) {
  const [entries, setEntries] = useState<VolunteerEntry[]>(INITIAL_ENTRIES);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [taskName, setTaskName] = useState("");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsedHours = Number(hours || 0);
    const parsedMinutes = Number(minutes || 0);
    const uploadedAt = new Date();

    setEntries((current) => [
      ...current,
      {
        id: current.length + 1,
        taskName,
        uploadedAt: formatUploadedAt(uploadedAt),
        uploadedAtMs: uploadedAt.getTime(),
        hours: parsedHours,
        minutes: parsedMinutes,
      },
    ]);
    setTaskName("");
    setHours("");
    setMinutes("");
    setDialogOpen(false);
  }

  const sortedEntries = [...entries].sort((a, b) => b.uploadedAtMs - a.uploadedAtMs);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
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
            <button className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
              <Plus size={15} />
              {lang === "zh" ? "手动添加" : "Add manual entry"}
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" />
            <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-5 shadow-xl">
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

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium">#</th>
              <th className="px-5 py-3 font-medium">{lang === "zh" ? "任务名称" : "Task name"}</th>
              <th className="px-5 py-3 font-medium">{lang === "zh" ? "上传时间" : "Uploaded"}</th>
              <th className="px-5 py-3 font-medium text-right">{lang === "zh" ? "小时数" : "Hours"}</th>
            </tr>
          </thead>
          <tbody>
            {sortedEntries.map((entry, index) => (
              <tr key={entry.id} className="border-t border-border">
                <td className="px-5 py-4 text-muted-foreground">{index + 1}</td>
                <td className="px-5 py-4 text-card-foreground">{entry.taskName}</td>
                <td className="px-5 py-4 text-muted-foreground">{entry.uploadedAt}</td>
                <td className="px-5 py-4 text-right text-card-foreground">
                  {formatDuration(entry.hours, entry.minutes)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

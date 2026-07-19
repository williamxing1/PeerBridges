"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as Select from "@radix-ui/react-select";
import * as Dialog from "@radix-ui/react-dialog";
import { BookOpen, CalendarDays, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ClipboardList, Clock, GraduationCap, MessageSquare, Star, UserCheck, Users, X, type LucideIcon } from "lucide-react";
import { supabase } from "../../lib/supabase/client";
import { useLanguage, type TranslationKey } from "../i18n";
import { PersonProfileDetails, type ProfilePerson } from "./PersonProfileDetails";
import { TutorAvailabilityViewer } from "./TutorSchedulePage";
import { currentBeijingWeekendDate } from "../lib/weekend";

type PersonType = "student" | "tutor";

type ProfileRow = {
  uid: string;
  role: "student" | "tutor" | "admin";
  name: string;
  created_at?: string;
  strikes?: number;
  banned_at?: string | null;
  banned_until?: string | null;
  banned_count?: number;
  approved?: boolean | null;
};
type ClassRow = {
  lesson_id: string;
  student_uid: string;
  teacher_uid: string;
  time: string;
  duration: number;
  status?: string | null;
  recurring_lesson_id?: string | null;
  evaluation_completed?: boolean;
  student_attended?: boolean | null;
  teacher_attended?: boolean | null;
  description?: string | null;
  student_wants_to_share?: string | null;
};
type VolunteerRecordRow = {
  tutor_uid: string;
  uploaded_at: string;
  minutes: number;
  task_name?: string;
};
type IndividualClassRow = ClassRow & {
  evaluation_completed: boolean;
  student_attended: boolean | null;
  teacher_attended: boolean | null;
};
type AssignmentRow = {
  assignment_id: string;
  lesson_id: string | null;
  student_uid: string;
  teacher_uid: string;
  name: string;
  description: string;
  due_date: string;
  complete: boolean;
  deleted?: boolean;
};
type EvaluationRow = {
  evaluation_id: string;
  lesson_id: string;
  stars: number;
  feedback: string;
  created_at: string;
  teacher_uid: string;
};
type TutorAvailabilityRow = {
  tutor_uid: string;
  weekend_date: string;
  [slot: string]: string | boolean;
};
type PersonOption = {
  uid: string;
  name: string;
};

function parseDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayInput() {
  return formatDateInput(new Date());
}

function clampDateInput(value: string, max: string) {
  return parseDate(value) > parseDate(max) ? max : value;
}

function oneMonthBeforeTodayInput() {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return formatDateInput(date);
}

function endOfDay(value: string) {
  return new Date(`${value}T23:59:59.999`);
}

function classStartsAt(cls: ClassRow) {
  return new Date(cls.time);
}

function classEndsAt(cls: ClassRow) {
  return new Date(classStartsAt(cls).getTime() + cls.duration * 60000);
}

function classMinutes(cls: ClassRow) {
  return cls.duration;
}

type WeekendCell = { key: string; localDates: [Date, Date] };

function beijingWeekendKeyForInstant(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const beijingDate = new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)));
  beijingDate.setUTCDate(beijingDate.getUTCDate() - ((beijingDate.getUTCDay() + 1) % 7));
  return `${beijingDate.getUTCFullYear()}-${String(beijingDate.getUTCMonth() + 1).padStart(2, "0")}-${String(beijingDate.getUTCDate()).padStart(2, "0")}`;
}

function calendarDateInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function localWeekendCells(start: string, end: string, timeZone: string) {
  const seed = parseDate(start);
  seed.setDate(seed.getDate() - 8);
  const seedParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(seed);
  const values = Object.fromEntries(seedParts.map((part) => [part.type, part.value]));
  const cursor = new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)));
  cursor.setUTCDate(cursor.getUTCDate() - ((cursor.getUTCDay() + 1) % 7));

  const cells: WeekendCell[] = [];
  const stop = endOfDay(end).getTime() + 14 * 86400000;
  while (cursor.getTime() <= stop) {
    const key = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}-${String(cursor.getUTCDate()).padStart(2, "0")}`;
    const firstLocalDate = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate(), 4));
    const secondLocalDate = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate() + 1, 4));
    if (calendarDateInTimeZone(firstLocalDate, timeZone) >= start && calendarDateInTimeZone(secondLocalDate, timeZone) <= end) {
      cells.push({ key, localDates: [firstLocalDate, secondLocalDate] });
    }
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }
  return cells;
}

function shiftCalendarDate(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function availabilityWeekendRange(value: string, lang: string) {
  const [year, month, day] = value.split("-").map(Number);
  const locale = lang === "zh" ? "zh-CN" : "en-US";
  const saturdayFirstSlot = new Date(Date.UTC(year, month - 1, day, -1));
  const sundayFirstSlot = new Date(Date.UTC(year, month - 1, day + 1, -1));
  const format = (date: Date) => date.toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric" });
  return `${format(saturdayFirstSlot)} – ${format(sundayFirstSlot)}`;
}

function hoursLabel(minutes: number) {
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`;
}

function percentLabel(value: number, total: number) {
  return total > 0 ? `${Math.round((value / total) * 100)}%` : "—";
}

function inDateRange(date: Date, start: string, end: string) {
  return date >= parseDate(start) && date <= endOfDay(end);
}

function monthsBetween(start: string, end: string) {
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  return Math.max(
    1,
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      endDate.getMonth() -
      startDate.getMonth() +
      1
  );
}

function intervalLabel(start: string, end: string) {
  const months = monthsBetween(start, end);
  if (months >= 12) return "Year";
  if (months >= 2) return "Month";
  return "Day";
}

function intervalDates(start: string, end: string) {
  const interval = intervalLabel(start, end);
  const startDate = parseDate(start);
  const months = monthsBetween(start, end);
  const count = interval === "Year" ? Math.min(7, Math.ceil(months / 12) + 1) : interval === "Month" ? Math.min(8, months) : 7;

  return Array.from({ length: count }).map((_, index) => {
    const date = new Date(startDate);
    if (interval === "Year") date.setFullYear(startDate.getFullYear() + index);
    if (interval === "Month") date.setMonth(startDate.getMonth() + index);
    if (interval === "Day") date.setDate(startDate.getDate() + index);
    if (date > endOfDay(end)) return endOfDay(end);
    return date;
  });
}

function growthPoints(start: string, end: string, profiles: ProfileRow[], lang: string) {
  const interval = intervalLabel(start, end);
  const locale = lang === "zh" ? "zh-CN" : "en-US";
  return intervalDates(start, end).map((date) => {
    return {
      label:
        interval === "Year"
          ? String(date.getFullYear())
          : interval === "Month"
            ? date.toLocaleDateString(locale, { month: "short" })
            : date.toLocaleDateString(locale, { weekday: "short" }),
      value: profiles.filter((profile) => profile.created_at && new Date(profile.created_at) <= endOfDay(formatDateInput(date))).length,
    };
  });
}

function StatBox({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-muted-foreground leading-snug">{label}</p>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Icon size={15} />
        </span>
      </div>
      <p className="mt-5 text-3xl text-card-foreground">{value}</p>
    </div>
  );
}

function PeopleListCard({
  title,
  people,
  loading,
}: {
  title: string;
  people: PersonOption[];
  loading: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-card-foreground">{title}</h3>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
          {loading ? "..." : people.length}
        </span>
      </div>
      <div className="mt-4 max-h-72 overflow-y-auto rounded-xl border border-border bg-background">
        {loading ? (
          <p className="px-4 py-3 text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : people.length === 0 ? (
          <p className="px-4 py-3 text-sm text-muted-foreground">{t("common.none")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {people.map((person) => (
              <li key={person.uid} className="px-4 py-3 text-sm text-card-foreground">
                {person.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function CalendarInput({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  max?: string;
}) {
  const { lang, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const visibleDate = parseDate(value);
  const year = visibleDate.getFullYear();
  const month = visibleDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const cells = [
    ...Array.from({ length: firstDay }).map(() => ""),
    ...Array.from({ length: daysInMonth }).map((_, index) => String(index + 1)),
  ];

  function updateMonth(offset: number) {
    const next = parseDate(value);
    next.setMonth(next.getMonth() + offset);
    const nextValue = formatDateInput(next);
    onChange(max ? clampDateInput(nextValue, max) : nextValue);
  }

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <span className="text-sm text-card-foreground">{label}</span>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="mt-2 flex h-11 w-full items-center justify-between rounded-xl border border-border bg-background px-3.5 text-sm text-card-foreground outline-none transition hover:border-primary/40"
      >
        {parseDate(value).toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US", { month: "short", day: "numeric", year: "numeric" })}
        <CalendarDays size={15} className="text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute left-0 z-40 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-border bg-popover p-3 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <button type="button" onClick={() => updateMonth(-1)} className="rounded-lg px-2 py-1 text-sm hover:bg-accent">
              {t("common.prev")}
            </button>
            <p className="text-sm text-popover-foreground">
              {visibleDate.toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US", { month: "long", year: "numeric" })}
            </p>
            <button
              type="button"
              onClick={() => updateMonth(1)}
              disabled={max ? parseDate(formatDateInput(new Date(year, month + 1, 1))) > parseDate(max) : false}
              className="rounded-lg px-2 py-1 text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("common.next")}
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
            {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
              <span key={`${day}-${index}`} className="py-1">{day}</span>
            ))}
            {cells.map((day, index) =>
              day ? (
                <button
                  key={`${day}-${index}`}
                  type="button"
                  onClick={() => {
                    const next = new Date(year, month, Number(day));
                    onChange(formatDateInput(next));
                    setOpen(false);
                  }}
                  disabled={max ? new Date(year, month, Number(day)) > parseDate(max) : false}
                  className={`rounded-lg py-2 text-sm transition-colors ${
                    Number(day) === visibleDate.getDate()
                      ? "bg-primary text-primary-foreground"
                      : "text-popover-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                  }`}
                >
                  {day}
                </button>
              ) : (
                <span key={`blank-${index}`} />
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LineChart({
  title,
  points,
}: {
  title: string;
  points: Array<{ label: string; value: number }>;
}) {
  const max = Math.max(...points.map((point) => point.value));
  const min = Math.min(...points.map((point) => point.value));
  const width = 520;
  const height = 190;
  const padding = 34;
  const tickCount = 4;
  const yTicks = Array.from({ length: tickCount + 1 }).map((_, index) => {
    const value = min + ((max - min) * index) / tickCount;
    const y = height - padding - ((value - min) / Math.max(1, max - min)) * (height - padding * 2);
    return { value: Math.round(value), y };
  });
  const path = points
    .map((point, index) => {
      const x = padding + (index * (width - padding * 2)) / Math.max(1, points.length - 1);
      const y = height - padding - ((point.value - min) / Math.max(1, max - min)) * (height - padding * 2);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <h3 className="text-card-foreground">{title}</h3>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 h-48 w-full sm:h-56">
        {yTicks.map((tick, index) => (
          <g key={`${tick.value}-${index}`}>
            <line x1={padding} y1={tick.y} x2={width - padding} y2={tick.y} className="stroke-border" strokeDasharray="4 6" />
            <text x={padding - 10} y={tick.y + 4} textAnchor="end" className="fill-muted-foreground text-[11px]">
              {tick.value}
            </text>
          </g>
        ))}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} className="stroke-border" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} className="stroke-border" />
        <path d={path} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => {
          const x = padding + (index * (width - padding * 2)) / Math.max(1, points.length - 1);
          const y = height - padding - ((point.value - min) / Math.max(1, max - min)) * (height - padding * 2);
          return (
            <g key={point.label}>
              <circle cx={x} cy={y} r="4" fill="var(--primary)" />
              <text x={x} y={height - 8} textAnchor="middle" className="fill-muted-foreground text-[11px]">
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function SelectPerson({
  type,
  value,
  onChange,
  options,
}: {
  type: PersonType;
  value: string;
  onChange: (value: string) => void;
  options: PersonOption[];
}) {
  const { t } = useLanguage();
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger className="flex h-11 w-full items-center justify-between rounded-xl border border-border bg-background px-3.5 text-sm text-card-foreground outline-none transition data-[placeholder]:text-muted-foreground hover:border-primary/40">
        <Select.Value placeholder={t("admin.selectPerson", { type: t(type === "student" ? "common.student" : "common.tutor") })} />
        <Select.Icon>
          <ChevronDown size={15} className="text-muted-foreground" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="z-50 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-xl">
          <Select.Viewport>
            {options.map((option) => (
              <Select.Item
                key={option.uid}
                value={option.uid}
                className="cursor-pointer rounded-lg px-3 py-2 text-sm text-popover-foreground outline-none data-[highlighted]:bg-accent"
              >
                <Select.ItemText>{option.name}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

function attendanceLabel(attended: boolean | null | undefined, completed: boolean, t: ReturnType<typeof useLanguage>["t"]) {
  if (!completed) return t("admin.notYetApplicable");
  return attended === true ? t("admin.showedUp") : t("admin.didNotShow");
}

function AdminClassCard({
  cls,
  names,
  evaluation,
}: {
  cls: ClassRow;
  names: Map<string, string>;
  evaluation?: EvaluationRow;
}) {
  const { lang, t } = useLanguage();
  const completed = classEndsAt(cls) <= new Date();
  const locale = lang === "zh" ? "zh-CN" : "en-US";
  const tutorName = names.get(cls.teacher_uid) ?? t("common.tutor");
  const studentName = names.get(cls.student_uid) ?? t("common.student");
  const [evaluationOpen, setEvaluationOpen] = useState(false);

  return (
    <>
      <article className="rounded-xl border border-border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-card-foreground">{t("admin.classBetween", { student: studentName, tutor: tutorName })}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {classStartsAt(cls).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })} · {cls.duration} {t("common.minutes")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {cls.recurring_lesson_id && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700">{t("dashboard.recurring")}</span>}
          <span className={`rounded-full px-2 py-0.5 text-[11px] ${completed ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>
            {t(completed ? "dashboard.completed" : "dashboard.upcoming")}
          </span>
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
        <p className="rounded-lg bg-muted px-3 py-2 text-muted-foreground">
          {t("common.student")}: <span className="text-card-foreground">{attendanceLabel(cls.student_attended, completed, t)}</span>
        </p>
        <p className="rounded-lg bg-muted px-3 py-2 text-muted-foreground">
          {t("common.tutor")}: <span className="text-card-foreground">{attendanceLabel(cls.teacher_attended, completed, t)}</span>
        </p>
      </div>

      {cls.student_wants_to_share && (
        <p className="mt-3 text-xs text-muted-foreground"><span className="text-card-foreground">{t("admin.studentNote")}:</span> {cls.student_wants_to_share}</p>
      )}

      {completed && (
        <div className="mt-3 border-t border-border pt-3">
          {cls.evaluation_completed && evaluation ? (
            <button type="button" onClick={() => setEvaluationOpen(true)} className="flex items-center gap-1.5 text-xs text-primary transition-colors hover:text-primary/80">
              <MessageSquare size={12} />
              {t("dashboard.viewEvaluation")}
              <ChevronRight size={12} />
            </button>
          ) : cls.evaluation_completed ? (
            <p className="text-xs text-muted-foreground">{t("admin.evaluationRecorded")}</p>
          ) : (
            <p className="text-xs text-amber-700">{t("admin.evaluationPendingTutor", { tutor: tutorName })}</p>
          )}
        </div>
      )}
      </article>

      <Dialog.Root open={evaluationOpen} onOpenChange={setEvaluationOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Dialog.Title className="text-lg text-card-foreground">{t("dashboard.viewEvaluation")}</Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-muted-foreground">{t("admin.classBetween", { student: studentName, tutor: tutorName })}</Dialog.Description>
              </div>
              <Dialog.Close className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent" aria-label={t("common.close")}>
                <X size={16} />
              </Dialog.Close>
            </div>
            {evaluation && (
              <div className="mt-5 grid gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">{t("dashboard.whatDidYouDoInClass")}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-card-foreground">{cls.description || t("common.none")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("dashboard.starRating")}</p>
                  <p className="mt-2 text-sm text-card-foreground">{evaluation.stars} / 5</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("dashboard.feedback")}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-card-foreground">{evaluation.feedback}</p>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

type WeekStatus = { label: TranslationKey; className: string };

function WeeklyActivityCalendar({
  title,
  start,
  end,
  statusForWeekend,
  legend,
}: {
  title: string;
  start: string;
  end: string;
  statusForWeekend: (weekendKey: string) => WeekStatus;
  legend: WeekStatus[];
}) {
  const { lang, t } = useLanguage();
  const [viewerTimeZone, setViewerTimeZone] = useState("Asia/Shanghai");
  const weekends = localWeekendCells(start, end, viewerTimeZone);
  const locale = lang === "zh" ? "zh-CN" : "en-US";

  useEffect(() => {
    const resolvedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (resolvedTimeZone) setViewerTimeZone(resolvedTimeZone);
  }, []);

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-card-foreground">{title}</h3>
        <div className="flex flex-wrap gap-x-3 gap-y-2 text-xs text-muted-foreground">
          {legend.map((item) => (
            <span key={item.label} className="flex items-center gap-1.5">
              <span className={`h-3 w-3 rounded-sm ${item.className}`} />
              {t(item.label)}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-4 overflow-x-auto pb-2">
        <div className="grid min-w-max grid-flow-col auto-cols-[6.5rem] gap-2">
          {weekends.map((weekend) => {
            const status = statusForWeekend(weekend.key);
            const [firstDate, secondDate] = weekend.localDates;
            return (
              <div
                key={weekend.key}
                aria-label={`${firstDate.toLocaleDateString(locale, { dateStyle: "medium", timeZone: viewerTimeZone })} and ${secondDate.toLocaleDateString(locale, { dateStyle: "medium", timeZone: viewerTimeZone })}: ${t(status.label)}`}
                className={`rounded-xl px-2 py-3 text-center ${status.className}`}
              >
                <p className="text-xs font-medium">{firstDate.toLocaleDateString(locale, { month: "short", day: "numeric", timeZone: viewerTimeZone })}</p>
                <p className="mt-1 text-xs font-medium">{secondDate.toLocaleDateString(locale, { month: "short", day: "numeric", timeZone: viewerTimeZone })}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ProfileAccountStatus({ profile }: { profile?: ProfileRow }) {
  const { lang, t } = useLanguage();
  if (!profile) return null;
  const locale = lang === "zh" ? "zh-CN" : "en-US";
  const bannedUntil = profile.banned_until ? new Date(profile.banned_until) : null;
  const isBanned = Boolean(bannedUntil && bannedUntil > new Date());
  const format = (value: string | null | undefined) => value ? new Date(value).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) : "—";

  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-muted p-3">
          <p className="text-xs text-muted-foreground">{t("admin.strikes")}</p>
          <p className="mt-1 text-lg text-card-foreground">{profile.strikes ?? 0} / 3</p>
        </div>
        <div className="rounded-xl bg-muted p-3">
          <p className="text-xs text-muted-foreground">{t("admin.accountApproval")}</p>
          <p className="mt-1 text-lg text-card-foreground">{t(profile.approved === true ? "admin.approvalApproved" : profile.approved === false ? "admin.approvalRejected" : "admin.approvalPending")}</p>
        </div>
        <div className="rounded-xl bg-muted p-3">
          <p className="text-xs text-muted-foreground">{t("admin.banned")}</p>
          <p className="mt-1 text-lg text-card-foreground">{t(isBanned ? "common.yes" : "common.no")}</p>
        </div>
      </div>
      {isBanned && (
        <p className="mt-3 text-xs text-muted-foreground">
          {t("admin.banRange", { start: format(profile.banned_at), end: format(profile.banned_until) })}
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">{t("admin.previousBans", { count: profile.banned_count ?? 0 })}</p>
    </div>
  );
}

export function AdminDashboardPage({ lang }: { lang: string }) {
  const { t } = useLanguage();
  const [startDate, setStartDate] = useState(oneMonthBeforeTodayInput);
  const [endDate, setEndDate] = useState(todayInput);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationRow[]>([]);
  const [volunteerRecords, setVolunteerRecords] = useState<VolunteerRecordRow[]>([]);
  const [studentUids, setStudentUids] = useState<string[]>([]);
  const [tutorUids, setTutorUids] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const intervalKey = `admin.interval.${intervalLabel(startDate, endDate).toLowerCase()}` as TranslationKey;
  const interval = t(intervalKey);
  const now = new Date();
  const studentProfiles = profiles.filter((profile) => studentUids.includes(profile.uid));
  const tutorProfiles = profiles.filter((profile) => tutorUids.includes(profile.uid));
  const studentOptions = studentProfiles
    .map(({ uid, name }) => ({ uid, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const tutorOptions = tutorProfiles
    .map(({ uid, name }) => ({ uid, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const completedClasses = classes.filter((cls) => classEndsAt(cls) <= now);
  const allTimeVolunteerMinutes = volunteerRecords.reduce((total, record) => total + record.minutes, 0);
  const reportClasses = classes.filter((cls) => inDateRange(classStartsAt(cls), startDate, endDate));
  const periodClasses = reportClasses.filter((cls) => classEndsAt(cls) <= now);
  const periodStudentUids = Array.from(new Set(periodClasses.filter((cls) => cls.student_attended === true).map((cls) => cls.student_uid)));
  const periodTutorUids = Array.from(new Set(periodClasses.filter((cls) => cls.teacher_attended === true).map((cls) => cls.teacher_uid)));
  const periodVolunteerMinutes = volunteerRecords
    .filter((record) => inDateRange(new Date(record.uploaded_at), startDate, endDate))
    .reduce((total, record) => total + record.minutes, 0);
  const profileName = new Map(profiles.map((profile) => [profile.uid, profile.name]));
  const missingStudents = studentUids
    .filter((uid) => !periodStudentUids.includes(uid))
    .map((uid) => ({ uid, name: profileName.get(uid) ?? uid }));
  const missingTutors = tutorUids
    .filter((uid) => !periodTutorUids.includes(uid))
    .map((uid) => ({ uid, name: profileName.get(uid) ?? t("common.tutor") }));
  const studentGrowth = useMemo(() => growthPoints(startDate, endDate, studentProfiles, lang), [startDate, endDate, studentProfiles, lang]);
  const tutorGrowth = useMemo(() => growthPoints(startDate, endDate, tutorProfiles, lang), [startDate, endDate, tutorProfiles, lang]);

  useEffect(() => {
    let cancelled = false;

    async function loadAdminData() {
      setLoading(true);
      setError("");

      const [
        profilesResult,
        studentsResult,
        tutorsResult,
        classesResult,
        volunteerResult,
        evaluationsResult,
      ] = await Promise.all([
        supabase.from("profiles").select("uid, role, name, created_at, strikes, banned_at, banned_until, banned_count, approved"),
        supabase.from("student_profiles").select("uid"),
        supabase.from("tutor_profiles").select("uid"),
        supabase.from("classes").select("lesson_id, student_uid, teacher_uid, time, duration, status, recurring_lesson_id, evaluation_completed, student_attended, teacher_attended, description, student_wants_to_share"),
        supabase.from("volunteer_records").select("tutor_uid, uploaded_at, minutes"),
        supabase.from("evaluations").select("evaluation_id, lesson_id, stars, feedback, created_at, teacher_uid"),
      ]);

      if (cancelled) return;

      const firstError = profilesResult.error ?? studentsResult.error ?? tutorsResult.error ?? classesResult.error ?? volunteerResult.error ?? evaluationsResult.error;
      if (firstError) {
        setError(firstError.message);
        setLoading(false);
        return;
      }

      setProfiles((profilesResult.data ?? []) as ProfileRow[]);
      setStudentUids(((studentsResult.data ?? []) as Array<{ uid: string }>).map((row) => row.uid));
      setTutorUids(((tutorsResult.data ?? []) as Array<{ uid: string }>).map((row) => row.uid));
      setClasses(((classesResult.data ?? []) as ClassRow[]).filter((cls) => cls.status !== "cancelled"));
      setVolunteerRecords((volunteerResult.data ?? []) as VolunteerRecordRow[]);
      setEvaluations((evaluationsResult.data ?? []) as EvaluationRow[]);
      setLoading(false);
    }

    loadAdminData();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-foreground">{t("admin.title")}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{t("admin.help")}</p>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-card-foreground">{t("admin.allTimeOverview")}</h3>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatBox label={t("admin.studentCount")} value={loading ? "..." : String(studentUids.length)} icon={GraduationCap} />
          <StatBox label={t("admin.teacherCount")} value={loading ? "..." : String(tutorUids.length)} icon={Users} />
          <StatBox label={t("admin.completedClassCount")} value={loading ? "..." : String(completedClasses.length)} icon={BookOpen} />
          <StatBox label={t("admin.volunteerHoursCount")} value={loading ? "..." : hoursLabel(allTimeVolunteerMinutes)} icon={Clock} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <PeopleListCard title={t("admin.allStudents")} people={studentOptions} loading={loading} />
        <PeopleListCard title={t("admin.allTutors")} people={tutorOptions} loading={loading} />
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
          <div className="grid w-full gap-4 xl:max-w-sm">
            <h3 className="text-card-foreground">{t("admin.periodReport")}</h3>
            <CalendarInput label={t("common.startDate")} value={startDate} onChange={setStartDate} />
            <CalendarInput label={t("common.endDate")} value={endDate} onChange={setEndDate} />
            <p className="text-xs text-muted-foreground">{t("admin.chartInterval", { interval })}</p>
          </div>

          <div className="grid flex-1 gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <StatBox label={t("admin.studentsAttended")} value={loading ? "..." : String(periodStudentUids.length)} icon={GraduationCap} />
              <StatBox label={t("admin.studentLearningHours")} value={loading ? "..." : hoursLabel(periodClasses.reduce((total, cls) => total + classMinutes(cls), 0))} icon={Clock} />
              <StatBox label={t("admin.tutorsTaught")} value={loading ? "..." : String(periodTutorUids.length)} icon={Users} />
              <StatBox label={t("admin.tutorHoursSpent")} value={loading ? "..." : hoursLabel(periodVolunteerMinutes)} icon={Clock} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-sm text-card-foreground">{t("admin.studentsDidNotAttend")}</p>
                <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
                  {loading ? (
                    <span>{t("common.loading")}</span>
                  ) : missingStudents.length === 0 ? (
                    <span>{t("common.none")}</span>
                  ) : (
                    missingStudents.map((student) => <span key={student.uid}>{student.name}</span>)
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-sm text-card-foreground">{t("admin.tutorsDidNotTeach")}</p>
                <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
                  {loading ? (
                    <span>{t("common.loading")}</span>
                  ) : missingTutors.length === 0 ? (
                    <span>{t("common.none")}</span>
                  ) : (
                    missingTutors.map((tutor) => <span key={tutor.uid}>{tutor.name}</span>)
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4 2xl:grid-cols-2">
              <LineChart title={t("admin.studentGrowth")} points={studentGrowth} />
              <LineChart title={t("admin.teacherGrowth")} points={tutorGrowth} />
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-border pt-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-card-foreground">{t("admin.classesInPeriod")}</h3>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{loading ? "..." : reportClasses.length}</span>
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {loading ? (
              <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
            ) : reportClasses.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("common.none")}</p>
            ) : (
              [...reportClasses]
                .sort((a, b) => classStartsAt(b).getTime() - classStartsAt(a).getTime())
                .map((cls) => (
                  <AdminClassCard
                    key={cls.lesson_id}
                    cls={cls}
                    names={profileName}
                    evaluation={evaluations.find((evaluation) => evaluation.lesson_id === cls.lesson_id)}
                  />
                ))
            )}
          </div>
        </div>
      </section>

    </div>
  );
}

export function AdminIndividualQueryPage() {
  const { lang, t } = useLanguage();
  const [startDate, setStartDate] = useState(oneMonthBeforeTodayInput);
  const [endDate, setEndDate] = useState(todayInput);
  const [personType, setPersonType] = useState<PersonType>("student");
  const [selectedPersonUid, setSelectedPersonUid] = useState("");
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [classes, setClasses] = useState<IndividualClassRow[]>([]);
  const [volunteerRecords, setVolunteerRecords] = useState<VolunteerRecordRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationRow[]>([]);
  const [availability, setAvailability] = useState<TutorAvailabilityRow[]>([]);
  const [availabilityWeekendDate, setAvailabilityWeekendDate] = useState(currentBeijingWeekendDate);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const studentOptions = useMemo(
    () => profiles
      .filter((profile) => profile.role === "student")
      .map(({ uid, name }) => ({ uid, name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [profiles]
  );
  const tutorOptions = useMemo(
    () => profiles
      .filter((profile) => profile.role === "tutor")
      .map(({ uid, name }) => ({ uid, name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [profiles]
  );
  const selectedOptions = personType === "student" ? studentOptions : tutorOptions;
  const selectedProfile = profiles.find((profile) => profile.uid === selectedPersonUid && profile.role === personType);
  const selectedPerson: ProfilePerson | null = selectedProfile
    ? { uid: selectedProfile.uid, role: personType, name: selectedProfile.name }
    : null;

  const personAllClasses = selectedPersonUid
    ? classes.filter((cls) => personType === "student" ? cls.student_uid === selectedPersonUid : cls.teacher_uid === selectedPersonUid)
    : [];
  const personClasses = personAllClasses
    .filter((cls) => classEndsAt(cls) <= new Date())
    .filter((cls) => inDateRange(classStartsAt(cls), startDate, endDate));
  const allLessonIds = new Set(personAllClasses.map((cls) => cls.lesson_id));
  const personAssignments = assignments.filter((assignment) =>
    personType === "student" ? assignment.student_uid === selectedPersonUid : assignment.teacher_uid === selectedPersonUid
  );
  const personEvaluations = evaluations.filter((evaluation) => allLessonIds.has(evaluation.lesson_id));
  const personAvailability = availability.filter((row) => row.tutor_uid === selectedPersonUid);
  const selectedAvailability = personAvailability.find((row) => row.weekend_date === availabilityWeekendDate);
  const personVolunteerRecords = volunteerRecords.filter((record) => record.tutor_uid === selectedPersonUid);
  const periodVolunteerRecords = selectedPersonUid && personType === "tutor"
    ? volunteerRecords.filter(
        (record) => record.tutor_uid === selectedPersonUid && inDateRange(new Date(record.uploaded_at), startDate, endDate)
      )
    : [];
  const attendedClasses = personClasses.filter((cls) => personType === "student" ? cls.student_attended === true : cls.teacher_attended === true).length;
  const evaluationCount = personClasses.filter((cls) => cls.evaluation_completed).length;
  const averageRating = personEvaluations.length > 0
    ? personEvaluations.reduce((total, evaluation) => total + evaluation.stars, 0) / personEvaluations.length
    : null;
  const totalVolunteerMinutes = periodVolunteerRecords.reduce((total, record) => total + record.minutes, 0);

  const studentStats = [
    { label: t("admin.classesAttended"), value: String(personClasses.length), icon: BookOpen },
    { label: t("admin.hoursSpentLearning"), value: hoursLabel(personClasses.reduce((total, cls) => total + classMinutes(cls), 0)), icon: Clock },
    { label: t("admin.tutorsWorkedWith"), value: String(new Set(personClasses.map((cls) => cls.teacher_uid)).size), icon: Users },
    { label: t("admin.attendanceConfirmed"), value: String(attendedClasses), icon: UserCheck },
    { label: t("admin.attendanceRate"), value: percentLabel(attendedClasses, personClasses.length), icon: CheckCircle2 },
    { label: t("admin.assignmentsReceived"), value: String(personAssignments.length), icon: ClipboardList },
    { label: t("admin.assignmentsCompleted"), value: String(personAssignments.filter((assignment) => assignment.complete).length), icon: CheckCircle2 },
    { label: t("admin.evaluationsReceived"), value: String(personEvaluations.length), icon: Star },
    { label: t("admin.averageEvaluationRating"), value: averageRating === null ? "—" : `${averageRating.toFixed(1)} / 5`, icon: Star },
  ];
  const tutorStats = [
    { label: t("admin.studentsTutored"), value: String(new Set(personClasses.map((cls) => cls.student_uid)).size), icon: Users },
    { label: t("dashboard.totalHoursSpent"), value: hoursLabel(totalVolunteerMinutes), icon: Clock },
    { label: t("admin.classesTaught"), value: String(personClasses.length), icon: BookOpen },
    { label: t("admin.teachingHours"), value: hoursLabel(personClasses.reduce((total, cls) => total + classMinutes(cls), 0)), icon: Clock },
    { label: t("admin.attendanceConfirmed"), value: String(attendedClasses), icon: UserCheck },
    { label: t("admin.attendanceRate"), value: percentLabel(attendedClasses, personClasses.length), icon: CheckCircle2 },
    { label: t("admin.evaluationsCompleted"), value: String(evaluationCount), icon: Star },
    { label: t("admin.evaluationCompletionRate"), value: percentLabel(evaluationCount, personClasses.length), icon: CheckCircle2 },
    { label: t("admin.assignmentsAssigned"), value: String(personAssignments.length), icon: ClipboardList },
  ];
  const personStats = personType === "student" ? studentStats : tutorStats;

  useEffect(() => {
    let cancelled = false;

    async function loadIndividualQueryData() {
      setLoading(true);
      setError("");

      const [profilesResult, classesResult, volunteerResult, assignmentsResult, evaluationsResult, availabilityResult] = await Promise.all([
        supabase.from("profiles").select("uid, role, name, created_at, strikes, banned_at, banned_until, banned_count, approved").in("role", ["student", "tutor"]),
        supabase.from("classes").select("lesson_id, student_uid, teacher_uid, time, duration, status, recurring_lesson_id, evaluation_completed, student_attended, teacher_attended, description, student_wants_to_share"),
        supabase.from("volunteer_records").select("tutor_uid, uploaded_at, minutes, task_name"),
        supabase.from("assignments").select("assignment_id, lesson_id, student_uid, teacher_uid, name, description, due_date, complete, deleted"),
        supabase.from("evaluations").select("evaluation_id, lesson_id, stars, feedback, created_at, teacher_uid"),
        supabase.from("tutor_availability").select("*"),
      ]);

      if (cancelled) return;

      const firstError = profilesResult.error
        ?? classesResult.error
        ?? volunteerResult.error
        ?? assignmentsResult.error
        ?? evaluationsResult.error
        ?? availabilityResult.error;
      if (firstError) {
        setError(firstError.message);
        setLoading(false);
        return;
      }

      setProfiles((profilesResult.data ?? []) as ProfileRow[]);
      setClasses(((classesResult.data ?? []) as IndividualClassRow[]).filter((cls) => cls.status !== "cancelled"));
      setVolunteerRecords((volunteerResult.data ?? []) as VolunteerRecordRow[]);
      setAssignments((assignmentsResult.data ?? []) as AssignmentRow[]);
      setEvaluations((evaluationsResult.data ?? []) as EvaluationRow[]);
      setAvailability((availabilityResult.data ?? []) as TutorAvailabilityRow[]);
      setLoading(false);
    }

    void loadIndividualQueryData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setSelectedPersonUid((current) =>
      selectedOptions.some((option) => option.uid === current) ? current : selectedOptions[0]?.uid ?? ""
    );
  }, [selectedOptions]);

  const profileName = new Map(profiles.map((profile) => [profile.uid, profile.name]));
  const studentNoBooking: WeekStatus = { label: "admin.weekNoBooking", className: "bg-muted text-muted-foreground" };
  const studentBooked: WeekStatus = { label: "admin.weekBooked", className: "bg-blue-100 text-blue-800" };
  const studentMissed: WeekStatus = { label: "admin.weekMissed", className: "bg-red-100 text-red-800" };
  const studentAttended: WeekStatus = { label: "admin.weekAttended", className: "bg-emerald-100 text-emerald-800" };
  const studentLegend: WeekStatus[] = [
    studentNoBooking,
    studentBooked,
    studentMissed,
    studentAttended,
  ];
  const tutorNoAvailability: WeekStatus = { label: "admin.weekNoAvailability", className: "bg-muted text-muted-foreground" };
  const tutorAvailabilityOnly: WeekStatus = { label: "admin.weekAvailabilityOnly", className: "bg-violet-100 text-violet-800" };
  const tutorAvailabilityBooked: WeekStatus = { label: "admin.weekAvailabilityBooked", className: "bg-blue-100 text-blue-800" };
  const tutorMissed: WeekStatus = { label: "admin.weekTutorMissed", className: "bg-red-100 text-red-800" };
  const tutorTaught: WeekStatus = { label: "admin.weekTaught", className: "bg-emerald-100 text-emerald-800" };
  const tutorLegend: WeekStatus[] = [
    tutorNoAvailability,
    tutorAvailabilityOnly,
    tutorAvailabilityBooked,
    tutorMissed,
    tutorTaught,
  ];

  function statusForStudentWeekend(weekendKey: string): WeekStatus {
    const weekClasses = personAllClasses.filter((cls) => beijingWeekendKeyForInstant(classStartsAt(cls)) === weekendKey);
    if (weekClasses.length === 0) return studentNoBooking;
    const finished = weekClasses.filter((cls) => classEndsAt(cls) <= new Date());
    if (finished.some((cls) => cls.student_attended !== true)) return studentMissed;
    if (finished.length > 0) return studentAttended;
    return studentBooked;
  }

  function statusForTutorWeekend(weekendKey: string): WeekStatus {
    const weekClasses = personAllClasses.filter((cls) => beijingWeekendKeyForInstant(classStartsAt(cls)) === weekendKey);
    const filledAvailability = personAvailability.some((row) => row.weekend_date === weekendKey);
    const finished = weekClasses.filter((cls) => classEndsAt(cls) <= new Date());
    if (finished.some((cls) => cls.teacher_attended !== true)) return tutorMissed;
    if (finished.some((cls) => cls.teacher_attended === true)) return tutorTaught;
    if (filledAvailability && weekClasses.length > 0) return tutorAvailabilityBooked;
    if (filledAvailability) return tutorAvailabilityOnly;
    return tutorNoAvailability;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-foreground">{t("admin.individualQuery")}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{t("admin.individualQueryHelp")}</p>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1.2fr]">
          <CalendarInput label={t("common.startDate")} value={startDate} onChange={setStartDate} />
          <CalendarInput label={t("common.endDate")} value={endDate} onChange={setEndDate} />
          <div>
            <span className="text-sm text-card-foreground">{t("common.type")}</span>
            <div className="mt-2 flex h-11 rounded-xl bg-muted p-1">
              {(["student", "tutor"] as PersonType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setPersonType(type)}
                  className={`flex-1 rounded-lg text-sm transition-all ${
                    personType === type ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  {t(type === "student" ? "common.student" : "common.tutor")}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="text-sm text-card-foreground">{t("common.name")}</span>
            <div className="mt-2">
              <SelectPerson type={personType} value={selectedPersonUid} onChange={setSelectedPersonUid} options={selectedOptions} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.5fr)]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4">
            <h3 className="text-card-foreground">{selectedPerson?.name ?? t("admin.profileDetails")}</h3>
            {selectedPerson && (
              <p className="mt-1 text-sm text-muted-foreground">
                {t(selectedPerson.role === "student" ? "common.student" : "common.tutor")}
              </p>
            )}
          </div>
          <PersonProfileDetails person={selectedPerson} showAdministrativeFields />
          <ProfileAccountStatus profile={selectedProfile} />
        </div>

        <div className="grid gap-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-card-foreground">{t("admin.statistics")}</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {personStats.map((stat) => (
                <StatBox key={stat.label} label={stat.label} value={loading ? "..." : stat.value} icon={stat.icon} />
              ))}
            </div>
          </div>

          {selectedPerson && personType === "tutor" && (
            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-card-foreground">{t("admin.volunteerRecordHistory")}</h3>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{personVolunteerRecords.length}</span>
              </div>
              <div className="mt-4 max-h-80 overflow-y-auto rounded-xl border border-border bg-background">
                {personVolunteerRecords.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-muted-foreground">{t("common.none")}</p>
                ) : (
                  <div className="divide-y divide-border">
                    {[...personVolunteerRecords]
                      .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())
                      .map((record, index) => (
                        <div key={`${record.uploaded_at}-${index}`} className="flex h-16 items-center justify-between gap-4 px-4">
                          <div className="min-w-0">
                            <p className="truncate text-sm text-card-foreground" title={record.task_name || t("admin.volunteerWork")}>{record.task_name || t("admin.volunteerWork")}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{new Date(record.uploaded_at).toLocaleString(lang === "zh" ? "zh-CN" : "en-US", { dateStyle: "medium", timeStyle: "short" })}</p>
                          </div>
                          <p className="shrink-0 text-sm text-muted-foreground">{record.minutes} {t("common.minutes")}</p>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {selectedPerson && personType === "student" && (
            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-card-foreground">{t("admin.studentAssignmentHistory")}</h3>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{personAssignments.length}</span>
              </div>
              <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                {personAssignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("common.none")}</p>
                ) : (
                  [...personAssignments]
                    .sort((a, b) => b.due_date.localeCompare(a.due_date))
                    .map((assignment) => (
                      <article key={assignment.assignment_id} className="w-72 shrink-0 rounded-xl border border-border bg-background p-4">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm text-card-foreground">{assignment.name}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] ${assignment.deleted ? "bg-red-100 text-red-800" : assignment.complete ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                            {t(assignment.deleted ? "admin.deleted" : assignment.complete ? "admin.assignmentComplete" : "admin.assignmentIncomplete")}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">{t("admin.dueDateValue", { date: parseDate(assignment.due_date).toLocaleDateString(undefined, { dateStyle: "medium" }) })}</p>
                        <p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">{assignment.description}</p>
                        <p className="mt-3 text-xs text-muted-foreground">
                          {t("admin.assignedBy", { tutor: profileName.get(assignment.teacher_uid) ?? t("common.tutor") })}
                        </p>
                      </article>
                    ))
                )}
              </div>
            </section>
          )}
        </div>
      </section>

      {selectedPerson && (
        <>
          <WeeklyActivityCalendar
            title={t(personType === "student" ? "admin.studentWeeklyActivity" : "admin.tutorWeeklyActivity")}
            start={startDate}
            end={endDate}
            statusForWeekend={personType === "student" ? statusForStudentWeekend : statusForTutorWeekend}
            legend={personType === "student" ? studentLegend : tutorLegend}
          />

          {personType === "tutor" && (
            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-card-foreground">{t("admin.tutorAssignmentHistory")}</h3>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{personAssignments.length}</span>
              </div>
              <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                {personAssignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("common.none")}</p>
                ) : (
                  [...personAssignments]
                    .sort((a, b) => b.due_date.localeCompare(a.due_date))
                    .map((assignment) => (
                      <article key={assignment.assignment_id} className="w-72 shrink-0 rounded-xl border border-border bg-background p-4">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm text-card-foreground">{assignment.name}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] ${assignment.deleted ? "bg-red-100 text-red-800" : assignment.complete ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                            {t(assignment.deleted ? "admin.deleted" : assignment.complete ? "admin.assignmentComplete" : "admin.assignmentIncomplete")}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">{t("admin.dueDateValue", { date: parseDate(assignment.due_date).toLocaleDateString(undefined, { dateStyle: "medium" }) })}</p>
                        <p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">{assignment.description}</p>
                        <p className="mt-3 text-xs text-muted-foreground">
                          {t("admin.assignedTo", { student: profileName.get(assignment.student_uid) ?? t("common.student") })}
                        </p>
                      </article>
                    ))
                )}
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-card-foreground">{t(personType === "student" ? "admin.studentClassHistory" : "admin.tutorClassHistory")}</h3>
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{personAllClasses.length}</span>
            </div>
            <div className="mt-4 grid gap-3 xl:grid-cols-2">
              {personAllClasses.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("common.none")}</p>
              ) : (
                [...personAllClasses]
                  .sort((a, b) => classStartsAt(b).getTime() - classStartsAt(a).getTime())
                  .map((cls) => (
                    <AdminClassCard
                      key={cls.lesson_id}
                      cls={cls}
                      names={profileName}
                      evaluation={personEvaluations.find((evaluation) => evaluation.lesson_id === cls.lesson_id)}
                    />
                  ))
              )}
            </div>
          </section>

          {personType === "tutor" && (
            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-card-foreground">{t("admin.availabilityHistory")}</h3>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{personAvailability.length}</span>
              </div>

              <div className="mt-4 grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center rounded-2xl border border-border bg-background p-2">
                <button
                  type="button"
                  onClick={() => setAvailabilityWeekendDate((current) => shiftCalendarDate(current, -7))}
                  aria-label={t("schedule.previousWeekend")}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-card-foreground"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="min-w-0 text-center">
                  <p className="text-sm font-medium text-card-foreground">{t("schedule.weekend")}</p>
                  <p className="truncate text-xs text-muted-foreground">{availabilityWeekendRange(availabilityWeekendDate, lang)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAvailabilityWeekendDate((current) => shiftCalendarDate(current, 7))}
                  aria-label={t("schedule.nextWeekend")}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-card-foreground"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              <div className="mt-5">
                {selectedAvailability ? (
                  <TutorAvailabilityViewer weekendDate={availabilityWeekendDate} availabilityRow={selectedAvailability} />
                ) : (
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-background p-5">
                    <p className="text-sm text-muted-foreground">{t("admin.noAvailabilityHere")}</p>
                    <CalendarDays size={28} className="shrink-0 text-primary" />
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

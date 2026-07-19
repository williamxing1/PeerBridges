"use client";

import { useEffect, useState } from "react";
import * as Select from "@radix-ui/react-select";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronDown, ChevronLeft, ChevronRight, X, CalendarDays, Clock, User, CheckCircle2 } from "lucide-react";
import { supabase } from "../../lib/supabase/client";
import { useLanguage } from "../i18n";
import { beijingCalendarToday, beijingMidnightInstant, calendarDateValue, formatLocalDeadline } from "../lib/weekend";
import { emptyStrikeStatus, isLateCancellation, refreshStrikeStatus } from "../lib/strikes";
import { dispatchReminderEmails } from "../lib/reminderEmails";

// ─── DATA ─────────────────────────────────────────────────────────────────────

function getWeekendDates(offset = 0) {
  const today = beijingCalendarToday();
  const dayOfWeek = today.getDay();
  const afterStudentCutoff = dayOfWeek === 6 || dayOfWeek === 0;
  const daysUntilSat = (6 - dayOfWeek + 7) % 7 || 7;
  const sat = new Date(today);
  sat.setDate(today.getDate() + daysUntilSat + offset * 7);
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  return { sat, sun, afterStudentCutoff };
}

const SLOT_TIMES = [
  "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM",
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM",
];

const SLOT_ENDS = [
  "7:30 AM", "8:00 AM", "8:30 AM", "9:00 AM",
  "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM",
  "11:30 AM", "12:00 PM",
];

const SLOT_COLUMN_SUFFIXES = ["700", "730", "800", "830", "900", "930", "1000", "1030", "1100", "1130"];
const AVAILABILITY_COLUMNS = (["sat", "sun"] as Day[]).flatMap((day) =>
  SLOT_COLUMN_SUFFIXES.map((suffix) => `${day}_${suffix}`)
);
const storedUserKey = "tutorflow-user";
const MAX_STUDENT_CLASSES_PER_WEEKEND = 1;

function formatDate(d: Date, lang: string = "en") {
  return d.toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US", { weekday: "long", month: "long", day: "numeric" });
}

function parseSlotTime(time: string) {
  const [hourPart, minutePart, period] = time.match(/(\d+):(\d+) (AM|PM)/)?.slice(1) ?? [];
  let hours = Number(hourPart);
  const minutes = Number(minutePart);

  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  return { hours, minutes };
}

function beijingSlotInstant(date: Date, slotIdx: number, ends = false) {
  const { hours, minutes } = parseSlotTime(ends ? SLOT_ENDS[slotIdx] : SLOT_TIMES[slotIdx]);
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), hours - 8, minutes, 0));
}

function formatLocalTime(date: Date, lang: string) {
  return date.toLocaleTimeString(lang === "zh" ? "zh-CN" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatLocalSlotRange(date: Date, slotIdx: number, lang: string) {
  return `${formatLocalTime(beijingSlotInstant(date, slotIdx), lang)} - ${formatLocalTime(beijingSlotInstant(date, slotIdx, true), lang)}`;
}

function formatLocalInstantRange(start: Date, duration: number, lang: string) {
  const end = new Date(start.getTime() + duration * 60000);
  return `${formatLocalTime(start, lang)} - ${formatLocalTime(end, lang)}`;
}

function formatLocalSlotDate(date: Date, lang: string) {
  return formatDate(beijingSlotInstant(date, 0), lang);
}

function currentTimeZoneLabel() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "local time";
}

function availabilityColumn(day: Day, slotIdx: number) {
  return `${day}_${SLOT_COLUMN_SUFFIXES[slotIdx]}`;
}

function slotKey(day: Day, slotIdx: number) {
  return `${day}-${slotIdx}`;
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

function profileAvailability(profile: TutorAvailabilityRow): Availability {
  return {
    sat: SLOT_TIMES.map((_, idx) => idx).filter((idx) => profile[availabilityColumn("sat", idx)] !== false),
    sun: SLOT_TIMES.map((_, idx) => idx).filter((idx) => profile[availabilityColumn("sun", idx)] !== false),
  };
}

function BlankAvatar({ size = 40 }: { size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <User size={Math.max(14, Math.round(size * 0.45))} />
    </span>
  );
}

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Day = "sat" | "sun";
interface Selection { day: Day; slots: number[] }
type Availability = Record<Day, number[]>;
type StoredUser = { uid: string };
type TutorProfileRow = {
  uid: string;
  grade: string;
  meeting_password: string;
};
type TutorAvailabilityRow = {
  tutor_uid: string;
  weekend_date: string;
} & Record<string, boolean | string>;
type ProfileRow = {
  uid: string;
  name: string;
  student_wechat_id: string | null;
  parent_wechat_id: string | null;
  student_email: string | null;
  parent_email: string | null;
  preferred_communication: "wechat" | "email" | null;
};
type ClassRow = {
  lesson_id: string;
  student_uid?: string;
  teacher_uid: string;
  time: string;
    duration: number;
    status?: string | null;
  };
type ScheduleOccupancyRow = {
  slot_time: string;
  slot_duration: number;
  lesson_id: string | null;
  recurring_lesson_id: string | null;
  is_caller_class: boolean;
};
type StudentBooking = {
  tutor: string;
  date: string;
  time: string;
  startsAt: string;
  duration: number;
  lessonId: string | null;
  recurringLessonId: string | null;
};
type TutorOption = {
  id: string;
  name: string;
  grade: string;
  meetingPassword: string;
  tutorWechatId: string | null;
  parentWechatId: string | null;
  tutorEmail: string | null;
  parentEmail: string | null;
  preferredCommunication: "wechat" | "email" | null;
  availability: Availability;
  booked: Availability;
};
type PastTeacher = {
  uid: string;
  name: string;
  count: number;
};
type BookingResult = {
  success: boolean;
  conflicts?: string[];
};

function classEndsAt(cls: ClassRow) {
  return new Date(new Date(cls.time).getTime() + cls.duration * 60000);
}

function slotIndexForInstant(date: Date, instant: Date) {
  return Math.round((instant.getTime() - beijingSlotInstant(date, 0).getTime()) / 1800000);
}

function removeBookedSlots(
  availability: Availability,
  bookedClasses: ClassRow[],
  weekendDates: { sat: Date; sun: Date }
) {
  const next: Availability = {
    sat: [...availability.sat],
    sun: [...availability.sun],
  };

  bookedClasses.forEach((cls) => {
    if (cls.status === "cancelled") return;

    const startsAt = new Date(cls.time);
    const sunStart = beijingSlotInstant(weekendDates.sun, 0);
    const day: Day = startsAt < sunStart ? "sat" : "sun";
    const dayDate = day === "sat" ? weekendDates.sat : weekendDates.sun;
    const startIdx = slotIndexForInstant(dayDate, startsAt);
    const slots = cls.duration / 30;

    for (let offset = 0; offset < slots; offset += 1) {
      const slotIdx = startIdx + offset;
      if (Number.isInteger(slotIdx) && slotIdx >= 0 && slotIdx < SLOT_TIMES.length) {
        next[day] = next[day].filter((idx) => idx !== slotIdx);
      }
    }
  });

  return next;
}

function occupancySlots(
  rows: ScheduleOccupancyRow[],
  weekendDates: { sat: Date; sun: Date },
  callerOnly = false
): Availability {
  const occupied: Availability = { sat: [], sun: [] };

  rows.forEach((row) => {
    if (callerOnly && !row.is_caller_class) return;

    const startsAt = new Date(row.slot_time);
    const sunStart = beijingSlotInstant(weekendDates.sun, 0);
    const day: Day = startsAt < sunStart ? "sat" : "sun";
    const dayDate = day === "sat" ? weekendDates.sat : weekendDates.sun;
    const startIdx = slotIndexForInstant(dayDate, startsAt);

    for (let offset = 0; offset < row.slot_duration / 30; offset += 1) {
      const slotIdx = startIdx + offset;
      if (Number.isInteger(slotIdx) && slotIdx >= 0 && slotIdx < SLOT_TIMES.length) {
        occupied[day].push(slotIdx);
      }
    }
  });

  return {
    sat: Array.from(new Set(occupied.sat)),
    sun: Array.from(new Set(occupied.sun)),
  };
}

// ─── SLOT BUTTON ──────────────────────────────────────────────────────────────

function SlotButton({
  slotIdx,
  day,
  date,
  available,
  booked,
  selection,
  onSelect,
  onBookedClick,
}: {
  slotIdx: number;
  day: Day;
  date: Date;
  available: boolean;
  booked: boolean;
  selection: Selection | null;
  onSelect: (day: Day, slotIdx: number) => void;
  onBookedClick: (day: Day, slotIdx: number) => void;
}) {
  const { lang, t } = useLanguage();
  const isSelected =
    selection?.day === day && selection.slots.includes(slotIdx);
  const isFirstSelected =
    selection?.day === day && selection.slots[0] === slotIdx;
  const isLastSelected =
    selection?.day === day && selection.slots[selection.slots.length - 1] === slotIdx;
  const isTwoSlot = isSelected && selection!.slots.length === 2;

  let stateClass = "";
  if (booked) {
    stateClass = "bg-emerald-50 text-emerald-900 cursor-pointer border-emerald-200 hover:border-emerald-300";
  } else if (!available) {
    stateClass = "bg-muted/50 text-muted-foreground/40 cursor-not-allowed border-transparent";
  } else if (isSelected) {
    stateClass = "bg-primary text-primary-foreground border-primary cursor-pointer";
  } else {
    stateClass = "bg-card text-card-foreground border-border hover:border-primary/40 hover:bg-accent cursor-pointer";
  }

  // Merge top/bottom borders for consecutive selected slots
  const topRadius = !isSelected || isFirstSelected || !isTwoSlot ? "rounded-t-lg" : "rounded-t-none";
  const bottomRadius = !isSelected || isLastSelected || !isTwoSlot ? "rounded-b-lg" : "rounded-b-none";
  const marginClass =
    isSelected && !isFirstSelected && isTwoSlot ? "-mt-px" : "";

  return (
    <button
      disabled={!available && !booked}
      onClick={() => {
        if (booked) {
          onBookedClick(day, slotIdx);
        } else if (available) {
          onSelect(day, slotIdx);
        }
      }}
      className={`w-full border text-xs px-3 py-2.5 transition-all flex items-center justify-between ${stateClass} ${topRadius} ${bottomRadius} ${marginClass}`}
    >
      <span>{formatLocalSlotRange(date, slotIdx, lang)}</span>
      {booked && (
        <span className="text-[10px] opacity-80">{t("common.booked")}</span>
      )}
      {available && !isSelected && (
        <span className="opacity-40 text-[10px]">{t("common.available")}</span>
      )}
      {!booked && isSelected && isFirstSelected && !isTwoSlot && (
        <span className="text-[10px] opacity-80">{t("common.thirtyMinutesShort")}</span>
      )}
      {!booked && isSelected && isLastSelected && isTwoSlot && (
        <span className="text-[10px] opacity-80">{t("common.oneHourShort")}</span>
      )}
    </button>
  );
}

// ─── DAY COLUMN ───────────────────────────────────────────────────────────────

function DayColumn({
  day,
  date,
  availability,
  booked,
  selection,
  onSelect,
  onBookedClick,
}: {
  day: Day;
  date: Date;
  availability: number[];
  booked: number[];
  selection: Selection | null;
  onSelect: (day: Day, slotIdx: number) => void;
  onBookedClick: (day: Day, slotIdx: number) => void;
}) {
  const { lang, t } = useLanguage();
  const timeZone = currentTimeZoneLabel();
  return (
    <div className="flex flex-col gap-1.5">
      <div className="mb-2">
        <p className="text-card-foreground text-sm">{formatLocalSlotDate(date, lang)}</p>
        <p className="text-xs text-muted-foreground">{day === "sat" ? t("common.saturday") : t("common.sunday")} · {timeZone}</p>
      </div>
      {SLOT_TIMES.map((_, idx) => (
        <SlotButton
          key={idx}
          slotIdx={idx}
          day={day}
          date={date}
          available={availability.includes(idx)}
          booked={booked.includes(idx)}
          selection={selection}
          onSelect={onSelect}
          onBookedClick={onBookedClick}
        />
      ))}
    </div>
  );
}

// ─── BOOKING PANEL ────────────────────────────────────────────────────────────

function RecurringConflictDialog({
  conflicts,
  lang,
  saving,
  onCancel,
  onConfirm,
}: {
  conflicts: string[];
  lang: string;
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useLanguage();
  return (
    <Dialog.Root open={conflicts.length > 0} onOpenChange={(open) => !open && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl">
          <Dialog.Title className="text-card-foreground">
            {t("schedule.recurringConflictsTitle")}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("schedule.recurringConflictsHelp")}
          </Dialog.Description>
          <ul className="mt-4 max-h-52 space-y-2 overflow-y-auto rounded-xl bg-muted p-3 text-sm text-card-foreground">
            {conflicts.map((conflict) => (
              <li key={conflict}>
                {new Date(conflict).toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">
            {t("schedule.recurringConflictsSkipped")}
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="rounded-xl border border-border px-4 py-2 text-sm text-card-foreground transition-colors hover:bg-accent disabled:opacity-50"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={saving}
              className="rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? t("common.booking") : t("schedule.bookRecurringAnyway")}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function BookedClassPanel({
  booking,
  onClose,
  onCancel,
}: {
  booking: StudentBooking;
  onClose: () => void;
  onCancel: () => void;
}) {
  const { t } = useLanguage();
  const isPast = new Date(booking.startsAt) <= new Date();

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
        <p className="text-sm text-card-foreground">{t("schedule.bookedSession")}</p>
        <button
          onClick={onClose}
          className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted"
        >
          <X size={15} />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
        <div className="flex items-center gap-3 rounded-xl bg-muted p-3.5">
          <BlankAvatar size={40} />
          <div>
            <p className="text-sm text-card-foreground">{booking.tutor}</p>
            <p className="text-xs text-muted-foreground">{t("common.tutor")}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {t("schedule.sessionDetails")}
          </p>
          <div className="flex items-center gap-2.5 text-sm text-card-foreground">
            <CalendarDays size={15} className="shrink-0 text-muted-foreground" />
            <span>{booking.date}</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm text-card-foreground">
            <Clock size={15} className="shrink-0 text-muted-foreground" />
            <span>{booking.time}</span>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-border px-5 py-4">
        <button
          onClick={onCancel}
          disabled={isPast}
          className="w-full rounded-xl border border-border bg-card py-3 text-sm text-card-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("dashboard.cancelClass")}
        </button>
      </div>
    </div>
  );
}

function CancelBookedClassDialog({
  booking,
  cancelling,
  onClose,
  onConfirm,
}: {
  booking: StudentBooking | null;
  cancelling: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { t } = useLanguage();

  return (
    <Dialog.Root open={booking !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-card-foreground">
                {t("schedule.cancelBookedClass")}
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t("schedule.cancelStudentBookedClassHelp", { tutor: booking?.tutor ?? "" })}
              </Dialog.Description>
              {isLateCancellation(booking?.startsAt, "student") && (
                <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {t("strikes.lateCancellationWarning")}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              disabled={cancelling}
              className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              <X size={15} />
            </button>
          </div>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              onClick={onClose}
              disabled={cancelling}
              className="rounded-xl border border-border bg-card px-4 py-2 text-sm text-card-foreground transition-colors hover:bg-accent disabled:opacity-50"
            >
              {t("common.no")}
            </button>
            <button
              onClick={onConfirm}
              disabled={cancelling}
              className="rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {cancelling ? t("common.saving") : t("common.confirm")}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function BookingPanel({
  selection,
  tutor,
  weekendDates,
  onClose,
  onConfirm,
  lang,
}: {
  selection: Selection;
  tutor: TutorOption;
  weekendDates: { sat: Date; sun: Date };
  onClose: () => void;
  onConfirm: (recurring: boolean, note: string, conflictsConfirmed?: boolean) => Promise<BookingResult>;
  lang: string;
}) {
  const { t } = useLanguage();
  const [note, setNote] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recurringConflicts, setRecurringConflicts] = useState<string[]>([]);

  const date = weekendDates[selection.day];
  const startSlot = selection.slots[0];
  const endSlot = selection.slots[selection.slots.length - 1];
  const duration = selection.slots.length === 2 ? t("common.oneHour") : t("common.thirtyMinutes");
  const timeRange = `${formatLocalTime(beijingSlotInstant(date, startSlot), lang)} – ${formatLocalTime(beijingSlotInstant(date, endSlot, true), lang)}`;
  const dateLabel = formatLocalSlotDate(date, lang);
  const preferredCommunication = tutor.preferredCommunication
    ? t(`auth.preferredCommunication.${tutor.preferredCommunication}` as
      | "auth.preferredCommunication.wechat"
      | "auth.preferredCommunication.email")
    : t("common.none");
  const tutorContactDetails = [
    tutor.tutorWechatId && tutor.parentWechatId
      ? {
          label: t("auth.wechatIds"),
          value: t("auth.tutorAndParentContactValues", {
            tutor: tutor.tutorWechatId,
            parent: tutor.parentWechatId,
          }),
        }
      : tutor.tutorWechatId
        ? { label: t("auth.tutorWechatId"), value: tutor.tutorWechatId }
        : tutor.parentWechatId
          ? { label: t("auth.parentWechatId"), value: tutor.parentWechatId }
          : null,
    tutor.tutorEmail && tutor.parentEmail
      ? {
          label: t("auth.communicationEmails"),
          value: t("auth.tutorAndParentContactValues", {
            tutor: tutor.tutorEmail,
            parent: tutor.parentEmail,
          }),
        }
      : tutor.tutorEmail
        ? { label: t("auth.tutorCommunicationEmail"), value: tutor.tutorEmail }
        : tutor.parentEmail
          ? { label: t("auth.parentCommunicationEmail"), value: tutor.parentEmail }
          : null,
  ].filter((detail): detail is { label: string; value: string } => detail !== null);

  if (confirmed) {
    return (
      <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/45 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[60] max-h-[90vh] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-2xl sm:p-6">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-card-foreground"
              aria-label={t("common.close")}
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-3 pr-10">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-100">
                <CheckCircle2 size={24} className="text-emerald-600" />
              </span>
              <div>
                <Dialog.Title className="text-lg text-card-foreground">
                  {t(recurring ? "schedule.recurringClassBooked" : "schedule.sessionBooked")}
                </Dialog.Title>
                <p className="text-sm text-muted-foreground">
                  {t(recurring ? "schedule.recurringBookedFor" : "schedule.bookedFor", {
                    date: dateLabel,
                    time: timeRange,
                  })}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 rounded-xl border border-border bg-background p-4 text-sm">
              <p><span className="font-medium">{t("common.tutor")}:</span> {tutor.name}</p>
              <p><span className="font-medium">{t("schedule.myNote")}:</span> {note.trim() || t("common.none")}</p>
              <p><span className="font-medium">{t("auth.classPassword")}:</span> {tutor.meetingPassword || t("common.none")}</p>
              {tutorContactDetails.map((detail) => (
                <p key={detail.label}><span className="font-medium">{detail.label}:</span> {detail.value}</p>
              ))}
              <p><span className="font-medium">{t("auth.preferredCommunication")}:</span> {preferredCommunication}</p>
            </div>

            <Dialog.Description className="mt-4 rounded-xl bg-muted px-4 py-3 text-sm leading-relaxed text-muted-foreground">
              {t("schedule.bookingConfirmationHelp")}
            </Dialog.Description>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-xl bg-primary px-5 py-2.5 text-sm text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {t("common.close")}
            </button>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  return (
    <>
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
        <p className="text-card-foreground text-sm">
          {t("schedule.confirmBooking")}
        </p>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground cursor-pointer transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
        {/* Tutor */}
        <div className="flex items-center gap-3 p-3.5 bg-muted rounded-xl">
          <BlankAvatar size={40} />
          <div>
            <p className="text-sm text-card-foreground">{tutor.name}</p>
          </div>
        </div>

        {/* Session details */}
        <div className="flex flex-col gap-2.5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {t("schedule.sessionDetails")}
          </p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2.5 text-sm text-card-foreground">
              <CalendarDays size={15} className="text-muted-foreground shrink-0" />
              <span>{dateLabel}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-card-foreground">
              <Clock size={15} className="text-muted-foreground shrink-0" />
              <span>{timeRange}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-card-foreground">
              <User size={15} className="text-muted-foreground shrink-0" />
              <span>
                {t("common.duration")}
                <span className="text-primary">{duration}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-muted-foreground uppercase tracking-wide">
            {t("schedule.sharePrompt")}
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={2000}
            placeholder={
              t("schedule.sharePlaceholder")
            }
            rows={4}
            className="w-full bg-muted rounded-xl px-3.5 py-3 text-sm text-card-foreground placeholder:text-muted-foreground resize-none outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background p-3.5">
          <input
            type="checkbox"
            checked={recurring}
            onChange={(event) => setRecurring(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border text-primary"
          />
          <span>
            <span className="block text-sm text-card-foreground">{t("schedule.recurringClass")}</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
              {t("schedule.recurringClassHelp")}
            </span>
          </span>
        </label>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border shrink-0">
        <button
          onClick={async () => {
            setSaving(true);
            const result = await onConfirm(recurring, note);
            setSaving(false);
            if (result.conflicts?.length) {
              setRecurringConflicts(result.conflicts);
            } else if (result.success) {
              setConfirmed(true);
            }
          }}
          disabled={saving}
          className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm hover:bg-primary/90 transition-colors cursor-pointer shadow-sm"
        >
          {saving ? t("common.booking") : t("schedule.confirmBooking")}
        </button>
        <p className="text-center text-xs text-muted-foreground mt-2.5">
          {t("schedule.notifyTutor")}
        </p>
      </div>
    </div>
    <RecurringConflictDialog
      conflicts={recurringConflicts}
      lang={lang}
      saving={saving}
      onCancel={() => setRecurringConflicts([])}
      onConfirm={async () => {
        setSaving(true);
        const result = await onConfirm(true, note, true);
        setSaving(false);
        if (result.success) {
          setRecurringConflicts([]);
          setConfirmed(true);
        }
      }}
    />
    </>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export function StudentSchedulePage({ lang }: { lang: string }) {
  const { t } = useLanguage();
  const [selectedTutorId, setSelectedTutorId] = useState<string>("");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [tutors, setTutors] = useState<TutorOption[]>([]);
  const [pastTeachers, setPastTeachers] = useState<PastTeacher[]>([]);
  const [studentUid, setStudentUid] = useState("");
  const [loading, setLoading] = useState(true);
  const [weekendLoading, setWeekendLoading] = useState(false);
  const [weekendOffset, setWeekendOffset] = useState(0);
  const [availabilitySubmitted, setAvailabilitySubmitted] = useState(false);
  const [remainingClasses, setRemainingClasses] = useState(MAX_STUDENT_CLASSES_PER_WEEKEND);
  const [strikeStatus, setStrikeStatus] = useState(emptyStrikeStatus);
  const [bookings, setBookings] = useState<Record<string, StudentBooking>>({});
  const [selectedBookingKey, setSelectedBookingKey] = useState<string | null>(null);
  const [pendingCancellation, setPendingCancellation] = useState<StudentBooking | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [weekendReload, setWeekendReload] = useState(0);
  const [error, setError] = useState("");

  const tutor = tutors.find((t) => t.id === selectedTutorId) ?? null;
  const weekendDates = getWeekendDates(weekendOffset);
  const bookingDeadline = formatLocalDeadline(beijingMidnightInstant(weekendDates.sat), lang);
  const selectedBooking = selectedBookingKey ? bookings[selectedBookingKey] : null;
  const panelOpen = (selection !== null && tutor !== null) || selectedBooking !== null;

  async function getStudentUid() {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? readStoredUser()?.uid;
  }

  useEffect(() => {
    let cancelled = false;

    async function loadScheduleData() {
      setLoading(true);
      setError("");

      const uid = await getStudentUid();
      if (!uid) {
        if (!cancelled) {
          setError(t("common.noStudentUid"));
          setLoading(false);
        }
        return;
      }

      setStudentUid(uid);

      const [strikeStatusResult, tutorProfilesResult, classRowsResult] = await Promise.all([
        refreshStrikeStatus(),
        supabase
          .from("tutor_profiles")
          .select("uid, grade, meeting_password"),
        supabase
          .from("classes")
          .select("lesson_id, student_uid, teacher_uid, time, duration, status")
          .eq("student_uid", uid)
          .or("status.is.null,status.neq.cancelled"),
      ]);
      const { status, error: strikeStatusError } = strikeStatusResult;
      if (strikeStatusError) {
        if (!cancelled) {
          setError(strikeStatusError.message);
          setLoading(false);
        }
        return;
      }
      if (!cancelled) setStrikeStatus(status);

      if (tutorProfilesResult.error) {
        if (!cancelled) {
          setError(tutorProfilesResult.error.message);
          setLoading(false);
        }
        return;
      }

      if (classRowsResult.error) {
        if (!cancelled) {
          setError(classRowsResult.error.message);
          setLoading(false);
        }
        return;
      }

      const tutorProfileRows = (tutorProfilesResult.data ?? []) as TutorProfileRow[];
      const tutorUids = tutorProfileRows.map((profile) => profile.uid);
      const profileNames = new Map<string, string>();
      const profileContacts = new Map<string, ProfileRow>();

      if (tutorUids.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("uid, name, student_wechat_id, parent_wechat_id, student_email, parent_email, preferred_communication")
          .in("uid", tutorUids);

        if (profileError) {
          if (!cancelled) {
            setError(profileError.message);
            setLoading(false);
          }
          return;
        }

        ((profiles ?? []) as ProfileRow[]).forEach((profile) => {
          profileNames.set(profile.uid, profile.name);
          profileContacts.set(profile.uid, profile);
        });
      }

      const completedClasses = ((classRowsResult.data ?? []) as ClassRow[])
        .filter((cls) => classEndsAt(cls) < new Date());
      const teacherCounts = new Map<string, number>();
      completedClasses.forEach((cls) => {
        teacherCounts.set(cls.teacher_uid, (teacherCounts.get(cls.teacher_uid) ?? 0) + 1);
      });
      const pastTeacherUids = Array.from(teacherCounts.keys()).filter((teacherUid) => !profileNames.has(teacherUid));

      if (pastTeacherUids.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("uid, name")
          .in("uid", pastTeacherUids)
          .neq("role", "deleted");

        if (profileError) {
          if (!cancelled) {
            setError(profileError.message);
            setLoading(false);
          }
          return;
        }

        ((profiles ?? []) as ProfileRow[]).forEach((profile) => {
          profileNames.set(profile.uid, profile.name);
        });
      }

      if (!cancelled) {
        setTutors(tutorProfileRows
          .filter((profile) => profileNames.get(profile.uid) !== "Tutor Test")
          .map((profile) => ({
            id: profile.uid,
            name: profileNames.get(profile.uid) ?? t("common.tutor"),
            grade: profile.grade,
            meetingPassword: profile.meeting_password,
            tutorWechatId: profileContacts.get(profile.uid)?.student_wechat_id ?? null,
            parentWechatId: profileContacts.get(profile.uid)?.parent_wechat_id ?? null,
            tutorEmail: profileContacts.get(profile.uid)?.student_email ?? null,
            parentEmail: profileContacts.get(profile.uid)?.parent_email ?? null,
            preferredCommunication: profileContacts.get(profile.uid)?.preferred_communication ?? null,
            availability: { sat: [], sun: [] },
            booked: { sat: [], sun: [] },
          })));
        setPastTeachers(Array.from(teacherCounts.entries())
          .filter(([uid]) => profileNames.has(uid) && profileNames.get(uid) !== "Tutor Test")
          .map(([uid, count]) => ({ uid, count, name: profileNames.get(uid) ?? t("common.tutor") }))
          .sort((a, b) => b.count - a.count));
        setLoading(false);
      }
    }

    loadScheduleData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadTutorWeekend() {
      setSelection(null);
      setAvailabilitySubmitted(false);

      if (!selectedTutorId) {
        setRemainingClasses(MAX_STUDENT_CLASSES_PER_WEEKEND);
        setBookings({});
        setSelectedBookingKey(null);
        setWeekendLoading(false);
        return;
      }

      setWeekendLoading(true);
      setError("");

      const selectedWeekendDates = getWeekendDates(weekendOffset);
      const availabilitySelect = ["tutor_uid", "weekend_date", ...AVAILABILITY_COLUMNS].join(", ");
      const [
        { data: availabilityRow, error: availabilityError },
        { data: occupancyRows, error: occupancyError },
      ] = await Promise.all([
        supabase
          .from("tutor_availability")
          .select(availabilitySelect)
          .eq("tutor_uid", selectedTutorId)
          .eq("weekend_date", calendarDateValue(selectedWeekendDates.sat))
          .maybeSingle(),
        supabase.rpc("get_weekend_schedule_occupancy", {
          p_teacher_uid: selectedTutorId,
          p_weekend_date: calendarDateValue(selectedWeekendDates.sat),
        }),
      ]);

      if (availabilityError || occupancyError) {
        if (!cancelled) {
          setError(availabilityError?.message ?? occupancyError?.message ?? "");
          setWeekendLoading(false);
        }
        return;
      }

      const occupancy = (occupancyRows ?? []) as ScheduleOccupancyRow[];
      const remaining = Math.max(
        0,
        MAX_STUDENT_CLASSES_PER_WEEKEND - occupancy.filter((row) => row.is_caller_class).length
      );
      const availableAfterBookings = availabilityRow
        ? removeBookedSlots(
            profileAvailability(availabilityRow as unknown as TutorAvailabilityRow),
            occupancy.map((row) => ({
              lesson_id: "",
              teacher_uid: selectedTutorId,
              time: row.slot_time,
              duration: row.slot_duration,
            })),
            selectedWeekendDates
          )
        : { sat: [], sun: [] };
      const nextAvailability = remaining === 0
        ? { sat: [], sun: [] }
        : availableAfterBookings;
      const nextBooked = occupancySlots(occupancy, selectedWeekendDates, true);
      const nextBookings: Record<string, StudentBooking> = {};
      occupancy.filter((row) => row.is_caller_class).forEach((row) => {
        const startsAt = new Date(row.slot_time);
        const sunStart = beijingSlotInstant(selectedWeekendDates.sun, 0);
        const day: Day = startsAt < sunStart ? "sat" : "sun";
        const dayDate = day === "sat" ? selectedWeekendDates.sat : selectedWeekendDates.sun;
        const startIdx = slotIndexForInstant(dayDate, startsAt);
        const booking: StudentBooking = {
          tutor: tutors.find((item) => item.id === selectedTutorId)?.name ?? t("common.tutor"),
          date: formatLocalSlotDate(dayDate, lang),
          time: formatLocalInstantRange(startsAt, row.slot_duration, lang),
          startsAt: row.slot_time,
          duration: row.slot_duration,
          lessonId: row.lesson_id,
          recurringLessonId: row.recurring_lesson_id,
        };

        for (let offset = 0; offset < row.slot_duration / 30; offset += 1) {
          const slotIdx = startIdx + offset;
          if (Number.isInteger(slotIdx) && slotIdx >= 0 && slotIdx < SLOT_TIMES.length) {
            nextBookings[slotKey(day, slotIdx)] = booking;
          }
        }
      });

      if (!cancelled) {
        setTutors((current) =>
          current.map((item) =>
            item.id === selectedTutorId
              ? { ...item, availability: nextAvailability, booked: nextBooked }
              : item
          )
        );
        setAvailabilitySubmitted(Boolean(availabilityRow));
        setRemainingClasses(remaining);
        setBookings(nextBookings);
        setSelectedBookingKey(null);
        setPendingCancellation(null);
        setWeekendLoading(false);
      }
    }

    void loadTutorWeekend();

    return () => {
      cancelled = true;
    };
  }, [selectedTutorId, weekendOffset, studentUid, weekendReload, lang, t]);

  function handleSlotClick(day: Day, slotIdx: number) {
    if (strikeStatus.isBanned) return;

    if (!selection || selection.day !== day) {
      // Fresh selection on this day
      setSelection({ day, slots: [slotIdx] });
      return;
    }
    const { slots } = selection;
    if (slots.length === 1) {
      const existing = slots[0];
      if (slotIdx === existing + 1) {
        // Extend to 2 consecutive slots
        setSelection({ day, slots: [existing, slotIdx] });
      } else if (slotIdx === existing) {
        // Deselect
        setSelection(null);
      } else {
        // Jump to new slot
        setSelection({ day, slots: [slotIdx] });
      }
    } else {
      // Already 2 slots — restart
      setSelection({ day, slots: [slotIdx] });
    }
  }

  function handleBookedSlotClick(day: Day, slotIdx: number) {
    const key = slotKey(day, slotIdx);
    if (!bookings[key]) return;
    setSelection(null);
    setSelectedBookingKey(key);
  }

  function handleChangeTutor(id: string) {
    setSelectedTutorId(id);
    setWeekendOffset(0);
    setSelection(null);
    setSelectedBookingKey(null);
  }

  function moveToWeekend(offset: number) {
    setWeekendOffset(offset);
    setSelection(null);
    setSelectedBookingKey(null);
  }

  async function confirmCancellation() {
    if (!pendingCancellation) return;

    setCancelling(true);
    setError("");

    const { error: cancelError } = pendingCancellation.recurringLessonId
      ? await supabase.rpc("secure_cancel_recurring_occurrence", {
          p_recurring_lesson_id: pendingCancellation.recurringLessonId,
          p_time: pendingCancellation.startsAt,
        })
      : pendingCancellation.lessonId
        ? await supabase.rpc("secure_cancel_class", {
            p_lesson_id: pendingCancellation.lessonId,
            p_series: false,
          })
        : { error: new Error("Class could not be identified") };

    if (cancelError) {
      setError(cancelError.message);
      setCancelling(false);
      return;
    }

    void dispatchReminderEmails();
    const { status } = await refreshStrikeStatus();
    setStrikeStatus(status);
    setPendingCancellation(null);
    setSelectedBookingKey(null);
    setCancelling(false);
    setWeekendReload((current) => current + 1);
  }

  async function confirmBooking(recurring: boolean, note: string, conflictsConfirmed = false): Promise<BookingResult> {
    if (!selection || !tutor || !studentUid) return { success: false };
    if (strikeStatus.isBanned) {
      setError(t("strikes.studentBookingBlocked"));
      return { success: false };
    }

    setError("");

    const startSlot = selection.slots[0];
    const duration = selection.slots.length === 2 ? 60 : 30;
    const startsAt = beijingSlotInstant(weekendDates[selection.day], startSlot);
    const endsAt = new Date(startsAt.getTime() + duration * 60000);
    const overlapWindowStart = new Date(startsAt.getTime() - 60 * 60000);
    const { data: overlappingRows, error: overlapError } = await supabase
      .from("classes")
      .select("lesson_id, student_uid, teacher_uid, time, duration, status")
      .eq("teacher_uid", tutor.id)
      .gte("time", overlapWindowStart.toISOString())
      .lt("time", endsAt.toISOString())
      .or("status.is.null,status.neq.cancelled");

    if (overlapError) {
      setError(overlapError.message);
      return { success: false };
    }

    const hasOverlap = ((overlappingRows ?? []) as ClassRow[]).some((cls) => {
      const existingStart = new Date(cls.time);
      const existingEnd = new Date(existingStart.getTime() + cls.duration * 60000);
      return existingStart < endsAt && existingEnd > startsAt;
    });

    if (hasOverlap) {
      setError(t("schedule.slotAlreadyBooked"));
      setTutors((current) =>
        current.map((item) =>
          item.id === tutor.id
            ? {
                ...item,
                availability: removeBookedSlots(
                  item.availability,
                  (overlappingRows ?? []) as ClassRow[],
                  weekendDates
                ),
              }
            : item
        )
      );
      setSelection(null);
      return { success: false };
    }

    if (recurring && !conflictsConfirmed) {
      const { data: conflictRows, error: conflictsError } = await supabase.rpc(
        "get_recurring_class_conflicts",
        {
          p_teacher_uid: tutor.id,
          p_time: startsAt.toISOString(),
          p_duration: duration,
        }
      );

      if (conflictsError) {
        console.error("get_recurring_class_conflicts failed", conflictsError);
        setError(conflictsError.message);
        return { success: false };
      }

      const conflicts = ((conflictRows ?? []) as Array<{ conflict_time: string }>)
        .map((row) => row.conflict_time);
      if (conflicts.length > 0) {
        return { success: false, conflicts };
      }
    }

    const { error: insertError } = await supabase.rpc("secure_book_class", {
      p_teacher_uid: tutor.id,
      p_time: startsAt.toISOString(),
      p_duration: duration,
      p_recurring: recurring,
      p_student_note: note.trim(),
    });

    if (insertError) {
      console.error("secure_book_class failed", insertError);
      setError(insertError.message);
      return { success: false };
    }

    void dispatchReminderEmails();
    setTutors((current) =>
      current.map((item) =>
        item.id === tutor.id
          ? {
              ...item,
              availability: removeBookedSlots(
                item.availability,
                [{
                  lesson_id: "",
                  student_uid: studentUid,
                  teacher_uid: tutor.id,
                  time: startsAt.toISOString(),
                  duration,
                }],
                weekendDates
              ),
              booked: (() => {
                const newlyBooked = occupancySlots([{
                  slot_time: startsAt.toISOString(),
                  slot_duration: duration,
                  lesson_id: null,
                  recurring_lesson_id: null,
                  is_caller_class: true,
                }], weekendDates);
                return {
                  sat: Array.from(new Set([...item.booked.sat, ...newlyBooked.sat])),
                  sun: Array.from(new Set([...item.booked.sun, ...newlyBooked.sun])),
                };
              })(),
            }
          : item
      )
    );
    setRemainingClasses((current) => Math.max(0, current - 1));
    return { success: true };
  }

  return (
    <>
    <div className="flex h-full min-h-0 flex-col gap-5 overflow-y-auto lg:flex-row lg:overflow-hidden">
      {/* Left: schedule picker */}
      <div className="flex min-w-0 flex-1 flex-col gap-5 lg:overflow-y-auto lg:pr-1">
        {/* Header */}
        <div>
          <h2 className="text-foreground">{t("schedule.studentTitle")}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("schedule.studentHelp")}
          </p>
          <p className="mt-1 text-sm font-medium text-card-foreground">
            {t("schedule.studentBookingDeadline", { deadline: bookingDeadline })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t(
              weekendOffset === 0 && weekendDates.afterStudentCutoff
                ? "schedule.studentCutoffActiveNote"
                : "schedule.timezoneNote"
            )}
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {strikeStatus.isBanned && strikeStatus.bannedUntil && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {t("strikes.studentBookingBlockedUntil", {
              date: new Date(strikeStatus.bannedUntil).toLocaleString(lang === "zh" ? "zh-CN" : "en-US"),
            })}
          </div>
        )}

        {loading && (
          <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
            {t("schedule.loadingTutors")}
          </div>
        )}

        {pastTeachers.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm text-card-foreground">{t("schedule.pastTeachers")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {pastTeachers.map((teacher) => (
                <button
                  key={teacher.uid}
                  type="button"
                  onClick={() => tutors.some((t) => t.id === teacher.uid) && handleChangeTutor(teacher.uid)}
                  disabled={!tutors.some((t) => t.id === teacher.uid)}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-card-foreground transition-colors hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {teacher.name} · {teacher.count}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tutor dropdown */}
        <Select.Root value={selectedTutorId} onValueChange={handleChangeTutor}>
          <Select.Trigger className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-card-foreground outline-none transition-colors hover:border-primary/40 data-[placeholder]:text-muted-foreground sm:max-w-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              {tutor && <BlankAvatar size={24} />}
              <Select.Value placeholder={t("schedule.selectTutor")} />
            </div>
            <Select.Icon>
              <ChevronDown size={15} className="text-muted-foreground shrink-0" />
            </Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Content className="bg-popover border border-border rounded-xl shadow-xl z-50 w-[--radix-select-trigger-width] overflow-hidden">
              <Select.Viewport className="p-1.5">
                {tutors.map((t) => (
                  <Select.Item
                    key={t.id}
                    value={t.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-popover-foreground cursor-pointer outline-none data-[highlighted]:bg-accent"
                  >
                    <BlankAvatar size={28} />
                    <div className="flex-1 min-w-0">
                      <Select.ItemText>{t.name}</Select.ItemText>
                      <p className="text-xs text-muted-foreground">{t.grade}</p>
                    </div>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>

        {tutor && (
          <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center rounded-2xl border border-border bg-card p-2">
            <button
              type="button"
              onClick={() => moveToWeekend(weekendOffset - 1)}
              disabled={weekendLoading}
              aria-label={t("schedule.previousWeekend")}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-card-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="min-w-0 text-center">
              <p className="text-sm font-medium text-card-foreground">
                {weekendOffset === 0 ? t("schedule.bookingWeekend") : t("schedule.weekend")}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {formatLocalSlotDate(weekendDates.sat, lang)} – {formatLocalSlotDate(weekendDates.sun, lang)}
              </p>
              {!weekendLoading && (
                <p className="mt-1 text-xs font-medium text-primary">
                  {t("schedule.scheduledWeekendClasses", {
                    count: MAX_STUDENT_CLASSES_PER_WEEKEND - remainingClasses,
                    limit: MAX_STUDENT_CLASSES_PER_WEEKEND,
                  })}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => moveToWeekend(weekendOffset + 1)}
              disabled={weekendLoading}
              aria-label={t("schedule.nextWeekend")}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-card-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        {weekendLoading && (
          <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
            {t("schedule.loadingSchedule")}
          </div>
        )}

        {/* Legend + hint */}
        {tutor && availabilitySubmitted && !weekendLoading && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-primary inline-block" />
              {t("common.selected")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-card border border-border inline-block" />
              {t("common.available")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-muted/50 inline-block" />
              {t("common.unavailable")}
            </span>
            <span className="text-muted-foreground/70">
              {t("schedule.oneHourHint")}
            </span>
          </div>
        )}

        {/* Time grid */}
        {!loading && tutors.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground py-20">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <User size={28} className="opacity-40" />
            </div>
            <p className="text-sm">
              {t("schedule.noAvailableTutors")}
            </p>
          </div>
        ) : tutor && !weekendLoading && !availabilitySubmitted ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20 text-center text-muted-foreground">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <CalendarDays size={28} className="opacity-40" />
            </div>
            <p className="text-sm">{t("schedule.noTutorAvailabilityForWeekend")}</p>
          </div>
        ) : tutor && !weekendLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DayColumn
              day="sat"
              date={weekendDates.sat}
              availability={strikeStatus.isBanned || weekendOffset < 0 ? [] : tutor.availability.sat}
              booked={tutor.booked.sat}
              selection={selection}
              onSelect={handleSlotClick}
              onBookedClick={handleBookedSlotClick}
            />
            <DayColumn
              day="sun"
              date={weekendDates.sun}
              availability={strikeStatus.isBanned || weekendOffset < 0 ? [] : tutor.availability.sun}
              booked={tutor.booked.sun}
              selection={selection}
              onSelect={handleSlotClick}
              onBookedClick={handleBookedSlotClick}
            />
          </div>
        ) : !tutor ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground py-20">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <CalendarDays size={28} className="opacity-40" />
            </div>
            <p className="text-sm">
              {t("schedule.selectTutorPrompt")}
            </p>
          </div>
        ) : null}
      </div>

      {/* Right: booking panel */}
      <div
        className={`shrink-0 bg-card border border-border rounded-2xl overflow-hidden transition-all duration-300 ${
          panelOpen ? "max-h-[calc(100vh-2rem)] min-h-0 w-full opacity-100 overflow-y-auto lg:max-h-none lg:w-80" : "h-0 w-full opacity-0 border-transparent lg:h-auto lg:w-0"
        }`}
      >
        {selectedBooking ? (
          <BookedClassPanel
            booking={selectedBooking}
            onClose={() => setSelectedBookingKey(null)}
            onCancel={() => setPendingCancellation(selectedBooking)}
          />
        ) : panelOpen && (
          <BookingPanel
            key={`${selectedTutorId}-${weekendOffset}-${selection!.day}-${selection!.slots.join("-")}`}
            selection={selection!}
            tutor={tutor!}
            weekendDates={weekendDates}
            onClose={() => {
              setSelection(null);
              setWeekendReload((current) => current + 1);
            }}
            onConfirm={confirmBooking}
            lang={lang}
          />
        )}
      </div>
    </div>
    <CancelBookedClassDialog
      booking={pendingCancellation}
      cancelling={cancelling}
      onClose={() => setPendingCancellation(null)}
      onConfirm={confirmCancellation}
    />
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, User, X } from "lucide-react";
import { supabase } from "../../lib/supabase/client";
import { useLanguage } from "../i18n";
import { beijingCalendarToday, beijingMidnightInstant, calendarDateValue, formatLocalDeadline } from "../lib/weekend";
import { emptyStrikeStatus, isLateCancellation, refreshStrikeStatus } from "../lib/strikes";
import { dispatchReminderEmails } from "../lib/reminderEmails";

type Day = "sat" | "sun";
type Availability = Record<Day, number[]>;
type Booking = {
  student: string;
  note: string;
  date: string;
  time: string;
  startsAt: string;
  duration: number;
  lessonId: string | null;
  recurringLessonId: string | null;
  virtual: boolean;
};
type TutorAvailabilityRow = {
  tutor_uid: string;
  weekend_date: string;
} & Record<string, boolean | string>;
type ScheduleOccupancyRow = {
  slot_time: string;
  slot_duration: number;
  lesson_id: string | null;
  recurring_lesson_id: string | null;
  student_uid: string | null;
  is_virtual: boolean;
  student_note: string | null;
};
type StoredUser = {
  uid: string;
};

const storedUserKey = "tutorflow-user";

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

const ALL_SLOT_INDICES = SLOT_TIMES.map((_, index) => index);
const SLOT_COLUMN_SUFFIXES = ["700", "730", "800", "830", "900", "930", "1000", "1030", "1100", "1130"];
const AVAILABILITY_COLUMNS = (["sat", "sun"] as Day[]).flatMap((day) =>
  SLOT_COLUMN_SUFFIXES.map((suffix) => `${day}_${suffix}`)
);

function getBaseWeekendDates() {
  const today = beijingCalendarToday();
  const dayOfWeek = today.getDay();
  const afterTutorCutoff = dayOfWeek >= 5 || dayOfWeek === 0;
  let daysUntilSat = (6 - dayOfWeek + 7) % 7;
  if (dayOfWeek === 0) {
    daysUntilSat = -1;
  }
  const sat = new Date(today);
  sat.setDate(today.getDate() + daysUntilSat);
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  return { sat, sun, afterTutorCutoff };
}

function getWeekendDates(offset = 0) {
  const base = getBaseWeekendDates();
  const sat = new Date(base.sat);
  sat.setDate(base.sat.getDate() + offset * 7);
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  return { ...base, sat, sun };
}

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

function slotKey(day: Day, slotIdx: number) {
  return `${day}-${slotIdx}`;
}

function availabilityColumn(day: Day, slotIdx: number) {
  return `${day}_${SLOT_COLUMN_SUFFIXES[slotIdx]}`;
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

function rowToAvailability(row: TutorAvailabilityRow | null) {
  if (!row) {
    return {
      availability: { sat: ALL_SLOT_INDICES, sun: ALL_SLOT_INDICES },
      unset: true,
    };
  }

  return {
    availability: {
      sat: ALL_SLOT_INDICES.filter((idx) => row[availabilityColumn("sat", idx)] !== false),
      sun: ALL_SLOT_INDICES.filter((idx) => row[availabilityColumn("sun", idx)] !== false),
    },
    unset: false,
  };
}

function availabilityToUpdate(availability: Availability) {
  return Object.fromEntries(
    (["sat", "sun"] as Day[]).flatMap((day) =>
      ALL_SLOT_INDICES.map((idx) => [
        availabilityColumn(day, idx),
        availability[day].includes(idx),
      ])
    )
  );
}

function slotIndexForInstant(date: Date, instant: Date) {
  return Math.round((instant.getTime() - beijingSlotInstant(date, 0).getTime()) / 1800000);
}

function fullWeekendWindow(dates: { sat: Date; sun: Date }) {
  const start = new Date(Date.UTC(
    dates.sat.getFullYear(),
    dates.sat.getMonth(),
    dates.sat.getDate(),
    -8
  ));
  return { start, end: new Date(start.getTime() + 48 * 60 * 60 * 1000) };
}

function BookingPanel({
  booking,
  onClose,
  onCancelClass,
  locked,
  lang,
}: {
  booking: Booking;
  onClose: () => void;
  onCancelClass: () => void;
  locked: boolean;
  lang: string;
}) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
        <p className="text-card-foreground text-sm">
          {t("schedule.bookedSession")}
        </p>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground cursor-pointer transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
        <div className="flex items-center gap-3 p-3.5 bg-muted rounded-xl">
          <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
            <User size={18} />
          </div>
          <div>
            <p className="text-sm text-card-foreground">{booking.student}</p>
            <p className="text-xs text-muted-foreground">{t("common.student")}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {t("schedule.sessionDetails")}
          </p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2.5 text-sm text-card-foreground">
              <CalendarDays size={15} className="text-muted-foreground shrink-0" />
              <span>{booking.date}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-card-foreground">
              <Clock size={15} className="text-muted-foreground shrink-0" />
              <span>{booking.time}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {t("schedule.studentNote")}
          </p>
          <div className="rounded-xl bg-muted px-3.5 py-3 text-sm text-card-foreground leading-relaxed">
            {booking.note}
          </div>
        </div>
      </div>

      <div className="px-5 py-4 border-t border-border shrink-0">
        <button
          onClick={onCancelClass}
          disabled={locked}
          className="w-full rounded-xl border border-border bg-card py-3 text-sm text-card-foreground hover:bg-accent transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("schedule.markUnavailable")}
        </button>
      </div>
    </div>
  );
}

function CancelBookingDialog({
  booking,
  onCancel,
  onConfirm,
}: {
  booking: Booking | null;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const { t } = useLanguage();
  return (
    <Dialog.Root open={booking !== null} onOpenChange={(open) => !open && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-card-foreground">
                {t("schedule.cancelBookedClass")}
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {t("schedule.cancelBookedClassHelp", { student: booking?.student ?? "" })}
              </Dialog.Description>
              {isLateCancellation(booking?.startsAt, "tutor") && (
                <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {t("strikes.lateCancellationWarning")}
                </p>
              )}
            </div>
            <button
              onClick={onCancel}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground cursor-pointer transition-colors"
            >
              <X size={15} />
            </button>
          </div>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              onClick={onCancel}
              className="rounded-xl border border-border bg-card px-4 py-2 text-sm text-card-foreground hover:bg-accent transition-colors"
            >
              {t("common.no")}
            </button>
            <button
              onClick={onConfirm}
              className="rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {t("common.confirm")}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function WeekendUnavailableDialog({
  open,
  dateRange,
  showStrikeWarning,
  saving,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  dateRange: string;
  showStrikeWarning: boolean;
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useLanguage();
  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl">
          <Dialog.Title className="text-card-foreground">
            {t("schedule.markWeekendUnavailableTitle")}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("schedule.markWeekendUnavailableHelp", { dateRange })}
          </Dialog.Description>
          {showStrikeWarning && (
            <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {t("strikes.lateWeekendCancellationWarning")}
            </p>
          )}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="rounded-xl border border-border px-4 py-2 text-sm text-card-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={saving}
              className="rounded-xl bg-destructive px-4 py-2 text-sm text-destructive-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? t("schedule.markingWeekendUnavailable") : t("common.proceed")}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function UnsavedWeekendDialog({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useLanguage();
  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl">
          <Dialog.Title className="text-card-foreground">
            {t("schedule.unsavedWeekendTitle")}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("schedule.unsavedWeekendHelp")}
          </Dialog.Description>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-border px-4 py-2 text-sm text-card-foreground transition-colors hover:bg-accent"
            >
              {t("schedule.keepEditing")}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {t("schedule.discardAndContinue")}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SlotButton({
  day,
  date,
  slotIdx,
  available,
  booking,
  onClick,
  lang,
  locked,
}: {
  day: Day;
  date: Date;
  slotIdx: number;
  available: boolean;
  booking?: Booking;
  onClick: (day: Day, slotIdx: number) => void;
  lang: string;
  locked: boolean;
}) {
  const { t } = useLanguage();
  let stateClass = "bg-muted/50 text-muted-foreground/40 border-transparent hover:bg-muted";
  let label = t("common.unavailable");

  if (booking) {
    stateClass = "bg-emerald-50 text-emerald-900 border-emerald-200 hover:border-emerald-300";
    label = booking.student;
  } else if (available) {
    stateClass = "bg-card text-card-foreground border-border hover:border-primary/40 hover:bg-accent";
    label = t("common.available");
  }

  if (locked && !booking) {
    stateClass = available
      ? "bg-card text-card-foreground border-border opacity-70"
      : "bg-muted/50 text-muted-foreground/40 border-transparent";
  }

  return (
    <button
      onClick={() => onClick(day, slotIdx)}
      className={`w-full border rounded-lg text-xs px-3 py-2.5 transition-all flex items-center justify-between ${locked && !booking ? "cursor-not-allowed" : "cursor-pointer"} ${stateClass}`}
    >
      <span>{formatLocalSlotRange(date, slotIdx, lang)}</span>
      <span className="text-[10px] opacity-70">{label}</span>
    </button>
  );
}

function DayColumn({
  day,
  date,
  availability,
  bookings,
  onToggle,
  locked,
}: {
  day: Day;
  date: Date;
  availability: Availability;
  bookings: Record<string, Booking>;
  onToggle: (day: Day, slotIdx: number) => void;
  locked: boolean;
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
          day={day}
          date={date}
          slotIdx={idx}
          available={availability[day].includes(idx)}
          booking={bookings[slotKey(day, idx)]}
          onClick={onToggle}
          lang={lang}
          locked={locked}
        />
      ))}
    </div>
  );
}

export function TutorSchedulePage({ lang }: { lang: string }) {
  const { t } = useLanguage();
  const [weekendOffset, setWeekendOffset] = useState(0);
  const [availability, setAvailability] = useState<Availability>({
    sat: ALL_SLOT_INDICES,
    sun: ALL_SLOT_INDICES,
  });
  const [bookings, setBookings] = useState<Record<string, Booking>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [availabilityUnset, setAvailabilityUnset] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [selectedBookingKey, setSelectedBookingKey] = useState<string | null>(null);
  const [pendingCancel, setPendingCancel] = useState<{ day: Day; slotIdx: number; booking: Booking } | null>(null);
  const [weekendDialogOpen, setWeekendDialogOpen] = useState(false);
  const [markingWeekendUnavailable, setMarkingWeekendUnavailable] = useState(false);
  const [weekendMarkedUnavailable, setWeekendMarkedUnavailable] = useState(false);
  const [pendingWeekendOffset, setPendingWeekendOffset] = useState<number | null>(null);
  const [strikeStatus, setStrikeStatus] = useState(emptyStrikeStatus);

  const weekendDates = getWeekendDates(weekendOffset);
  const availabilityDeadline = formatLocalDeadline(beijingMidnightInstant(weekendDates.sat, -1), lang);
  const selectedBooking = selectedBookingKey ? bookings[selectedBookingKey] : null;
  const hasAvailability = availability.sat.length + availability.sun.length > 0;
  const changesLocked =
    strikeStatus.isBanned
    || weekendOffset < 0
    || (weekendOffset === 0 && weekendDates.afterTutorCutoff);
  const weekendDateRange = `${formatLocalSlotDate(weekendDates.sat, lang)} – ${formatLocalSlotDate(weekendDates.sun, lang)}`;

  async function getTutorUid() {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? readStoredUser()?.uid;
  }

  useEffect(() => {
    let cancelled = false;

    async function loadSchedule() {
      setLoading(true);
      setError("");

      const tutorUid = await getTutorUid();
      if (!tutorUid) {
        if (!cancelled) {
          setError(t("common.noTutorUid"));
          setLoading(false);
        }
        return;
      }

      const selectedWeekendDates = getWeekendDates(weekendOffset);
      const selectedWeekendDate = calendarDateValue(selectedWeekendDates.sat);
      const availabilitySelect = ["tutor_uid", "weekend_date", ...AVAILABILITY_COLUMNS].join(", ");
      const [
        strikeStatusResult,
        availabilityResult,
        occupancyResult,
      ] = await Promise.all([
        refreshStrikeStatus(),
        supabase
          .from("tutor_availability")
          .select(availabilitySelect)
          .eq("tutor_uid", tutorUid)
          .eq("weekend_date", selectedWeekendDate)
          .maybeSingle(),
        supabase.rpc(
          "get_weekend_schedule_occupancy",
          {
            p_teacher_uid: tutorUid,
            p_weekend_date: selectedWeekendDate,
          }
        ),
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

      if (availabilityResult.error) {
        if (!cancelled) {
          setError(availabilityResult.error.message);
          setLoading(false);
        }
        return;
      }

      if (occupancyResult.error) {
        if (!cancelled) {
          setError(occupancyResult.error.message);
          setLoading(false);
        }
        return;
      }

      const { availability: nextAvailability, unset } = rowToAvailability(
        (availabilityResult.data as unknown as TutorAvailabilityRow | null) ?? null
      );
      const classes = (occupancyResult.data ?? []) as ScheduleOccupancyRow[];
      const studentUids = Array.from(new Set(
        classes.map((cls) => cls.student_uid).filter((uid): uid is string => Boolean(uid))
      ));
      const studentNames = new Map<string, string>();

      if (studentUids.length > 0) {
        const { data: profiles, error: studentsError } = await supabase
          .from("profiles")
          .select("uid, name")
          .in("uid", studentUids);

        if (studentsError) {
          if (!cancelled) {
            setError(studentsError.message);
            setLoading(false);
          }
          return;
        }

        profiles?.forEach((student) => {
          studentNames.set(student.uid, student.name);
        });
      }

      const nextBookings: Record<string, Booking> = {};
      classes.forEach((cls) => {
        const startsAt = new Date(cls.slot_time);
        const sunStart = beijingSlotInstant(selectedWeekendDates.sun, 0);
        const day: Day = startsAt < sunStart ? "sat" : "sun";
        const dayDate = day === "sat" ? selectedWeekendDates.sat : selectedWeekendDates.sun;
        const startIdx = slotIndexForInstant(dayDate, startsAt);
        const endIdx = startIdx + cls.slot_duration / 30;
        const student = cls.student_uid
          ? studentNames.get(cls.student_uid) ?? t("common.student")
          : t("common.student");
        const booking: Booking = {
          student,
          note: cls.student_note?.trim() || "",
          date: formatLocalSlotDate(dayDate, lang),
          time: formatLocalInstantRange(startsAt, cls.slot_duration, lang),
          startsAt: cls.slot_time,
          duration: cls.slot_duration,
          lessonId: cls.lesson_id,
          recurringLessonId: cls.recurring_lesson_id,
          virtual: cls.is_virtual,
        };

        for (let idx = startIdx; idx < endIdx; idx += 1) {
          if (Number.isInteger(idx) && idx >= 0 && idx < SLOT_TIMES.length) {
            nextBookings[slotKey(day, idx)] = booking;
          }
        }
      });

      if (!cancelled) {
        setAvailability(nextAvailability);
        setAvailabilityUnset(unset);
        setBookings(nextBookings);
        setSaved(!unset);
        setDirty(false);
        setSelectedBookingKey(null);
        setPendingCancel(null);
        setWeekendMarkedUnavailable(false);
        setLoading(false);
      }
    }

    loadSchedule();

    return () => {
      cancelled = true;
    };
  }, [weekendOffset, lang, t]);

  function toggleSlot(day: Day, slotIdx: number) {
    const key = slotKey(day, slotIdx);
    const booking = bookings[key];
    const available = availability[day].includes(slotIdx);

    if (booking) {
      setSelectedBookingKey(key);
      return;
    }

    if (changesLocked) {
      return;
    }

    setAvailability((current) => ({
      ...current,
      [day]: available
        ? current[day].filter((item) => item !== slotIdx)
        : [...current[day], slotIdx].sort((a, b) => a - b),
    }));
    setDirty(true);
  }

  async function confirmCancelBookedSlot() {
    if (!pendingCancel) return;
    setError("");

    const booking = pendingCancel.booking;
    const { error: cancelError } = booking.recurringLessonId
      ? await supabase.rpc("secure_cancel_recurring_occurrence", {
          p_recurring_lesson_id: booking.recurringLessonId,
          p_time: booking.startsAt,
        })
      : booking.lessonId
        ? await supabase.rpc("secure_cancel_class", {
            p_lesson_id: booking.lessonId,
            p_series: false,
          })
        : { error: new Error("Class could not be identified") };

    if (cancelError) {
      setError(cancelError.message);
      return;
    }

    void dispatchReminderEmails();
    const { status } = await refreshStrikeStatus();
    setStrikeStatus(status);
    setBookings((current) => {
      return Object.fromEntries(
        Object.entries(current).filter(([, item]) => item.startsAt !== booking.startsAt)
      );
    });
    const startIdx = slotIndexForInstant(
      pendingCancel.day === "sat" ? weekendDates.sat : weekendDates.sun,
      new Date(booking.startsAt)
    );
    const unavailableSlots = Array.from(
      { length: booking.duration / 30 },
      (_, offset) => startIdx + offset
    );
    setAvailability((current) => ({
      ...current,
      [pendingCancel.day]: current[pendingCancel.day].filter(
        (item) => !unavailableSlots.includes(item)
      ),
    }));
    setSelectedBookingKey(null);
    setDirty(true);
    setPendingCancel(null);
  }

  function moveToWeekend(offset: number) {
    if (dirty) {
      setPendingWeekendOffset(offset);
      return;
    }
    setWeekendOffset(offset);
  }

  function confirmWeekendChange() {
    if (pendingWeekendOffset === null) return;
    setDirty(false);
    setPendingWeekendOffset(null);
    setWeekendOffset(pendingWeekendOffset);
  }

  async function saveAvailability() {
    if (changesLocked) return;

    setSaving(true);
    setError("");

    const tutorUid = await getTutorUid();
    if (!tutorUid) {
      setError(t("common.noTutorUid"));
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase.rpc("secure_save_tutor_availability", {
      p_availability: availabilityToUpdate(availability),
      p_weekend_date: calendarDateValue(weekendDates.sat),
    });

    if (updateError) {
      console.error("secure_save_tutor_availability failed", updateError);
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setAvailabilityUnset(false);
    setSaved(true);
    setDirty(false);
    setSaving(false);
  }

  async function markWeekendUnavailable() {
    setMarkingWeekendUnavailable(true);
    setError("");
    const { start, end } = fullWeekendWindow(weekendDates);
    const { error: updateError } = await supabase.rpc("secure_mark_weekend_unavailable", {
      p_weekend_start: start.toISOString(),
      p_weekend_end: end.toISOString(),
    });

    if (updateError) {
      console.error("secure_mark_weekend_unavailable failed", updateError);
      setError(updateError.message);
      setMarkingWeekendUnavailable(false);
      return;
    }

    void dispatchReminderEmails();
    const { status } = await refreshStrikeStatus();
    setStrikeStatus(status);
    setAvailability({ sat: [], sun: [] });
    setBookings({});
    setAvailabilityUnset(false);
    setSaved(true);
    setDirty(false);
    setSelectedBookingKey(null);
    setPendingCancel(null);
    setWeekendDialogOpen(false);
    setWeekendMarkedUnavailable(true);
    setMarkingWeekendUnavailable(false);
  }

  return (
    <>
      <div className="flex h-full min-h-0 flex-col gap-5 overflow-y-auto lg:flex-row lg:overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col gap-5 lg:overflow-y-auto lg:pr-1">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
            <div>
              <h2 className="text-foreground">{t("schedule.setAvailability")}</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {t("schedule.chinaTimeRange")}
              </p>
              <p className="mt-1 text-sm font-medium text-card-foreground">
                {t("schedule.tutorAvailabilityDeadline", { deadline: availabilityDeadline })}
              </p>
              {weekendOffset < 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("schedule.pastWeekendNote")}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setWeekendDialogOpen(true)}
              disabled={loading || markingWeekendUnavailable || weekendOffset < 0 || strikeStatus.isBanned}
              className="w-full shrink-0 rounded-xl border border-destructive px-4 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {t("schedule.markWeekendUnavailable", { dateRange: weekendDateRange })}
            </button>
          </div>

          <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center rounded-2xl border border-border bg-card p-2">
            <button
              type="button"
              onClick={() => moveToWeekend(weekendOffset - 1)}
              disabled={loading || saving}
              aria-label={t("schedule.previousWeekend")}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-card-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="min-w-0 text-center">
              <p className="text-sm font-medium text-card-foreground">
                {weekendOffset === 0 ? t("schedule.currentWeekend") : t("schedule.weekend")}
              </p>
              <p className="truncate text-xs text-muted-foreground">{weekendDateRange}</p>
            </div>
            <button
              type="button"
              onClick={() => moveToWeekend(weekendOffset + 1)}
              disabled={loading || saving}
              aria-label={t("schedule.nextWeekend")}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-card-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {weekendMarkedUnavailable && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {t("schedule.weekendMarkedUnavailable")}
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {strikeStatus.isBanned && strikeStatus.bannedUntil && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {t("strikes.tutorAvailabilityBlockedUntil", {
                date: new Date(strikeStatus.bannedUntil).toLocaleString(lang === "zh" ? "zh-CN" : "en-US"),
              })}
            </div>
          )}

          {loading && (
            <div className="bg-card border border-border rounded-2xl p-5 text-sm text-muted-foreground">
              {t("schedule.loadingSchedule")}
            </div>
          )}

          {availabilityUnset && !loading && (
            <div className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-card-foreground text-sm">{t("schedule.availabilityUnsetTitle")}</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t(
                    weekendOffset === 0 && weekendDates.afterTutorCutoff
                      ? "schedule.tutorCutoffActiveNote"
                      : "schedule.availabilityUnsetHelp"
                  )}
                </p>
              </div>
              <CalendarDays size={28} className="text-primary shrink-0" />
            </div>
          )}

          {!saved && !availabilityUnset && !hasAvailability && (
            <div className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-card-foreground text-sm">{t("schedule.noAvailabilityTitle")}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{t("schedule.noAvailabilityHelp")}</p>
              </div>
              <CalendarDays size={28} className="text-primary shrink-0" />
            </div>
          )}

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-card border border-border inline-block" />
                {t("common.available")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-muted/50 inline-block" />
                {t("common.unavailable")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-50 border border-emerald-200 inline-block" />
                {t("common.booked")}
              </span>
            </div>
            <button
              onClick={saveAvailability}
              disabled={saving || loading || changesLocked}
              className="w-full rounded-xl bg-primary px-5 py-2.5 text-sm text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {saving ? t("common.saving") : saved && !dirty ? t("common.availabilitySaved") : t("common.saveAvailability")}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DayColumn
              day="sat"
              date={weekendDates.sat}
              availability={availability}
              bookings={bookings}
              onToggle={toggleSlot}
              locked={changesLocked}
            />
            <DayColumn
              day="sun"
              date={weekendDates.sun}
              availability={availability}
              bookings={bookings}
              onToggle={toggleSlot}
              locked={changesLocked}
            />
          </div>
        </div>

        <div
          className={`shrink-0 bg-card border border-border rounded-2xl overflow-hidden transition-all duration-300 ${
            selectedBooking ? "max-h-[calc(100vh-2rem)] min-h-0 w-full opacity-100 overflow-y-auto lg:max-h-none lg:w-80" : "h-0 w-full opacity-0 border-transparent lg:h-auto lg:w-0"
          }`}
        >
          {selectedBooking && (
            <BookingPanel
              booking={selectedBooking}
              onClose={() => setSelectedBookingKey(null)}
              onCancelClass={() => {
                const [day, slot] = selectedBookingKey!.split("-") as [Day, string];
                setPendingCancel({ day, slotIdx: Number(slot), booking: selectedBooking });
              }}
              locked={new Date(selectedBooking.startsAt) <= new Date()}
              lang={lang}
            />
          )}
        </div>
      </div>

      <CancelBookingDialog
        booking={pendingCancel?.booking ?? null}
        onCancel={() => setPendingCancel(null)}
        onConfirm={confirmCancelBookedSlot}
      />
      <WeekendUnavailableDialog
        open={weekendDialogOpen}
        dateRange={weekendDateRange}
        showStrikeWarning={weekendOffset === 0 && weekendDates.afterTutorCutoff && Object.keys(bookings).length > 0}
        saving={markingWeekendUnavailable}
        onCancel={() => setWeekendDialogOpen(false)}
        onConfirm={markWeekendUnavailable}
      />
      <UnsavedWeekendDialog
        open={pendingWeekendOffset !== null}
        onCancel={() => setPendingWeekendOffset(null)}
        onConfirm={confirmWeekendChange}
      />
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CalendarDays, Clock, User, X } from "lucide-react";
import { supabase } from "../../lib/supabase/client";
import { useLanguage } from "../i18n";

type Day = "sat" | "sun";
type Availability = Record<Day, number[]>;
type Booking = {
  student: string;
  note: string;
  date: string;
  time: string;
};
type TutorProfileAvailability = Record<string, boolean | null>;
type ClassRow = {
  lesson_id: string;
  student_uid: string;
  teacher_uid: string;
  lesson_date: string;
  start_time: string;
  end_time: string;
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

const ALL_SLOT_INDICES = SLOT_TIMES.map((_, index) => index);
const SLOT_COLUMN_SUFFIXES = ["700", "730", "800", "830", "900", "930", "1000", "1030", "1100", "1130"];
const AVAILABILITY_COLUMNS = (["sat", "sun"] as Day[]).flatMap((day) =>
  SLOT_COLUMN_SUFFIXES.map((suffix) => `${day}_${suffix}`)
);

function getWeekendDates() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();
  const daysUntilSat = (6 - dayOfWeek + 7) % 7 || 7;
  const sat = new Date(today);
  sat.setDate(today.getDate() + daysUntilSat);
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  return { sat, sun };
}

function formatDate(d: Date, lang: string = "en") {
  return d.toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US", { weekday: "long", month: "long", day: "numeric" });
}

function formatDbDate(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTime(time: string) {
  return new Date(`1970-01-01T${time}`).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
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

function profileToAvailability(profile: TutorProfileAvailability | null) {
  if (!profile) {
    return {
      availability: { sat: ALL_SLOT_INDICES, sun: ALL_SLOT_INDICES },
      unset: true,
    };
  }

  const unset = AVAILABILITY_COLUMNS.every((column) => profile[column] === null);

  return {
    availability: {
      sat: ALL_SLOT_INDICES.filter((idx) => profile[availabilityColumn("sat", idx)] !== false),
      sun: ALL_SLOT_INDICES.filter((idx) => profile[availabilityColumn("sun", idx)] !== false),
    },
    unset,
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

function timeToSlotIndex(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes;
  return (totalMinutes - 7 * 60) / 30;
}

function BookingPanel({
  booking,
  onClose,
  onCancelClass,
  lang,
}: {
  booking: Booking;
  onClose: () => void;
  onCancelClass: () => void;
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
          className="w-full rounded-xl border border-border bg-card py-3 text-sm text-card-foreground hover:bg-accent transition-colors"
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
  onConfirm: () => void;
}) {
  const { t } = useLanguage();
  return (
    <Dialog.Root open={booking !== null} onOpenChange={(open) => !open && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-5 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-card-foreground">
                {t("schedule.cancelBookedClass")}
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {t("schedule.cancelBookedClassHelp", { student: booking?.student ?? "" })}
              </Dialog.Description>
            </div>
            <button
              onClick={onCancel}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground cursor-pointer transition-colors"
            >
              <X size={15} />
            </button>
          </div>
          <div className="mt-5 flex justify-end gap-2">
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

function SlotButton({
  day,
  slotIdx,
  available,
  booking,
  onClick,
}: {
  day: Day;
  slotIdx: number;
  available: boolean;
  booking?: Booking;
  onClick: (day: Day, slotIdx: number) => void;
}) {
  const { t } = useLanguage();
  let stateClass = "bg-muted/50 text-muted-foreground/40 border-transparent hover:bg-muted";
  let label = t("common.unavailable");

  if (booking && available) {
    stateClass = "bg-emerald-50 text-emerald-900 border-emerald-200 hover:border-emerald-300";
    label = booking.student;
  } else if (available) {
    stateClass = "bg-card text-card-foreground border-border hover:border-primary/40 hover:bg-accent";
    label = t("common.available");
  }

  return (
    <button
      onClick={() => onClick(day, slotIdx)}
      className={`w-full border rounded-lg text-xs px-3 py-2.5 transition-all flex items-center justify-between cursor-pointer ${stateClass}`}
    >
      <span>{SLOT_TIMES[slotIdx]}</span>
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
}: {
  day: Day;
  date: Date;
  availability: Availability;
  bookings: Record<string, Booking>;
  onToggle: (day: Day, slotIdx: number) => void;
}) {
  const { lang, t } = useLanguage();
  return (
    <div className="flex flex-col gap-1.5">
      <div className="mb-2">
        <p className="text-card-foreground text-sm">{day === "sat" ? t("common.saturday") : t("common.sunday")}</p>
        <p className="text-xs text-muted-foreground">{formatDate(date, lang)}</p>
      </div>
      {SLOT_TIMES.map((_, idx) => (
        <SlotButton
          key={idx}
          day={day}
          slotIdx={idx}
          available={availability[day].includes(idx)}
          booking={bookings[slotKey(day, idx)]}
          onClick={onToggle}
        />
      ))}
    </div>
  );
}

export function TutorSchedulePage({ lang }: { lang: string }) {
  const { t } = useLanguage();
  const weekendDates = getWeekendDates();
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
  const [currentTutorUid, setCurrentTutorUid] = useState("");
  const [selectedBookingKey, setSelectedBookingKey] = useState<string | null>(null);
  const [pendingCancel, setPendingCancel] = useState<{ day: Day; slotIdx: number; booking: Booking } | null>(null);

  const selectedBooking = selectedBookingKey ? bookings[selectedBookingKey] : null;
  const hasAvailability = availability.sat.length + availability.sun.length > 0;

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
      if (!cancelled) {
        setCurrentTutorUid(tutorUid ?? "");
      }
      if (!tutorUid) {
        if (!cancelled) {
          setError(t("common.noTutorUid"));
          setLoading(false);
        }
        return;
      }

      const availabilitySelect = AVAILABILITY_COLUMNS.join(", ");
      const { data: profile, error: profileError } = await supabase
        .from("tutor_profiles")
        .select(availabilitySelect)
        .eq("uid", tutorUid)
        .maybeSingle();

      if (profileError) {
        if (!cancelled) {
          setError(profileError.message);
          setLoading(false);
        }
        return;
      }

      if (!profile) {
        if (!cancelled) {
          setError(t("common.noTutorProfile"));
          setLoading(false);
        }
        return;
      }

      const { availability: nextAvailability, unset } = profileToAvailability(profile as unknown as TutorProfileAvailability);

      const satDate = formatDbDate(weekendDates.sat);
      const sunDate = formatDbDate(weekendDates.sun);
      const { data: classRows, error: classesError } = await supabase
        .from("classes")
        .select("lesson_id, student_uid, teacher_uid, lesson_date, start_time, end_time")
        .eq("teacher_uid", tutorUid)
        .in("lesson_date", [satDate, sunDate])
        .order("lesson_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (classesError) {
        if (!cancelled) {
          setError(classesError.message);
          setLoading(false);
        }
        return;
      }

      const classes = (classRows ?? []) as ClassRow[];
      const studentUids = Array.from(new Set(classes.map((cls) => cls.student_uid)));
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
        const day: Day = cls.lesson_date === satDate ? "sat" : "sun";
        const startIdx = timeToSlotIndex(cls.start_time);
        const endIdx = timeToSlotIndex(cls.end_time);
        const student = studentNames.get(cls.student_uid) ?? cls.student_uid;
        const booking: Booking = {
          student,
          note: "",
          date: formatDate(day === "sat" ? weekendDates.sat : weekendDates.sun, lang),
          time: `${formatTime(cls.start_time)} - ${formatTime(cls.end_time)}`,
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
        setLoading(false);
      }
    }

    loadSchedule();

    return () => {
      cancelled = true;
    };
  }, []);

  function toggleSlot(day: Day, slotIdx: number) {
    const key = slotKey(day, slotIdx);
    const booking = bookings[key];
    const available = availability[day].includes(slotIdx);

    if (booking && available) {
      setSelectedBookingKey(key);
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

  function confirmCancelBookedSlot() {
    if (!pendingCancel) return;
    const key = slotKey(pendingCancel.day, pendingCancel.slotIdx);

    setBookings((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    setAvailability((current) => ({
      ...current,
      [pendingCancel.day]: current[pendingCancel.day].filter((item) => item !== pendingCancel.slotIdx),
    }));
    if (selectedBookingKey === key) {
      setSelectedBookingKey(null);
    }
    setDirty(true);
    setPendingCancel(null);
  }

  async function saveAvailability() {
    setSaving(true);
    setError("");

    const tutorUid = await getTutorUid();
    if (!tutorUid) {
      setError(t("common.noTutorUid"));
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("tutor_profiles")
      .update(availabilityToUpdate(availability))
      .eq("uid", tutorUid);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setAvailabilityUnset(false);
    setSaved(true);
    setDirty(false);
    setSaving(false);
  }

  return (
    <>
      <div className="flex h-full min-h-0 flex-col gap-5 overflow-y-auto lg:flex-row lg:overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col gap-5 lg:overflow-y-auto lg:pr-1">
          <div>
            <h2 className="text-foreground">{t("schedule.setAvailability")}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t("schedule.setAvailabilityHelp")}
            </p>
            {currentTutorUid && (
              <p className="mt-1 text-xs text-muted-foreground">
                {t("common.tutorUid", { uid: currentTutorUid })}
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
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
                <p className="text-sm text-muted-foreground mt-0.5">{t("schedule.availabilityUnsetHelp")}</p>
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
              disabled={!hasAvailability || saving || loading}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
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
            />
            <DayColumn
              day="sun"
              date={weekendDates.sun}
              availability={availability}
              bookings={bookings}
              onToggle={toggleSlot}
            />
          </div>
        </div>

        <div
          className={`shrink-0 bg-card border border-border rounded-2xl overflow-hidden transition-all duration-300 ${
            selectedBooking ? "min-h-[24rem] w-full opacity-100 lg:min-h-0 lg:w-80" : "h-0 w-full opacity-0 border-transparent lg:h-auto lg:w-0"
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
    </>
  );
}

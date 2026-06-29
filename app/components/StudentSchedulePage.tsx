"use client";

import { useEffect, useState } from "react";
import * as Select from "@radix-ui/react-select";
import { ChevronDown, ChevronRight, X, CalendarDays, Clock, User, CheckCircle2 } from "lucide-react";
import { supabase } from "../../lib/supabase/client";
import { matchesGradeToTutor, parseGradesToTutor, serializeGradesToTutor } from "../lib/gradesToTutor";
import { useLanguage } from "../i18n";

// ─── DATA ─────────────────────────────────────────────────────────────────────

function getWeekendDates() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();
  const afterStudentCutoff = dayOfWeek === 6 || dayOfWeek === 0;
  const daysUntilSat = (6 - dayOfWeek + 7) % 7 || 7;
  const sat = new Date(today);
  sat.setDate(today.getDate() + daysUntilSat);
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

function formatLocalSlotDate(date: Date, lang: string) {
  return formatDate(beijingSlotInstant(date, 0), lang);
}

function currentTimeZoneLabel() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "local time";
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

function gradeBand(grade: string) {
  const gradeNumber = Number(grade.match(/\d+/)?.[0] ?? 0);
  if (gradeNumber >= 1 && gradeNumber <= 6) return "elementary school";
  if (gradeNumber >= 7 && gradeNumber <= 9) return "middle school";
  if (gradeNumber >= 10 && gradeNumber <= 12) return "high school";
  return "";
}

function profileAvailability(profile: TutorProfileRow): Availability {
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
  grades_to_tutor: string;
} & Record<string, boolean | null | string>;
type ProfileRow = {
  uid: string;
  name: string;
};
type ClassRow = {
  lesson_id: string;
  student_uid: string;
  teacher_uid: string;
  time: string;
    duration: number;
    status?: string | null;
  };
type TutorOption = {
  id: string;
  name: string;
  grade: string;
  gradesToTutor: string;
  availability: Availability;
};
type PastTeacher = {
  uid: string;
  name: string;
  count: number;
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

// ─── SLOT BUTTON ──────────────────────────────────────────────────────────────

function SlotButton({
  slotIdx,
  day,
  date,
  available,
  selection,
  onSelect,
}: {
  slotIdx: number;
  day: Day;
  date: Date;
  available: boolean;
  selection: Selection | null;
  onSelect: (day: Day, slotIdx: number) => void;
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
  if (!available) {
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
      disabled={!available}
      onClick={() => available && onSelect(day, slotIdx)}
      className={`w-full border text-xs px-3 py-2.5 transition-all flex items-center justify-between ${stateClass} ${topRadius} ${bottomRadius} ${marginClass}`}
    >
      <span>{formatLocalSlotRange(date, slotIdx, lang)}</span>
      {available && !isSelected && (
        <span className="opacity-40 text-[10px]">{t("common.available")}</span>
      )}
      {isSelected && isFirstSelected && !isTwoSlot && (
        <span className="text-[10px] opacity-80">{t("common.thirtyMinutesShort")}</span>
      )}
      {isSelected && isLastSelected && isTwoSlot && (
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
  selection,
  onSelect,
}: {
  day: Day;
  date: Date;
  availability: number[];
  selection: Selection | null;
  onSelect: (day: Day, slotIdx: number) => void;
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
          selection={selection}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

// ─── BOOKING PANEL ────────────────────────────────────────────────────────────

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
  onConfirm: (recurring: boolean) => Promise<boolean>;
  lang: string;
}) {
  const { t } = useLanguage();
  const [note, setNote] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);

  const date = weekendDates[selection.day];
  const startSlot = selection.slots[0];
  const endSlot = selection.slots[selection.slots.length - 1];
  const duration = selection.slots.length === 2 ? t("common.oneHour") : t("common.thirtyMinutes");
  const timeRange = `${formatLocalTime(beijingSlotInstant(date, startSlot), lang)} – ${formatLocalTime(beijingSlotInstant(date, endSlot, true), lang)}`;
  const dateLabel = formatLocalSlotDate(date, lang);

  if (confirmed) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 size={28} className="text-emerald-600" />
        </div>
        <div>
          <p className="text-card-foreground mb-1">
            {t("schedule.sessionBooked")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("schedule.bookedFor", { date: dateLabel, time: timeRange })}
          </p>
        </div>
        <button
          onClick={onClose}
          className="mt-2 text-sm text-primary underline cursor-pointer"
        >
          {t("common.close")}
        </button>
      </div>
    );
  }

  return (
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
            const success = await onConfirm(recurring);
            setSaving(false);
            if (success) {
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
  const [error, setError] = useState("");

  const tutor = tutors.find((t) => t.id === selectedTutorId) ?? null;
  const weekendDates = getWeekendDates();
  const panelOpen = selection !== null && tutor !== null;

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

      const { data: studentProfile, error: studentError } = await supabase
        .from("student_profiles")
        .select("grade")
        .eq("uid", uid)
        .maybeSingle();

      if (studentError || !studentProfile) {
        if (!cancelled) {
          setError(studentError?.message ?? t("common.noStudentProfile"));
          setLoading(false);
        }
        return;
      }

      const band = gradeBand(studentProfile.grade);
      const availabilitySelect = ["uid", "grade", "grades_to_tutor", ...AVAILABILITY_COLUMNS].join(", ");
      const { data: tutorProfiles, error: tutorsError } = await supabase
        .from("tutor_profiles")
        .select(availabilitySelect);

      if (tutorsError) {
        if (!cancelled) {
          setError(tutorsError.message);
          setLoading(false);
        }
        return;
      }

      const matchingTutorProfiles = ((tutorProfiles ?? []) as unknown as TutorProfileRow[])
        .filter((profile) => matchesGradeToTutor(profile.grades_to_tutor, band));
      const tutorUids = matchingTutorProfiles.map((profile) => profile.uid);
      const profileNames = new Map<string, string>();
      const weekendStart = beijingSlotInstant(weekendDates.sat, 0);
      const weekendEnd = beijingSlotInstant(weekendDates.sun, SLOT_TIMES.length - 1, true);
      const bookedClassesByTutor = new Map<string, ClassRow[]>();

      if (tutorUids.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("uid, name")
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
        });

        const { data: bookedRows, error: bookedError } = await supabase
          .from("classes")
          .select("lesson_id, student_uid, teacher_uid, time, duration, status")
          .in("teacher_uid", tutorUids)
          .gte("time", weekendStart.toISOString())
          .lt("time", weekendEnd.toISOString())
          .or("status.is.null,status.neq.cancelled");

        if (bookedError) {
          if (!cancelled) {
            setError(bookedError.message);
            setLoading(false);
          }
          return;
        }

        ((bookedRows ?? []) as ClassRow[]).forEach((cls) => {
          bookedClassesByTutor.set(cls.teacher_uid, [
            ...(bookedClassesByTutor.get(cls.teacher_uid) ?? []),
            cls,
          ]);
        });
      }

      const { data: classRows, error: classesError } = await supabase
        .from("classes")
        .select("lesson_id, student_uid, teacher_uid, time, duration, status")
        .eq("student_uid", uid)
        .or("status.is.null,status.neq.cancelled");

      if (classesError) {
        if (!cancelled) {
          setError(classesError.message);
          setLoading(false);
        }
        return;
      }

      const completedClasses = ((classRows ?? []) as ClassRow[])
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
          .in("uid", pastTeacherUids);

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
        setTutors(matchingTutorProfiles.map((profile) => ({
          id: profile.uid,
          name: profileNames.get(profile.uid) ?? profile.uid,
          grade: profile.grade,
          gradesToTutor: serializeGradesToTutor(parseGradesToTutor(profile.grades_to_tutor)),
          availability: removeBookedSlots(
            profileAvailability(profile),
            bookedClassesByTutor.get(profile.uid) ?? [],
            weekendDates
          ),
        })));
        setPastTeachers(Array.from(teacherCounts.entries())
          .map(([uid, count]) => ({ uid, count, name: profileNames.get(uid) ?? uid }))
          .sort((a, b) => b.count - a.count));
        setLoading(false);
      }
    }

    loadScheduleData();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleSlotClick(day: Day, slotIdx: number) {
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

  function handleChangeTutor(id: string) {
    setSelectedTutorId(id);
    setSelection(null);
  }

  async function confirmBooking(recurring: boolean) {
    if (!selection || !tutor || !studentUid) return false;

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
      return false;
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
      return false;
    }

    let recurringLessonId: string | null = null;

    if (recurring) {
      const { data: recurringRow, error: recurringError } = await supabase
        .from("recurring_classes")
        .insert({
          student_uid: studentUid,
          teacher_uid: tutor.id,
          time: startsAt.toISOString(),
          duration,
        })
        .select("lesson_id")
        .single();

      if (recurringError || !recurringRow) {
        setError(recurringError?.message || t("schedule.slotAlreadyBooked"));
        return false;
      }

      recurringLessonId = recurringRow.lesson_id;
    }

    const { error: insertError } = await supabase.from("classes").insert({
      student_uid: studentUid,
      teacher_uid: tutor.id,
      time: startsAt.toISOString(),
      duration,
      ...(recurringLessonId ? { recurring_lesson_id: recurringLessonId } : {}),
    });

    if (insertError) {
      setError(insertError.message);
      return false;
    }

    if (recurringLessonId) {
      const { error: generateError } = await supabase.rpc("generate_recurring_classes");

      if (generateError) {
        setError(generateError.message);
        return false;
      }
    }

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
            }
          : item
      )
    );
    return true;
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-5 overflow-y-auto lg:flex-row lg:overflow-hidden">
      {/* Left: schedule picker */}
      <div className="flex min-w-0 flex-1 flex-col gap-5 lg:overflow-y-auto lg:pr-1">
        {/* Header */}
        <div>
          <h2 className="text-foreground">{t("schedule.studentTitle")}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("schedule.studentHelp")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t(weekendDates.afterStudentCutoff ? "schedule.studentCutoffActiveNote" : "schedule.timezoneNote")}
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
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

        {/* Legend + hint */}
        {tutor && (
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
              {t("schedule.noMatchingTutors")}
            </p>
          </div>
        ) : tutor ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DayColumn
              day="sat"
              date={weekendDates.sat}
              availability={tutor.availability.sat}
              selection={selection}
              onSelect={handleSlotClick}
            />
            <DayColumn
              day="sun"
              date={weekendDates.sun}
              availability={tutor.availability.sun}
              selection={selection}
              onSelect={handleSlotClick}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground py-20">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <CalendarDays size={28} className="opacity-40" />
            </div>
            <p className="text-sm">
              {t("schedule.selectTutorPrompt")}
            </p>
          </div>
        )}
      </div>

      {/* Right: booking panel */}
      <div
        className={`shrink-0 bg-card border border-border rounded-2xl overflow-hidden transition-all duration-300 ${
          panelOpen ? "min-h-[32rem] w-full opacity-100 lg:min-h-0 lg:w-80" : "h-0 w-full opacity-0 border-transparent lg:h-auto lg:w-0"
        }`}
      >
        {panelOpen && (
          <BookingPanel
            selection={selection!}
            tutor={tutor!}
            weekendDates={weekendDates}
            onClose={() => setSelection(null)}
            onConfirm={confirmBooking}
            lang={lang}
          />
        )}
      </div>
    </div>
  );
}

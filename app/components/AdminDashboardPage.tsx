"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as Select from "@radix-ui/react-select";
import { BookOpen, CalendarDays, ChevronDown, Clock, GraduationCap, Users, type LucideIcon } from "lucide-react";
import { supabase } from "../../lib/supabase/client";
import { useLanguage, type TranslationKey } from "../i18n";

type PersonType = "student" | "tutor";

const ALL_TIME_START = "2020-01-01";

type ProfileRow = {
  uid: string;
  role: "student" | "tutor" | "admin";
  name: string;
  created_at?: string;
};
type ClassRow = {
  lesson_id: string;
  student_uid: string;
  teacher_uid: string;
  time: string;
  duration: number;
  status?: string | null;
};
type VolunteerRecordRow = {
  tutor_uid: string;
  uploaded_at: string;
  minutes: number;
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

function formatDateLabel(value: string) {
  return parseDate(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

function hoursLabel(minutes: number) {
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`;
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

export function AdminDashboardPage({ lang }: { lang: string }) {
  const { t } = useLanguage();
  const maxDate = todayInput();
  const [startDate, setStartDate] = useState(oneMonthBeforeTodayInput);
  const [endDate, setEndDate] = useState(todayInput);
  const [personStart, setPersonStart] = useState(oneMonthBeforeTodayInput);
  const [personEnd, setPersonEnd] = useState(todayInput);
  const [personType, setPersonType] = useState<PersonType>("student");
  const [selectedPerson, setSelectedPerson] = useState("");
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
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
  const studentOptions = studentProfiles.map(({ uid, name }) => ({ uid, name }));
  const tutorOptions = tutorProfiles.map(({ uid, name }) => ({ uid, name }));
  const selectedOptions = personType === "student" ? studentOptions : tutorOptions;
  const completedClasses = classes.filter((cls) => classEndsAt(cls) <= now);
  const allTimeVolunteerMinutes = volunteerRecords.reduce((total, record) => total + record.minutes, 0);
  const periodClasses = completedClasses.filter((cls) => inDateRange(classStartsAt(cls), startDate, endDate));
  const periodStudentUids = Array.from(new Set(periodClasses.map((cls) => cls.student_uid)));
  const periodTutorUids = Array.from(new Set(periodClasses.map((cls) => cls.teacher_uid)));
  const periodVolunteerMinutes = volunteerRecords
    .filter((record) => inDateRange(new Date(record.uploaded_at), startDate, endDate))
    .reduce((total, record) => total + record.minutes, 0);
  const profileName = new Map(profiles.map((profile) => [profile.uid, profile.name]));
  const missingStudents = studentUids
    .filter((uid) => !periodStudentUids.includes(uid))
    .map((uid) => ({ uid, name: profileName.get(uid) ?? uid }));
  const missingTutors = tutorUids
    .filter((uid) => !periodTutorUids.includes(uid))
    .map((uid) => ({ uid, name: profileName.get(uid) ?? uid }));
  const studentGrowth = useMemo(() => growthPoints(startDate, endDate, studentProfiles, lang), [startDate, endDate, studentProfiles, lang]);
  const tutorGrowth = useMemo(() => growthPoints(startDate, endDate, tutorProfiles, lang), [startDate, endDate, tutorProfiles, lang]);
  const personClasses = selectedPerson
    ? completedClasses.filter((cls) =>
        personType === "student"
          ? cls.student_uid === selectedPerson
          : cls.teacher_uid === selectedPerson
      ).filter((cls) => inDateRange(classStartsAt(cls), personStart, personEnd))
    : [];
  const personVolunteerMinutes = selectedPerson && personType === "tutor"
    ? volunteerRecords
        .filter((record) => record.tutor_uid === selectedPerson && inDateRange(new Date(record.uploaded_at), personStart, personEnd))
        .reduce((total, record) => total + record.minutes, 0)
    : 0;
  const personStats =
    personType === "student"
      ? [
          { label: t("admin.classesAttended"), value: String(personClasses.length) },
          { label: t("admin.hoursSpentLearning"), value: hoursLabel(personClasses.reduce((total, cls) => total + classMinutes(cls), 0)) },
        ]
      : [
          { label: t("admin.studentsTutored"), value: String(new Set(personClasses.map((cls) => cls.student_uid)).size) },
          { label: t("dashboard.totalHoursSpent"), value: hoursLabel(personVolunteerMinutes) },
        ];

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
      ] = await Promise.all([
        supabase.from("profiles").select("uid, role, name, created_at"),
        supabase.from("student_profiles").select("uid"),
        supabase.from("tutor_profiles").select("uid"),
        supabase.from("classes").select("lesson_id, student_uid, teacher_uid, time, duration, status"),
        supabase.from("volunteer_records").select("tutor_uid, uploaded_at, minutes"),
      ]);

      if (cancelled) return;

      const firstError = profilesResult.error ?? studentsResult.error ?? tutorsResult.error ?? classesResult.error ?? volunteerResult.error;
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
      setLoading(false);
    }

    loadAdminData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const options = personType === "student" ? studentOptions : tutorOptions;
    setSelectedPerson((current) => options.some((option) => option.uid === current) ? current : options[0]?.uid ?? "");
  }, [personType, studentOptions, tutorOptions]);

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

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
          <div className="grid w-full gap-4 xl:max-w-sm">
            <h3 className="text-card-foreground">{t("admin.periodReport")}</h3>
            <CalendarInput label={t("common.startDate")} value={startDate} onChange={setStartDate} />
            <CalendarInput label={t("common.endDate")} value={endDate} onChange={(value) => setEndDate(clampDateInput(value, maxDate))} max={maxDate} />
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
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-card-foreground">{t("admin.individualQuery")}</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1.2fr]">
          <CalendarInput label={t("common.startDate")} value={personStart} onChange={setPersonStart} />
          <CalendarInput label={t("common.endDate")} value={personEnd} onChange={(value) => setPersonEnd(clampDateInput(value, maxDate))} max={maxDate} />
          <div>
            <span className="text-sm text-card-foreground">{t("common.type")}</span>
            <div className="mt-2 flex h-11 rounded-xl bg-muted p-1">
              {(["student", "tutor"] as PersonType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setPersonType(type);
                  }}
                  className={`flex-1 rounded-lg text-sm capitalize transition-all ${
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
              <SelectPerson type={personType} value={selectedPerson} onChange={setSelectedPerson} options={selectedOptions} />
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {personStats.map((stat) => (
            <StatBox key={stat.label} label={stat.label} value={stat.value} icon={personType === "student" ? GraduationCap : Users} />
          ))}
        </div>
      </section>
    </div>
  );
}

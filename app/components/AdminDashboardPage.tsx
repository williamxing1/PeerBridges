"use client";

import { useMemo, useState } from "react";
import * as Select from "@radix-ui/react-select";
import { BookOpen, CalendarDays, ChevronDown, Clock, GraduationCap, Users } from "lucide-react";

type PersonType = "student" | "tutor";

const STUDENTS = ["Sophie Chen", "Leo Wang", "Maya Patel", "Ethan Brooks", "Anna Li"];
const TUTORS = ["Dr. Sarah Mitchell", "Ms. Karen Liu", "Prof. James Okafor", "Mr. David Park"];

const ALL_TIME_START = "2020-01-01";
const ALL_TIME_END = "2026-06-09";

function parseDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function formatDateLabel(value: string) {
  return parseDate(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

function reportSeed(start: string, end: string) {
  const months = monthsBetween(start, end);
  return {
    activeStudents: Math.min(148, 32 + months * 3),
    studentHours: 240 + months * 28,
    activeTutors: Math.min(42, 9 + Math.floor(months * 0.9)),
    tutorHours: 190 + months * 22,
  };
}

function growthPoints(start: string, end: string, base: number, step: number) {
  const interval = intervalLabel(start, end);
  const startDate = parseDate(start);
  const months = monthsBetween(start, end);
  const count = interval === "Year" ? Math.min(7, Math.ceil(months / 12) + 1) : interval === "Month" ? Math.min(8, months) : 7;

  return Array.from({ length: count }).map((_, index) => {
    const date = new Date(startDate);
    if (interval === "Year") date.setFullYear(startDate.getFullYear() + index);
    if (interval === "Month") date.setMonth(startDate.getMonth() + index);
    if (interval === "Day") date.setDate(startDate.getDate() + index);

    return {
      label:
        interval === "Year"
          ? String(date.getFullYear())
          : interval === "Month"
            ? date.toLocaleDateString("en-US", { month: "short" })
            : date.toLocaleDateString("en-US", { weekday: "short" }),
      value: base + index * step + (index % 2 === 0 ? 3 : -2),
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
  icon: typeof Users;
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
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
    onChange(next.toISOString().slice(0, 10));
  }

  return (
    <div className="relative">
      <span className="text-sm text-card-foreground">{label}</span>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="mt-2 flex h-11 w-full items-center justify-between rounded-xl border border-border bg-background px-3.5 text-sm text-card-foreground outline-none transition hover:border-primary/40"
      >
        {formatDateLabel(value)}
        <CalendarDays size={15} className="text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute z-40 mt-2 w-72 rounded-xl border border-border bg-popover p-3 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <button type="button" onClick={() => updateMonth(-1)} className="rounded-lg px-2 py-1 text-sm hover:bg-accent">
              Prev
            </button>
            <p className="text-sm text-popover-foreground">
              {visibleDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
            <button type="button" onClick={() => updateMonth(1)} className="rounded-lg px-2 py-1 text-sm hover:bg-accent">
              Next
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
            {["S", "M", "T", "W", "T", "F", "S"].map((day) => (
              <span key={day} className="py-1">{day}</span>
            ))}
            {cells.map((day, index) =>
              day ? (
                <button
                  key={`${day}-${index}`}
                  type="button"
                  onClick={() => {
                    const next = new Date(year, month, Number(day));
                    onChange(next.toISOString().slice(0, 10));
                    setOpen(false);
                  }}
                  className={`rounded-lg py-2 text-sm transition-colors ${
                    Number(day) === visibleDate.getDate()
                      ? "bg-primary text-primary-foreground"
                      : "text-popover-foreground hover:bg-accent"
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
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="text-card-foreground">{title}</h3>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 h-56 w-full">
        {yTicks.map((tick) => (
          <g key={tick.value}>
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
}: {
  type: PersonType;
  value: string;
  onChange: (value: string) => void;
}) {
  const options = type === "student" ? STUDENTS : TUTORS;

  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger className="flex h-11 w-full items-center justify-between rounded-xl border border-border bg-background px-3.5 text-sm text-card-foreground outline-none transition data-[placeholder]:text-muted-foreground hover:border-primary/40">
        <Select.Value placeholder={`Select ${type}`} />
        <Select.Icon>
          <ChevronDown size={15} className="text-muted-foreground" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="z-50 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-xl">
          <Select.Viewport>
            {options.map((option) => (
              <Select.Item
                key={option}
                value={option}
                className="cursor-pointer rounded-lg px-3 py-2 text-sm text-popover-foreground outline-none data-[highlighted]:bg-accent"
              >
                <Select.ItemText>{option}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

export function AdminDashboardPage({ lang }: { lang: string }) {
  const [startDate, setStartDate] = useState(ALL_TIME_START);
  const [endDate, setEndDate] = useState(ALL_TIME_END);
  const [personStart, setPersonStart] = useState(ALL_TIME_START);
  const [personEnd, setPersonEnd] = useState(ALL_TIME_END);
  const [personType, setPersonType] = useState<PersonType>("student");
  const [selectedPerson, setSelectedPerson] = useState(STUDENTS[0]);

  const summary = useMemo(() => reportSeed(startDate, endDate), [startDate, endDate]);
  const interval = intervalLabel(startDate, endDate).toLowerCase();
  const studentGrowth = useMemo(() => growthPoints(startDate, endDate, 42, 16), [startDate, endDate]);
  const tutorGrowth = useMemo(() => growthPoints(startDate, endDate, 8, 5), [startDate, endDate]);
  const personMonths = monthsBetween(personStart, personEnd);
  const personStats =
    personType === "student"
      ? [
          { label: "Classes attended", value: String(Math.max(1, Math.floor(personMonths * 1.8))) },
          { label: "Hours spent learning", value: `${Math.max(2, personMonths * 4)}h` },
        ]
      : [
          { label: "Students tutored", value: String(Math.max(1, Math.floor(personMonths * 0.9))) },
          { label: "Total hours spent", value: `${Math.max(3, personMonths * 5)}h` },
        ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-foreground">{lang === "zh" ? "管理员仪表板" : "Administrator Dashboard"}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Program-wide reporting and participation overview.</p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-card-foreground">All-time overview</h3>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <StatBox label="# of students" value="148" icon={GraduationCap} />
          <StatBox label="# of teachers" value="42" icon={Users} />
          <StatBox label="# of classes taught" value="1,284" icon={BookOpen} />
          <StatBox label="# of hours total" value="1,926h" icon={Clock} />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="grid w-full gap-4 lg:max-w-sm">
            <h3 className="text-card-foreground">Period report</h3>
            <CalendarInput label="Start date" value={startDate} onChange={setStartDate} />
            <CalendarInput label="End date" value={endDate} onChange={setEndDate} />
            <p className="text-xs text-muted-foreground">Chart interval: {interval}</p>
          </div>

          <div className="grid flex-1 gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              <StatBox label="# of students who attended classes" value={String(summary.activeStudents)} icon={GraduationCap} />
              <StatBox label="Total student learning hours" value={`${summary.studentHours}h`} icon={Clock} />
              <StatBox label="# of tutors who taught" value={String(summary.activeTutors)} icon={Users} />
              <StatBox label="Total tutor hours spent" value={`${summary.tutorHours}h`} icon={Clock} />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-sm text-card-foreground">Students who did not attend</p>
                <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
                  {["Anna Li", "Ethan Brooks", "Grace Huang"].map((name) => <span key={name}>{name}</span>)}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-sm text-card-foreground">Tutors who did not teach</p>
                <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
                  {["Mr. David Park", "Ms. Rachel Nguyen"].map((name) => <span key={name}>{name}</span>)}
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <LineChart title="Student population growth" points={studentGrowth} />
              <LineChart title="Teacher population growth" points={tutorGrowth} />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-card-foreground">Individual query</h3>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr_1fr_1.2fr]">
          <CalendarInput label="Start date" value={personStart} onChange={setPersonStart} />
          <CalendarInput label="End date" value={personEnd} onChange={setPersonEnd} />
          <div>
            <span className="text-sm text-card-foreground">Type</span>
            <div className="mt-2 flex h-11 rounded-xl bg-muted p-1">
              {(["student", "tutor"] as PersonType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setPersonType(type);
                    setSelectedPerson(type === "student" ? STUDENTS[0] : TUTORS[0]);
                  }}
                  className={`flex-1 rounded-lg text-sm capitalize transition-all ${
                    personType === type ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="text-sm text-card-foreground">Name</span>
            <div className="mt-2">
              <SelectPerson type={personType} value={selectedPerson} onChange={setSelectedPerson} />
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {personStats.map((stat) => (
            <StatBox key={stat.label} label={stat.label} value={stat.value} icon={personType === "student" ? GraduationCap : Users} />
          ))}
        </div>
      </section>
    </div>
  );
}

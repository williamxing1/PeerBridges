"use client";

import { useState } from "react";
import * as Select from "@radix-ui/react-select";
import { ChevronDown, ChevronRight, X, CalendarDays, Clock, User, CheckCircle2 } from "lucide-react";

// ─── DATA ─────────────────────────────────────────────────────────────────────

const TUTORS = [
  {
    id: 1,
    name: "Dr. Sarah Mitchell",
    subject: "AP Calculus",
    avatar: "https://images.unsplash.com/photo-1590650213165-c1fef80648c4?w=60&h=60&fit=crop&auto=format",
    subjectColor: "bg-violet-100 text-violet-700",
    // slot indices 0–9 = 7:00, 7:30, 8:00, 8:30, 9:00, 9:30, 10:00, 10:30, 11:00, 11:30
    availability: {
      sat: [0, 1, 2, 4, 5, 8, 9],
      sun: [2, 3, 4, 6, 7, 8],
    },
  },
  {
    id: 2,
    name: "Ms. Karen Liu",
    subject: "English Literature",
    avatar: "https://images.unsplash.com/photo-1573496799652-408c2ac9fe98?w=60&h=60&fit=crop&auto=format",
    subjectColor: "bg-emerald-100 text-emerald-700",
    availability: {
      sat: [2, 3, 6, 7, 8, 9],
      sun: [0, 1, 4, 5, 6, 9],
    },
  },
  {
    id: 3,
    name: "Mr. David Park",
    subject: "SAT / ACT Test Prep",
    avatar: "https://images.unsplash.com/photo-1574281570877-bd815ebb50a4?w=60&h=60&fit=crop&auto=format",
    subjectColor: "bg-orange-100 text-orange-700",
    availability: {
      sat: [0, 1, 2, 3, 7, 8],
      sun: [3, 4, 5, 6, 7],
    },
  },
  {
    id: 4,
    name: "Prof. James Okafor",
    subject: "Chemistry & Physics",
    avatar: "https://images.unsplash.com/photo-1758685734503-58a8accc24e8?w=60&h=60&fit=crop&auto=format",
    subjectColor: "bg-sky-100 text-sky-700",
    availability: {
      sat: [4, 5, 6, 7, 8, 9],
      sun: [0, 1, 2, 5, 6, 8, 9],
    },
  },
  {
    id: 5,
    name: "Ms. Rachel Nguyen",
    subject: "History & Social Studies",
    avatar: "https://images.unsplash.com/photo-1573496800808-56566a492b63?w=60&h=60&fit=crop&auto=format",
    subjectColor: "bg-rose-100 text-rose-700",
    availability: {
      sat: [1, 2, 3, 4, 8, 9],
      sun: [2, 3, 6, 7, 8, 9],
    },
  },
];

// Next Saturday and Sunday
function getWeekendDates() {
  const today = new Date(2026, 5, 9); // June 9 2026 (Tuesday)
  const dayOfWeek = today.getDay(); // 2 = Tuesday
  const daysUntilSat = (6 - dayOfWeek + 7) % 7 || 7;
  const sat = new Date(today);
  sat.setDate(today.getDate() + daysUntilSat);
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  return { sat, sun };
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

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Day = "sat" | "sun";
interface Selection { day: Day; slots: number[] }

// ─── SLOT BUTTON ──────────────────────────────────────────────────────────────

function SlotButton({
  slotIdx,
  day,
  available,
  selection,
  onSelect,
}: {
  slotIdx: number;
  day: Day;
  available: boolean;
  selection: Selection | null;
  onSelect: (day: Day, slotIdx: number) => void;
}) {
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
      <span>{SLOT_TIMES[slotIdx]}</span>
      {available && !isSelected && (
        <span className="opacity-40 text-[10px]">Available</span>
      )}
      {isSelected && isFirstSelected && !isTwoSlot && (
        <span className="text-[10px] opacity-80">30 min</span>
      )}
      {isSelected && isLastSelected && isTwoSlot && (
        <span className="text-[10px] opacity-80">1 hr</span>
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
  return (
    <div className="flex flex-col gap-1.5">
      <div className="mb-2">
        <p className="text-card-foreground text-sm">{day === "sat" ? "Saturday" : "Sunday"}</p>
        <p className="text-xs text-muted-foreground">{formatDate(date)}</p>
      </div>
      {SLOT_TIMES.map((_, idx) => (
        <SlotButton
          key={idx}
          slotIdx={idx}
          day={day}
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
  lang,
}: {
  selection: Selection;
  tutor: typeof TUTORS[0];
  weekendDates: { sat: Date; sun: Date };
  onClose: () => void;
  lang: string;
}) {
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const date = weekendDates[selection.day];
  const startSlot = selection.slots[0];
  const endSlot = selection.slots[selection.slots.length - 1];
  const duration = selection.slots.length === 2 ? "1 hour" : "30 minutes";
  const timeRange = `${SLOT_TIMES[startSlot]} – ${SLOT_ENDS[endSlot]}`;
  const dateLabel = formatDate(date);

  if (confirmed) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 size={28} className="text-emerald-600" />
        </div>
        <div>
          <p className="text-card-foreground mb-1">
            {lang === "zh" ? "预约成功！" : "Session Booked!"}
          </p>
          <p className="text-sm text-muted-foreground">
            {lang === "zh"
              ? `您的课程已安排于 ${dateLabel}，${timeRange}。`
              : `Your session with ${tutor.name} is confirmed for ${dateLabel} at ${timeRange}.`}
          </p>
        </div>
        <button
          onClick={onClose}
          className="mt-2 text-sm text-primary underline cursor-pointer"
        >
          {lang === "zh" ? "关闭" : "Close"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
        <p className="text-card-foreground text-sm">
          {lang === "zh" ? "确认预约" : "Confirm Booking"}
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
          <img
            src={tutor.avatar}
            alt={tutor.name}
            className="w-10 h-10 rounded-full object-cover shrink-0"
          />
          <div>
            <p className="text-sm text-card-foreground">{tutor.name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${tutor.subjectColor}`}>
              {tutor.subject}
            </span>
          </div>
        </div>

        {/* Session details */}
        <div className="flex flex-col gap-2.5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {lang === "zh" ? "课程详情" : "Session Details"}
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
                {lang === "zh" ? "时长：" : "Duration: "}
                <span className="text-primary">{duration}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-muted-foreground uppercase tracking-wide">
            {lang === "zh" ? "有什么想提前分享的吗？" : "Anything to share for this session?"}
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              lang === "zh"
                ? "例如：我在相关速率的部分有点卡住了……"
                : "e.g. I've been stuck on related rates problems and want to focus on those..."
            }
            rows={4}
            className="w-full bg-muted rounded-xl px-3.5 py-3 text-sm text-card-foreground placeholder:text-muted-foreground resize-none outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border shrink-0">
        <button
          onClick={() => setConfirmed(true)}
          className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm hover:bg-primary/90 transition-colors cursor-pointer shadow-sm"
        >
          {lang === "zh" ? "确认预约" : "Confirm Booking"}
        </button>
        <p className="text-center text-xs text-muted-foreground mt-2.5">
          {lang === "zh"
            ? "提交后，老师将收到通知。"
            : "Your tutor will be notified once confirmed."}
        </p>
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export function SchedulePage({ lang }: { lang: string }) {
  const [selectedTutorId, setSelectedTutorId] = useState<string>("");
  const [selection, setSelection] = useState<Selection | null>(null);

  const tutor = TUTORS.find((t) => String(t.id) === selectedTutorId) ?? null;
  const weekendDates = getWeekendDates();
  const panelOpen = selection !== null && tutor !== null;

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

  return (
    <div className="flex gap-5 h-full min-h-0 overflow-hidden">
      {/* Left: schedule picker */}
      <div className="flex-1 flex flex-col gap-5 min-w-0 overflow-y-auto pr-1">
        {/* Header */}
        <div>
          <h2 className="text-foreground">{lang === "zh" ? "预约课程" : "Schedule a Session"}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {lang === "zh"
              ? "选择一位老师，查看可用时间段并选择你的时间。"
              : "Select a tutor, then pick one or two consecutive slots to book a session."}
          </p>
        </div>

        {/* Tutor dropdown */}
        <Select.Root value={selectedTutorId} onValueChange={handleChangeTutor}>
          <Select.Trigger className="flex items-center justify-between gap-2 w-full max-w-sm bg-card border border-border rounded-xl px-4 py-3 text-sm text-card-foreground hover:border-primary/40 transition-colors cursor-pointer outline-none data-[placeholder]:text-muted-foreground">
            <div className="flex items-center gap-2.5 min-w-0">
              {tutor && (
                <img src={tutor.avatar} alt={tutor.name} className="w-6 h-6 rounded-full object-cover shrink-0" />
              )}
              <Select.Value placeholder={lang === "zh" ? "选择老师…" : "Select a tutor…"} />
            </div>
            <Select.Icon>
              <ChevronDown size={15} className="text-muted-foreground shrink-0" />
            </Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Content className="bg-popover border border-border rounded-xl shadow-xl z-50 w-[--radix-select-trigger-width] overflow-hidden">
              <Select.Viewport className="p-1.5">
                {TUTORS.map((t) => (
                  <Select.Item
                    key={t.id}
                    value={String(t.id)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-popover-foreground cursor-pointer outline-none data-[highlighted]:bg-accent"
                  >
                    <img src={t.avatar} alt={t.name} className="w-7 h-7 rounded-full object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <Select.ItemText>{t.name}</Select.ItemText>
                      <p className="text-xs text-muted-foreground">{t.subject}</p>
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
              {lang === "zh" ? "已选" : "Selected"}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-card border border-border inline-block" />
              {lang === "zh" ? "可用" : "Available"}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-muted/50 inline-block" />
              {lang === "zh" ? "不可用" : "Unavailable"}
            </span>
            <span className="text-muted-foreground/70">
              {lang === "zh"
                ? "· 选择相邻两个时间段预约1小时课程"
                : "· Select 2 consecutive slots to book a 1-hour session"}
            </span>
          </div>
        )}

        {/* Time grid */}
        {tutor ? (
          <div className="grid grid-cols-2 gap-4">
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
              {lang === "zh" ? "请先选择一位老师以查看可用时间。" : "Select a tutor above to see their availability."}
            </p>
          </div>
        )}
      </div>

      {/* Right: booking panel */}
      <div
        className={`shrink-0 bg-card border border-border rounded-2xl overflow-hidden transition-all duration-300 ${
          panelOpen ? "w-80 opacity-100" : "w-0 opacity-0 border-transparent"
        }`}
      >
        {panelOpen && (
          <BookingPanel
            selection={selection!}
            tutor={tutor!}
            weekendDates={weekendDates}
            onClose={() => setSelection(null)}
            lang={lang}
          />
        )}
      </div>
    </div>
  );
}

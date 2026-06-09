"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CalendarDays, Clock, User, X } from "lucide-react";

type Day = "sat" | "sun";
type Availability = Record<Day, number[]>;
type Booking = {
  student: string;
  note: string;
  date: string;
  time: string;
};

const SLOT_TIMES = [
  "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM",
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM",
];

const ALL_SLOT_INDICES = SLOT_TIMES.map((_, index) => index);

const INITIAL_BOOKINGS: Record<string, Booking> = {
  "sat-2": {
    student: "Sophie Chen",
    note: "I'd like to review the homework questions from last week before starting the new lesson.",
    date: "Saturday, June 13",
    time: "8:00 AM – 8:30 AM",
  },
  "sun-4": {
    student: "Leo Wang",
    note: "Please focus on speaking practice and pronunciation.",
    date: "Sunday, June 14",
    time: "9:00 AM – 9:30 AM",
  },
};

function getWeekendDates() {
  const today = new Date(2026, 5, 9);
  const dayOfWeek = today.getDay();
  const daysUntilSat = (6 - dayOfWeek + 7) % 7 || 7;
  const sat = new Date(today);
  sat.setDate(today.getDate() + daysUntilSat);
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  return { sat, sun };
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function slotKey(day: Day, slotIdx: number) {
  return `${day}-${slotIdx}`;
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
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
        <p className="text-card-foreground text-sm">
          {lang === "zh" ? "已预约课程" : "Booked Session"}
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
            <p className="text-xs text-muted-foreground">{lang === "zh" ? "学生" : "Student"}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {lang === "zh" ? "课程详情" : "Session Details"}
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
            {lang === "zh" ? "学生备注" : "Student Note"}
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
          Mark unavailable
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
  return (
    <Dialog.Root open={booking !== null} onOpenChange={(open) => !open && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-5 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-card-foreground">
                Cancel booked class?
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-muted-foreground leading-relaxed">
                You will cancel the class with {booking?.student}. Are you sure?
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
              No
            </button>
            <button
              onClick={onConfirm}
              className="rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Confirm
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
  let stateClass = "bg-muted/50 text-muted-foreground/40 border-transparent hover:bg-muted";
  let label = "Unavailable";

  if (booking && available) {
    stateClass = "bg-emerald-50 text-emerald-900 border-emerald-200 hover:border-emerald-300";
    label = booking.student;
  } else if (available) {
    stateClass = "bg-card text-card-foreground border-border hover:border-primary/40 hover:bg-accent";
    label = "Available";
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
  return (
    <div className="flex flex-col gap-1.5">
      <div className="mb-2">
        <p className="text-card-foreground text-sm">{day === "sat" ? "Saturday" : "Sunday"}</p>
        <p className="text-xs text-muted-foreground">{formatDate(date)}</p>
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
  const weekendDates = getWeekendDates();
  const [availability, setAvailability] = useState<Availability>({
    sat: ALL_SLOT_INDICES,
    sun: ALL_SLOT_INDICES,
  });
  const [bookings, setBookings] = useState<Record<string, Booking>>(INITIAL_BOOKINGS);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [selectedBookingKey, setSelectedBookingKey] = useState<string | null>(null);
  const [pendingCancel, setPendingCancel] = useState<{ day: Day; slotIdx: number; booking: Booking } | null>(null);

  const selectedBooking = selectedBookingKey ? bookings[selectedBookingKey] : null;
  const hasAvailability = availability.sat.length + availability.sun.length > 0;

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

  return (
    <>
      <div className="flex gap-5 h-full min-h-0 overflow-hidden">
        <div className="flex-1 flex flex-col gap-5 min-w-0 overflow-y-auto pr-1">
          <div>
            <h2 className="text-foreground">{lang === "zh" ? "设置可用时间" : "Set Availability"}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {lang === "zh"
                ? "点击时间段来标记你本周可以上课的时间。"
                : "Click time slots to mark when you are available this week."}
            </p>
          </div>

          {!saved && !hasAvailability && (
            <div className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-card-foreground text-sm">You haven't selected your availability for this week.</p>
                <p className="text-sm text-muted-foreground mt-0.5">Choose the slots you can teach, then save your availability.</p>
              </div>
              <CalendarDays size={28} className="text-primary shrink-0" />
            </div>
          )}

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-card border border-border inline-block" />
                Available
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-muted/50 inline-block" />
                Unavailable
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-50 border border-emerald-200 inline-block" />
                Booked
              </span>
            </div>
            <button
              onClick={() => {
                setSaved(true);
                setDirty(false);
              }}
              disabled={!hasAvailability}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saved && !dirty ? "Availability saved" : "Save availability"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            selectedBooking ? "w-80 opacity-100" : "w-0 opacity-0 border-transparent"
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

function dateValue(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function calendarDateValue(date: Date) {
  return dateValue(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function beijingDateParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function beijingCalendarToday(now = new Date()) {
  const values = beijingDateParts(now);
  return new Date(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day)
  );
}

export function currentBeijingWeekendDate(now = new Date()) {
  const values = beijingDateParts(now);
  const beijingDate = new Date(Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day)
  ));
  const day = beijingDate.getUTCDay();
  const daysUntilSaturday = day === 0 ? -1 : (6 - day + 7) % 7;
  beijingDate.setUTCDate(beijingDate.getUTCDate() + daysUntilSaturday);
  return dateValue(
    beijingDate.getUTCFullYear(),
    beijingDate.getUTCMonth() + 1,
    beijingDate.getUTCDate()
  );
}

export function beijingMidnightInstant(calendarDate: Date, dayOffset = 0) {
  return new Date(Date.UTC(
    calendarDate.getFullYear(),
    calendarDate.getMonth(),
    calendarDate.getDate() + dayOffset,
    -8
  ));
}

export function formatLocalDeadline(instant: Date, lang: string) {
  return instant.toLocaleString(lang === "zh" ? "zh-CN" : "en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

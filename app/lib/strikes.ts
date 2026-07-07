import { supabase } from "../../lib/supabase/client";

export type StrikeStatus = {
  strikes: number;
  bannedUntil: string | null;
  bannedCount: number;
  isBanned: boolean;
};

export const emptyStrikeStatus: StrikeStatus = {
  strikes: 0,
  bannedUntil: null,
  bannedCount: 0,
  isBanned: false,
};

export async function refreshStrikeStatus() {
  const { data, error } = await supabase.rpc("refresh_current_strike_status");
  if (error) return { status: emptyStrikeStatus, error };

  const row = (Array.isArray(data) ? data[0] : data) as {
    strikes?: number;
    banned_until?: string | null;
    banned_count?: number;
    is_banned?: boolean;
  } | null;

  return {
    status: {
      strikes: row?.strikes ?? 0,
      bannedUntil: row?.banned_until ?? null,
      bannedCount: row?.banned_count ?? 0,
      isBanned: row?.is_banned ?? false,
    },
    error: null,
  };
}

export function cancellationDeadline(
  startsAt: string | Date,
  role: "student" | "tutor"
) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).formatToParts(new Date(startsAt));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const classDay = Number(values.day);
  const saturdayDay = classDay - (values.weekday === "Sun" ? 1 : 0);
  const deadlineDay = saturdayDay - (role === "tutor" ? 1 : 0);

  return new Date(Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    deadlineDay,
    -8
  ));
}

export function isLateCancellation(
  startsAt: string | Date | undefined,
  role: "student" | "tutor"
) {
  return Boolean(startsAt && new Date() >= cancellationDeadline(startsAt, role));
}

"use client";

import type { FormEvent, ReactNode } from "react";
import { Suspense } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { StudentSchedulePage } from "./components/StudentSchedulePage";
import { TutorSchedulePage } from "./components/TutorSchedulePage";
import { VolunteerRecordPage } from "./components/VolunteerRecordPage";
import { AdminDashboardPage, AdminIndividualQueryPage } from "./components/AdminDashboardPage";
import { ManageMediaPage, MediaListPage } from "./components/MediaPages";
import { CommunicationsPage } from "./components/CommunicationsPage";
import { StudentSpeakingSamplesPage } from "./components/SpeakingSamplesPage";
import { AccountRulesDialog } from "./components/AccountRulesDialog";
import { LanguageSelect, optionLabel, useLanguage } from "./i18n";
import { countryLabelForValue, countryOptionsForLang } from "./data/countries";
import { safeExternalUrl } from "./lib/security";
import { beijingCalendarToday, currentBeijingWeekendDate } from "./lib/weekend";
import { isValidMeetingPassword, normalizeVoovMeetingUrl } from "./lib/tutorMeeting";
import { dispatchReminderEmails } from "./lib/reminderEmails";
import {
  emptyStrikeStatus,
  isLateCancellation,
  refreshStrikeStatus,
  type StrikeStatus,
} from "./lib/strikes";
import { supabase } from "../lib/supabase/client";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Tabs from "@radix-ui/react-tabs";
import * as Select from "@radix-ui/react-select";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ChevronDown,
  LayoutDashboard,
  CalendarDays,
  Star,
  BookOpen,
  Clock,
  FileText,
  GraduationCap,
  MessageSquare,
  Mic2,
  CheckCircle2,
  Settings,
  LogOut,
  User,
  Menu,
  X,
  ChevronRight,
  Users,
  AlertTriangle,
  CircleHelp,
  Eye,
  EyeOff,
  KeyRound,
} from "lucide-react";

{/* MARKER-MAKE-KIT-INVOKED */}

// ─── DATA ────────────────────────────────────────────────────────────────────

const STUDENT = {
  name: "Sophie Chen",
  email: "sophie@example.com",
};

const TUTOR = {
  name: "Dr. Sarah Mitchell",
  email: "sarah@example.com",
};

const ADMIN = {
  name: "Admin User",
  email: "admin@example.com",
};

const LAST_FEEDBACK = {
  teacher: "Dr. Sarah Mitchell",
  stars: 4,
  subject: "AP Calculus",
  text: "Sophie showed excellent progress this session — her understanding of implicit differentiation has improved significantly. She tackled multi-step problems with more confidence and asked great clarifying questions. I'd recommend spending a bit more time on related rates before the next exam. Keep it up!",
  date: "Jun 7, 2026",
};

const ASSIGNMENTS = [
  { id: 1, name: "Calculus Problem Set 5", due: "Jun 11, 2026", subject: "Calculus", urgent: true, description: "Complete exercises 4.1–4.4 on implicit differentiation and related rates. Show all work." },
  { id: 2, name: "Essay: The Great Gatsby", due: "Jun 13, 2026", subject: "English Lit", urgent: false, description: "Write a 500-word analysis of the green light motif and what it represents for Gatsby's character arc." },
];

const PENDING_EVALUATIONS = [
  {
    id: 1,
    student: "Sophie Chen",
    name: "AP Calculus — Limits & Continuity",
    date: "Jun 11, 2026",
    time: "4:00 PM – 5:30 PM",
  },
  {
    id: 2,
    student: "Leo Wang",
    name: "English Literature — Essay Review",
    date: "Jun 10, 2026",
    time: "6:00 PM – 7:00 PM",
  },
];

const SCHEDULED_CLASSES = [
  {
    id: 1,
    name: "AP Calculus — Limits & Continuity",
    teacher: "Dr. Sarah Mitchell",
    date: "Jun 11, 2026",
    time: "4:00 PM – 5:30 PM",
    subject: "Calculus",
    subjectColor: "bg-violet-100 text-violet-700",
  },
];

const COMPLETED_CLASSES = [
  {
    id: 4,
    name: "AP Calculus — Implicit Differentiation",
    teacher: "Dr. Sarah Mitchell",
    date: "Jun 7, 2026",
    time: "4:00 PM – 5:30 PM",
    subject: "Calculus",
    subjectColor: "bg-violet-100 text-violet-700",
    feedback: LAST_FEEDBACK,
  },
  {
    id: 5,
    name: "Chemistry — Stoichiometry Review",
    teacher: "Prof. James Okafor",
    date: "Jun 5, 2026",
    time: "2:00 PM – 3:30 PM",
    subject: "Chemistry",
    subjectColor: "bg-sky-100 text-sky-700",
    feedback: {
      teacher: "Prof. James Okafor",
      stars: 5,
      subject: "Chemistry",
      text: "Outstanding session! Sophie nailed the mole-to-mass conversions and was one of the first to grasp limiting reagents. She's well-prepared for the upcoming lab practical.",
      date: "Jun 5, 2026",
    },
  },
  {
    id: 6,
    name: "SAT Reading — Passage Analysis",
    teacher: "Ms. Karen Liu",
    date: "Jun 3, 2026",
    time: "3:30 PM – 5:00 PM",
    subject: "Test Prep",
    subjectColor: "bg-orange-100 text-orange-700",
    feedback: {
      teacher: "Ms. Karen Liu",
      stars: 4,
      subject: "Test Prep",
      text: "Good focus on inference questions today. Sophie is getting faster at eliminating wrong answers, though she still rushes the final passage. Pacing drills before the next session should help a lot.",
      date: "Jun 3, 2026",
    },
  },
];

const storedUserKey = "tutorflow-user";
const storedUserUpdatedEvent = "tutorflow-user-updated";
const pendingEmailChangeKey = "peerbridges-pending-email-change";
const emailChangeConfirmationParam = "emailChangeConfirmation";
const gradeOptions = ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];

type StoredUser = {
  uid: string;
  role: AccountRole;
  name: string;
  email: string;
};

type PendingEmailChange = {
  uid: string;
  requestedEmail: string;
  stage: "awaiting_both" | "partially_confirmed";
};
type AccountRole = "student" | "tutor" | "admin";
type SettingsProfile = {
  uid: string;
  role: "student" | "tutor" | "admin";
  name: string;
  email: string;
  country: string;
  grade: string;
  school: string;
  classLink: string;
  meetingPassword: string;
};

type ClassRow = {
  lesson_id: string;
  student_uid: string;
  teacher_uid: string;
  time: string;
  duration: number;
  evaluation_completed: boolean;
  student_attended?: boolean;
  teacher_attended?: boolean;
  student_wants_to_share?: string | null;
  recurring_lesson_id?: string | null;
  status?: string | null;
};
type RecurringClassRow = {
  lesson_id: string;
  student_uid: string;
  teacher_uid: string;
  time: string;
  duration: number;
};
type BasicProfile = {
  uid: string;
  role?: "student" | "tutor" | "admin" | "deleted";
  name: string;
  student_wechat_id?: string | null;
  parent_wechat_id?: string | null;
};
type VolunteerRecordRow = {
  minutes: number;
};
type EvaluationRow = {
  evaluation_id: string;
  lesson_id: string;
  feedback: string;
  stars: number;
  created_at: string;
};
type AssignmentRow = {
  assignment_id: string;
  lesson_id: string | null;
  student_uid: string;
  teacher_uid: string;
  name: string;
  description: string;
  due_date: string;
  complete: boolean;
};
type TutorDetailsRow = {
  uid: string;
  class_link: string;
  meeting_password: string;
};
type StudentTutorDetails = {
  classLink: string;
  meetingPassword: string;
  tutorWechatId: string;
  parentWechatId: string;
  tutorEmail: string;
  parentEmail: string;
  preferredCommunication: "wechat" | "email" | "";
};
type UIAssignment = {
  id: string;
  name: string;
  description: string;
  assignedBy: string;
  assignedOn: string;
  due: string;
  status: "assigned" | "dueSoon" | "overdue";
  dueSoon: boolean;
  overdue: boolean;
};
type StudentFeedback = {
  teacher: string;
  text: string;
  stars: number;
  date: string;
};
type StudentDashboardData = {
  loading: boolean;
  error: string;
  strikeStatus: StrikeStatus;
  feedback: StudentFeedback | null;
  assignments: UIAssignment[];
  upcomingClasses: UIClass[];
  completedClasses: UIClass[];
  recurringClasses: UIRecurringClass[];
};

type UIClass = {
  id: string;
  name: string;
  student: string;
  studentUid: string;
  teacher: string;
  tutorName: string;
  teacherUid: string;
  displayPersonUid: string;
  displayPersonRole: "student" | "tutor";
  displayPersonName: string;
  descriptionLines: string[];
  date: string;
  time: string;
  startsAt: Date;
  endsAt: Date;
  minutes: number;
  evaluationCompleted: boolean;
  studentAttended?: boolean;
  teacherAttended?: boolean;
  recurringLessonId?: string | null;
  classLink?: string;
  meetingPassword?: string;
  feedback?: typeof LAST_FEEDBACK;
};
type CancelClassTarget = {
  id: string | number;
  recurringLessonId?: string | null;
  startsAt?: Date;
};
type UIRecurringClass = {
  id: string;
  nextLessonId: string;
  nextStartsAt: Date;
  personUid: string;
  personRole: "student" | "tutor";
  personName: string;
  day: string;
  time: string;
  duration: number;
  skippedDates: string[];
};

type TutorDashboardData = {
  loading: boolean;
  error: string;
  strikeStatus: StrikeStatus;
  availabilityNeedsSetup: boolean;
  stats: {
    totalClasses: number;
    studentsTaught: number;
    totalMinutes: number;
  };
  pendingEvaluations: UIClass[];
  upcomingClasses: UIClass[];
  completedClasses: UIClass[];
  recurringClasses: UIRecurringClass[];
};

const emptyTutorDashboardData: TutorDashboardData = {
  loading: true,
  error: "",
  strikeStatus: emptyStrikeStatus,
  availabilityNeedsSetup: false,
  stats: {
    totalClasses: 0,
    studentsTaught: 0,
    totalMinutes: 0,
  },
  pendingEvaluations: [],
  upcomingClasses: [],
  completedClasses: [],
  recurringClasses: [],
};

const emptyStudentDashboardData: StudentDashboardData = {
  loading: true,
  error: "",
  strikeStatus: emptyStrikeStatus,
  feedback: null,
  assignments: [],
  upcomingClasses: [],
  completedClasses: [],
  recurringClasses: [],
};

function localeForLang(lang: string) {
  return lang === "zh" ? "zh-CN" : "en-US";
}

function formatClassDateFromInstant(date: Date, lang: string) {
  return date.toLocaleDateString(localeForLang(lang), {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function aoeDeadlineInstant(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1, 11, 59, 59, 999));
}

function formatAoeDeadlineLocal(date: string, lang: string) {
  return aoeDeadlineInstant(date).toLocaleString(localeForLang(lang), {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function formatClassTimeFromInstant(date: Date, lang: string) {
  return date.toLocaleTimeString(localeForLang(lang), {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatBanEnd(value: string, lang: string) {
  return new Date(value).toLocaleString(localeForLang(lang), {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function strikeCountClass(strikes: number) {
  if (strikes === 0) return "text-emerald-700";
  if (strikes === 1) return "text-amber-700";
  if (strikes === 2) return "text-orange-700";
  return "font-semibold text-red-950";
}

function toUIRecurringClass(
  recurringClass: RecurringClassRow,
  nextLessonId: string,
  nextStartsAt: Date,
  personUid: string,
  personRole: "student" | "tutor",
  personName: string,
  skippedTimes: string[],
  lang: string
): UIRecurringClass {
  const startsAt = new Date(recurringClass.time);
  const endsAt = new Date(startsAt.getTime() + recurringClass.duration * 60000);
  return {
    id: recurringClass.lesson_id,
    nextLessonId,
    nextStartsAt,
    personUid,
    personRole,
    personName,
    day: startsAt.toLocaleDateString(localeForLang(lang), { weekday: "long" }),
    time: `${formatClassTimeFromInstant(startsAt, lang)} - ${formatClassTimeFromInstant(endsAt, lang)}`,
    duration: recurringClass.duration,
    skippedDates: skippedTimes.map((time) =>
      new Date(time).toLocaleDateString(localeForLang(lang), {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    ),
  };
}

async function loadRecurringSkippedDates(recurringClasses: RecurringClassRow[]) {
  const results = await Promise.all(
    recurringClasses.map(async (recurringClass) => {
      const { data, error } = await supabase.rpc("get_recurring_class_skipped_dates", {
        p_recurring_lesson_id: recurringClass.lesson_id,
      });
      return {
        lessonId: recurringClass.lesson_id,
        skippedTimes: ((data ?? []) as Array<{ skipped_time: string }>).map((row) => row.skipped_time),
        error,
      };
    })
  );

  return {
    skippedDatesBySeries: new Map(results.map((result) => [result.lessonId, result.skippedTimes])),
    error: results.find((result) => result.error)?.error ?? null,
  };
}

function getClassMinutes(cls: ClassRow) {
  return cls.duration;
}

function getClassStart(cls: ClassRow) {
  return new Date(cls.time);
}

function getClassEnd(cls: ClassRow) {
  return new Date(getClassStart(cls).getTime() + cls.duration * 60000);
}

function toUIClass(
  cls: ClassRow,
  studentProfiles: Map<string, BasicProfile>,
  teacherName: string,
  meetingDetails: { classLink: string; meetingPassword: string } | undefined,
  lang: string,
  labels: {
    unknownStudent: (uid: string) => string;
    classWith: (name: string) => string;
    studentNotes: (value: string) => string;
    studentWechatId: (value: string) => string;
    none: string;
  }
): UIClass {
  const startsAt = getClassStart(cls);
  const endsAt = getClassEnd(cls);
  const studentProfile = studentProfiles.get(cls.student_uid);
  const student = studentProfile?.name ?? labels.unknownStudent(cls.student_uid.slice(0, 8));
  const studentNote = cls.student_wants_to_share?.trim() || labels.none;
  const studentWechat =
    studentProfile?.student_wechat_id?.trim() ||
    studentProfile?.parent_wechat_id?.trim() ||
    labels.none;

  return {
    id: cls.lesson_id,
    name: labels.classWith(student),
    student,
    studentUid: cls.student_uid,
    teacher: teacherName,
    tutorName: teacherName,
    teacherUid: cls.teacher_uid,
    displayPersonUid: cls.student_uid,
    displayPersonRole: "student",
    displayPersonName: student,
    descriptionLines: [
      labels.studentNotes(studentNote),
      labels.studentWechatId(studentWechat),
    ],
    date: formatClassDateFromInstant(startsAt, lang),
    time: `${formatClassTimeFromInstant(startsAt, lang)} - ${formatClassTimeFromInstant(endsAt, lang)}`,
    startsAt,
    endsAt,
    minutes: getClassMinutes(cls),
    evaluationCompleted: cls.evaluation_completed,
    studentAttended: cls.student_attended,
    teacherAttended: cls.teacher_attended,
    recurringLessonId: cls.recurring_lesson_id,
    classLink: meetingDetails?.classLink,
    meetingPassword: meetingDetails?.meetingPassword,
    feedback: cls.evaluation_completed ? { ...LAST_FEEDBACK, date: formatClassDateFromInstant(startsAt, lang) } : undefined,
  };
}

function toStudentUIClass(
  cls: ClassRow,
  teacherNames: Map<string, string>,
  tutorDetails: Map<string, StudentTutorDetails>,
  evaluations: Map<string, EvaluationRow>,
  lang: string,
  labels: {
    tutor: string;
    chineseClass: string;
    myNote: (value: string) => string;
    tutorWechatId: (value: string) => string;
    parentWechatId: (value: string) => string;
    tutorAndParentWechatIds: (tutor: string, parent: string) => string;
    tutorEmail: (value: string) => string;
    parentEmail: (value: string) => string;
    tutorAndParentEmails: (tutor: string, parent: string) => string;
    preferredCommunication: (value: string) => string;
    none: string;
  }
): UIClass {
  const startsAt = getClassStart(cls);
  const endsAt = getClassEnd(cls);
  const teacher = teacherNames.get(cls.teacher_uid)?.trim() || labels.tutor;
  const details = tutorDetails.get(cls.teacher_uid);
  const evaluation = evaluations.get(cls.lesson_id);
  const studentNote = cls.student_wants_to_share?.trim() || labels.none;
  const wechatLines = details?.tutorWechatId && details.parentWechatId
    ? [labels.tutorAndParentWechatIds(details.tutorWechatId, details.parentWechatId)]
    : [
        ...(details?.tutorWechatId ? [labels.tutorWechatId(details.tutorWechatId)] : []),
        ...(details?.parentWechatId ? [labels.parentWechatId(details.parentWechatId)] : []),
      ];
  const emailLines = details?.tutorEmail && details.parentEmail
    ? [labels.tutorAndParentEmails(details.tutorEmail, details.parentEmail)]
    : [
        ...(details?.tutorEmail ? [labels.tutorEmail(details.tutorEmail)] : []),
        ...(details?.parentEmail ? [labels.parentEmail(details.parentEmail)] : []),
      ];

  return {
    id: cls.lesson_id,
    name: labels.chineseClass,
    student: "",
    studentUid: cls.student_uid,
    teacher,
    tutorName: teacher,
    teacherUid: cls.teacher_uid,
    displayPersonUid: cls.teacher_uid,
    displayPersonRole: "tutor",
    displayPersonName: teacher,
    descriptionLines: [
      labels.myNote(studentNote),
      ...wechatLines,
      ...emailLines,
      labels.preferredCommunication(details?.preferredCommunication || labels.none),
    ],
    date: formatClassDateFromInstant(startsAt, lang),
    time: `${formatClassTimeFromInstant(startsAt, lang)} - ${formatClassTimeFromInstant(endsAt, lang)}`,
    startsAt,
    endsAt,
    minutes: getClassMinutes(cls),
    evaluationCompleted: cls.evaluation_completed,
    studentAttended: cls.student_attended,
    teacherAttended: cls.teacher_attended,
    recurringLessonId: cls.recurring_lesson_id,
    classLink: details?.classLink,
    meetingPassword: details?.meetingPassword,
    feedback: evaluation
      ? {
          teacher,
          stars: evaluation.stars,
          subject: "",
          text: evaluation.feedback,
          date: formatClassDateFromInstant(startsAt, lang),
        }
      : undefined,
  };
}

function readStoredUser() {
  if (typeof window === "undefined") return null;

  try {
    const stored = sessionStorage.getItem(storedUserKey) || localStorage.getItem(storedUserKey);
    return stored ? (JSON.parse(stored) as StoredUser) : null;
  } catch {
    return null;
  }
}

function writeStoredUser(user: StoredUser) {
  if (typeof window === "undefined") return;

  const serialized = JSON.stringify(user);
  sessionStorage.setItem(storedUserKey, serialized);
  localStorage.setItem(storedUserKey, serialized);
  window.dispatchEvent(new CustomEvent<StoredUser>(storedUserUpdatedEvent, { detail: user }));
}

function readPendingEmailChange() {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(pendingEmailChangeKey);
    if (!stored) return null;
    const pending = JSON.parse(stored) as Partial<PendingEmailChange>;
    if (
      typeof pending.uid !== "string" ||
      typeof pending.requestedEmail !== "string" ||
      (pending.stage !== "awaiting_both" && pending.stage !== "partially_confirmed")
    ) {
      return null;
    }
    return pending as PendingEmailChange;
  } catch {
    return null;
  }
}

function writePendingEmailChange(pending: PendingEmailChange) {
  if (typeof window === "undefined") return;
  localStorage.setItem(pendingEmailChangeKey, JSON.stringify(pending));
}

function clearPendingEmailChange() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(pendingEmailChangeKey);
}

function clearStoredAuthState() {
  if (typeof window === "undefined") return;

  sessionStorage.removeItem(storedUserKey);
  localStorage.removeItem(storedUserKey);
  Object.keys(localStorage)
    .filter((key) => key.startsWith("sb-") && key.includes("auth-token"))
    .forEach((key) => localStorage.removeItem(key));
}

function SettingsField({
  label,
  value,
  onChange,
  type = "text",
  minLength,
  maxLength,
  inputMode,
  pattern,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  minLength?: number;
  maxLength?: number;
  inputMode?: "email" | "numeric" | "search" | "tel" | "text" | "url";
  pattern?: string;
}) {
  const { t } = useLanguage();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPassword = type === "password";

  return (
    <label className="block">
      <span className="text-sm text-card-foreground">{label}</span>
      <span className="relative mt-2 block">
        <input
          type={isPassword && passwordVisible ? "text" : type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          minLength={minLength}
          maxLength={maxLength}
          inputMode={inputMode}
          pattern={pattern}
          className={`h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition focus:border-primary/40 focus:bg-card ${isPassword ? "pr-11" : ""}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setPasswordVisible((visible) => !visible)}
            aria-label={t(passwordVisible ? "common.hidePassword" : "common.showPassword")}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-card-foreground"
          >
            {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </span>
    </label>
  );
}

function SettingsSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  const { lang, t } = useLanguage();
  return (
    <label className="block">
      <span className="text-sm text-card-foreground">{label}</span>
      <Select.Root value={value} onValueChange={onChange}>
        <Select.Trigger className="mt-2 flex h-11 w-full items-center justify-between rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition data-[placeholder]:text-muted-foreground focus:border-primary/40 focus:bg-card">
          <Select.Value placeholder={t("common.selectLabel", { label: label.toLowerCase() })} />
          <Select.Icon>
            <ChevronDown size={16} className="text-muted-foreground" />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content className="z-[70] overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-xl">
            <Select.Viewport>
              {options.map((option) => (
                <Select.Item
                  key={option}
                  value={option}
                  className="flex cursor-pointer items-center rounded-lg px-3 py-2 text-sm text-popover-foreground outline-none data-[highlighted]:bg-accent"
                >
                  <Select.ItemText>{optionLabel(option, lang)}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </label>
  );
}

function SettingsCountrySelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { lang, t } = useLanguage();
  const options = countryOptionsForLang(lang);

  return (
    <label className="block">
      <span className="text-sm text-card-foreground">{label}</span>
      <Select.Root value={value} onValueChange={onChange}>
        <Select.Trigger className="mt-2 flex h-11 w-full items-center justify-between rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition data-[placeholder]:text-muted-foreground focus:border-primary/40 focus:bg-card">
          <Select.Value placeholder={t("common.selectLabel", { label: label.toLowerCase() })} />
          <Select.Icon>
            <ChevronDown size={16} className="text-muted-foreground" />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content className="z-[70] max-h-72 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-xl">
            <Select.Viewport>
              {options.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  className="flex cursor-pointer items-center rounded-lg px-3 py-2 text-sm text-popover-foreground outline-none data-[highlighted]:bg-accent"
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </label>
  );
}

function AccountSettingsDialog({
  open,
  onOpenChange,
  fallbackUser,
  onUserUpdated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fallbackUser: typeof STUDENT;
  onUserUpdated: (user: StoredUser) => void;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const [tab, setTab] = useState<"general" | "account">("general");
  const [profile, setProfile] = useState<SettingsProfile>({
    uid: "",
    role: "student",
    name: fallbackUser.name,
    email: fallbackUser.email,
    country: "",
    grade: "",
    school: "",
    classLink: "",
    meetingPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"success" | "pending">("success");
  const [error, setError] = useState("");
  const [deleteStep, setDeleteStep] = useState<"closed" | "code" | "confirm">("closed");
  const [deleteCode, setDeleteCode] = useState("");
  const [deleteEmail, setDeleteEmail] = useState("");
  const [deleteBusy, setDeleteBusy] = useState<"sending" | "verifying" | "deleting" | null>(null);

  function updateProfile(key: keyof SettingsProfile, value: string) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function replaceEmailChangeConfirmationStatus(status: "pending" | "success") {
    const url = new URL(window.location.href);
    url.searchParams.set(emailChangeConfirmationParam, status);
    url.searchParams.delete("message");
    url.searchParams.delete("sb");
    url.hash = "";
    router.replace(`${url.pathname}${url.search}`);
  }

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function loadSettings() {
      setLoading(true);
      setMessage("");
      setMessageKind("success");
      setError("");

      const { data: authData, error: authError } = await supabase.auth.getUser();
      const stored = readStoredUser();
      const uid = authData.user?.id ?? stored?.uid;

      if (authError || !uid) {
        if (!cancelled) {
          setError(authError?.message ?? t("settings.noSignedInUser"));
          setLoading(false);
        }
        return;
      }

      const authEmail = authData.user?.email?.trim() ?? "";
      const authPendingEmail = authData.user?.new_email?.trim() ?? "";
      const isEmailChangeConfirmation = new URLSearchParams(window.location.search)
        .has(emailChangeConfirmationParam);
      let pendingEmailChange = readPendingEmailChange();
      if (pendingEmailChange?.uid !== uid) {
        pendingEmailChange = null;
      }

      if (isEmailChangeConfirmation) {
        const requestedEmail = pendingEmailChange?.requestedEmail || authPendingEmail;
        if (requestedEmail && authEmail.toLowerCase() !== requestedEmail.toLowerCase()) {
          pendingEmailChange = {
            uid,
            requestedEmail,
            stage: "partially_confirmed",
          };
          writePendingEmailChange(pendingEmailChange);
          setMessageKind("pending");
          setMessage(t("settings.emailPartiallyConfirmed"));
          replaceEmailChangeConfirmationStatus("pending");
        } else {
          clearPendingEmailChange();
          pendingEmailChange = null;
          setMessageKind("success");
          setMessage(t("settings.emailChanged"));
          replaceEmailChangeConfirmationStatus("success");
        }
      } else if (pendingEmailChange) {
        if (authEmail.toLowerCase() === pendingEmailChange.requestedEmail.toLowerCase()) {
          clearPendingEmailChange();
          pendingEmailChange = null;
          setMessageKind("success");
          setMessage(t("settings.emailChanged"));
        } else {
          setMessageKind("pending");
          setMessage(t(
            pendingEmailChange.stage === "partially_confirmed"
              ? "settings.emailPartiallyConfirmed"
              : "settings.emailConfirmationSent"
          ));
        }
      }

      const { data: baseProfile, error: profileError } = await supabase
        .from("profiles")
        .select("uid, role, name, email")
        .eq("uid", uid)
        .single();

      if (profileError) {
        if (!cancelled) {
          setError(profileError.message);
          setLoading(false);
        }
        return;
      }

      const nextProfile: SettingsProfile = {
        uid,
        role: baseProfile.role,
        name: baseProfile.name,
        email: pendingEmailChange?.requestedEmail ?? baseProfile.email,
        country: "",
        grade: "",
        school: "",
        classLink: "",
        meetingPassword: "",
      };

      if (baseProfile.role === "student") {
        const { data, error: studentError } = await supabase
          .from("student_profiles")
          .select("country, grade")
          .eq("uid", uid)
          .single();

        if (studentError) {
          if (!cancelled) setError(studentError.message);
        } else {
          nextProfile.country = data.country;
          nextProfile.grade = data.grade;
        }
      }

      if (baseProfile.role === "tutor") {
        const { data, error: tutorError } = await supabase
          .from("tutor_profiles")
          .select("school, grade, class_link, meeting_password")
          .eq("uid", uid)
          .single();

        if (tutorError) {
          if (!cancelled) setError(tutorError.message);
        } else {
          nextProfile.school = data.school;
          nextProfile.grade = data.grade;
          nextProfile.classLink = data.class_link;
          nextProfile.meetingPassword = data.meeting_password;
        }
      }

      if (!cancelled) {
        setProfile(nextProfile);
        setLoading(false);
      }
    }

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, [open, fallbackUser.email, fallbackUser.name]);

  async function handleSave() {
    setSaving(true);
    setMessage("");
    setMessageKind("success");
    setError("");

    const normalizedClassLink = profile.role === "tutor"
      ? normalizeVoovMeetingUrl(profile.classLink)
      : null;
    if (profile.role === "tutor" && !normalizedClassLink) {
      setError(t("auth.voovLinkRequired"));
      setSaving(false);
      return;
    }
    if (profile.role === "tutor" && !isValidMeetingPassword(profile.meetingPassword)) {
      setError(t("auth.meetingPasswordInvalid"));
      setSaving(false);
      return;
    }

    const requestedEmail = profile.email.trim();
    const { data: currentAuth, error: currentAuthError } = await supabase.auth.getUser();
    if (currentAuthError || !currentAuth.user) {
      console.error("Failed to load the current user before saving settings", currentAuthError);
      setError(currentAuthError?.message ?? t("settings.noSignedInUser"));
      setSaving(false);
      return;
    }

    const currentEmail = currentAuth.user.email?.trim() ?? fallbackUser.email;
    const existingPendingEmailChange = readPendingEmailChange();
    const matchesPendingEmailChange =
      existingPendingEmailChange?.uid === profile.uid &&
      existingPendingEmailChange.requestedEmail.toLowerCase() === requestedEmail.toLowerCase() &&
      currentEmail.toLowerCase() !== requestedEmail.toLowerCase();
    const emailChanged =
      currentEmail.toLowerCase() !== requestedEmail.toLowerCase() &&
      !matchesPendingEmailChange;
    let confirmedEmail = currentEmail;
    let emailConfirmationPending = matchesPendingEmailChange;

    if (emailChanged) {
      const confirmationUrl = new URL(window.location.href);
      confirmationUrl.searchParams.set(emailChangeConfirmationParam, "pending");
      confirmationUrl.searchParams.delete("message");
      confirmationUrl.searchParams.delete("sb");
      confirmationUrl.hash = "";

      const { data: authUpdate, error: authError } = await supabase.auth.updateUser(
        { email: requestedEmail },
        { emailRedirectTo: confirmationUrl.toString() }
      );
      if (authError) {
        console.error("Failed to request an email change", authError);
        setError(authError.message);
        setSaving(false);
        return;
      }

      confirmedEmail = authUpdate.user.email ?? currentEmail;
      emailConfirmationPending = confirmedEmail.toLowerCase() !== requestedEmail.toLowerCase();
      if (emailConfirmationPending) {
        writePendingEmailChange({
          uid: profile.uid,
          requestedEmail,
          stage: "awaiting_both",
        });
      }
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        name: profile.name,
        email: confirmedEmail,
      })
      .eq("uid", profile.uid);

    if (profileError) {
      setError(profileError.message);
      setSaving(false);
      return;
    }

    if (profile.role === "student") {
      const { error: studentError } = await supabase
        .from("student_profiles")
        .update({
          country: profile.country,
          grade: profile.grade,
        })
        .eq("uid", profile.uid);

      if (studentError) {
        setError(studentError.message);
        setSaving(false);
        return;
      }
    }

    if (profile.role === "tutor") {
      const { error: tutorError } = await supabase
        .from("tutor_profiles")
        .update({
          school: profile.school,
          grade: profile.grade,
          class_link: normalizedClassLink,
          meeting_password: profile.meetingPassword,
        })
        .eq("uid", profile.uid);

      if (tutorError) {
        setError(tutorError.message);
        setSaving(false);
        return;
      }
    }

    const updatedUser: StoredUser = {
      uid: profile.uid,
      role: profile.role,
      name: profile.name,
      email: confirmedEmail,
    };
    setProfile((current) => ({
      ...current,
      email: emailConfirmationPending ? requestedEmail : confirmedEmail,
      ...(normalizedClassLink ? { classLink: normalizedClassLink } : {}),
    }));
    writeStoredUser(updatedUser);
    onUserUpdated(updatedUser);
    if (emailConfirmationPending) {
      setMessageKind("pending");
      setMessage(t("settings.emailConfirmationSent"));
    } else {
      const pendingEmailChange = readPendingEmailChange();
      if (
        pendingEmailChange?.uid === profile.uid &&
        confirmedEmail.toLowerCase() !== pendingEmailChange.requestedEmail.toLowerCase()
      ) {
        setMessageKind("pending");
        setMessage(t(
          pendingEmailChange.stage === "partially_confirmed"
            ? "settings.emailPartiallyConfirmed"
            : "settings.emailConfirmationSent"
        ));
      } else {
        setMessageKind("success");
        setMessage(t("settings.saved"));
      }
    }
    setSaving(false);
  }

  async function handleResetPassword() {
    setMessage("");
    setError("");
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user?.email) {
      console.error("Failed to load the current user before sending a password reset email", authError);
      setError(authError?.message ?? t("settings.noSignedInUser"));
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(authData.user.email, {
      redirectTo: `${window.location.origin}/reset-password?type=recovery`,
    });

    if (resetError) {
      console.error("Failed to send password reset email", resetError);
      setError(resetError.message);
      return;
    }

    setMessage(t("settings.resetSent"));
  }

  function closeDeleteDialog() {
    if (deleteBusy === "deleting") return;
    setDeleteStep("closed");
    setDeleteCode("");
    setDeleteEmail("");
    setError("");
  }

  async function handleStartDeleteAccount() {
    setMessage("");
    setError("");
    setDeleteBusy("sending");

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user?.email) {
      console.error("Failed to load the current user before reauthentication", authError);
      setError(authError?.message ?? t("settings.noSignedInUser"));
      setDeleteBusy(null);
      return;
    }

    const { error: reauthenticationError } = await supabase.auth.reauthenticate();
    if (reauthenticationError) {
      console.error("Failed to send account deletion reauthentication code", reauthenticationError);
      setError(reauthenticationError.message);
      setDeleteBusy(null);
      return;
    }

    setDeleteEmail(authData.user.email);
    setDeleteCode("");
    setDeleteStep("code");
    setDeleteBusy(null);
  }

  async function handleVerifyDeleteCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!/^\d{8}$/.test(deleteCode)) {
      setError(t("settings.deleteCodeInvalid"));
      return;
    }

    setDeleteBusy("verifying");
    const { data, error: verifyError } = await supabase.rpc("verify_delete_account_code", {
      p_nonce: deleteCode,
    });

    if (verifyError || data !== true) {
      console.error("verify_delete_account_code failed", verifyError);
      setError(verifyError?.message ?? t("settings.deleteCodeInvalid"));
      setDeleteBusy(null);
      return;
    }

    setDeleteStep("confirm");
    setDeleteBusy(null);
  }

  async function handleDeleteAccount() {
    setError("");
    setDeleteBusy("deleting");

    const { error: rpcError } = await supabase.rpc("delete_current_user", {
      p_nonce: deleteCode,
    });
    if (rpcError) {
      console.error("delete_current_user failed", rpcError);
      setError(t("settings.deleteRpcRequired", { message: rpcError.message }));
      setDeleteBusy(null);
      return;
    }

    await supabase.auth.signOut();
    clearStoredAuthState();
    onOpenChange(false);
    router.replace("/");
  }

  const sidebarItems = [
    { id: "general" as const, label: t("settings.general"), icon: Settings },
    { id: "account" as const, label: t("settings.account"), icon: User },
  ];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex h-[min(42rem,calc(100vh-2rem))] w-[min(64rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl md:flex-row">
          <aside className="flex w-full shrink-0 items-center gap-2 overflow-x-auto border-b border-border bg-sidebar p-3 md:w-56 md:flex-col md:items-stretch md:border-b-0 md:border-r md:p-4">
            <Dialog.Close asChild>
              <button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-card-foreground md:mb-4 md:h-12 md:w-12">
                <X size={20} />
              </button>
            </Dialog.Close>
            {sidebarItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition-colors md:w-full ${
                  tab === id ? "bg-accent text-card-foreground" : "text-muted-foreground hover:bg-accent/70 hover:text-card-foreground"
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </aside>

          <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <div className="border-b border-border px-4 py-4 sm:px-6 md:px-8 md:py-6">
              <Dialog.Title className="text-2xl text-card-foreground md:text-3xl">
                {tab === "general" ? t("settings.general") : t("settings.account")}
              </Dialog.Title>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 md:px-8 md:py-6">
              {loading ? (
                <p className="text-sm text-muted-foreground">{t("settings.loading")}</p>
              ) : tab === "general" ? (
                <div className="grid gap-5 md:grid-cols-2">
                  <SettingsField label={t("auth.name")} value={profile.name} onChange={(value) => updateProfile("name", value)} />
                  <SettingsField label={t("auth.email")} type="email" value={profile.email} onChange={(value) => updateProfile("email", value)} />
                  {profile.role === "student" && (
                    <>
                      <SettingsCountrySelect label={t("auth.country")} value={profile.country} onChange={(value) => updateProfile("country", value)} />
                      <SettingsSelect label={t("auth.grade")} value={profile.grade} onChange={(value) => updateProfile("grade", value)} options={gradeOptions} />
                    </>
                  )}

                  {profile.role === "tutor" && (
                    <>
                      <SettingsField label={t("auth.school")} value={profile.school} onChange={(value) => updateProfile("school", value)} />
                      <SettingsSelect label={t("auth.grade")} value={profile.grade} onChange={(value) => updateProfile("grade", value)} options={gradeOptions} />
                      <SettingsField label={t("auth.classLink")} type="url" value={profile.classLink} onChange={(value) => updateProfile("classLink", value)} />
                      <SettingsField label={t("auth.classPassword")} type="password" minLength={4} maxLength={6} inputMode="numeric" pattern="[0-9]{4,6}" value={profile.meetingPassword} onChange={(value) => updateProfile("meetingPassword", value.replace(/\D/g, "").slice(0, 6))} />
                    </>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-border border-y border-border">
                  <div className="flex flex-col items-start justify-between gap-4 py-7 sm:flex-row sm:items-center">
                    <div>
                      <p className="text-lg text-card-foreground">{t("settings.resetPassword")}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{t("settings.resetPasswordHelp", { email: profile.email })}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetPassword}
                      className="rounded-full border border-primary px-7 py-3 text-sm text-primary transition-colors hover:bg-primary/10"
                    >
                      {t("settings.reset")}
                    </button>
                  </div>
                  <div className="flex flex-col items-start justify-between gap-4 py-7 sm:flex-row sm:items-center">
                    <p className="text-lg text-card-foreground">{t("settings.deleteAccount")}</p>
                    <button
                      type="button"
                      onClick={handleStartDeleteAccount}
                      disabled={deleteBusy === "sending"}
                      className="rounded-full border border-destructive px-7 py-3 text-sm text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deleteBusy === "sending" ? t("settings.sendingDeleteCode") : t("settings.delete")}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col items-stretch gap-3 border-t border-border px-4 py-4 sm:flex-row sm:items-center sm:px-6 md:px-8 md:py-5">
              {tab === "general" && (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || loading}
                  className="rounded-xl bg-primary px-5 py-2.5 text-sm text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-fit"
                >
                  {saving ? t("common.saving") : t("settings.save")}
                </button>
              )}
              <div className="min-w-0 text-sm">
                {error && <p className="text-destructive">{error}</p>}
                {message && (
                  <p className={messageKind === "pending" ? "text-amber-700" : "text-emerald-600"}>
                    {message}
                  </p>
                )}
              </div>
            </div>
          </section>

          <Dialog.Root open={deleteStep !== "closed"} onOpenChange={(nextOpen) => !nextOpen && closeDeleteDialog()}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" />
              <Dialog.Content className="fixed left-1/2 top-1/2 z-[60] max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-2xl sm:p-6">
                {deleteStep === "code" ? (
                  <form onSubmit={handleVerifyDeleteCode}>
                    <Dialog.Title className="text-xl text-card-foreground">
                      {t("settings.deleteCodeTitle")}
                    </Dialog.Title>
                    <Dialog.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {t("settings.deleteCodeHelp", { email: deleteEmail })}
                    </Dialog.Description>

                    <label className="mt-5 block">
                      <span className="text-sm font-medium text-card-foreground">
                        {t("settings.deleteCodeLabel")}
                      </span>
                      <input
                        autoFocus
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={8}
                        value={deleteCode}
                        onChange={(event) => setDeleteCode(event.target.value.replace(/\D/g, "").slice(0, 8))}
                        placeholder={t("settings.deleteCodePlaceholder")}
                        className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm tracking-[0.3em] text-foreground outline-none transition placeholder:tracking-normal placeholder:text-muted-foreground/70 focus:border-primary/40"
                      />
                    </label>

                    {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

                    <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={closeDeleteDialog}
                        className="rounded-xl border border-border px-5 py-2.5 text-sm text-card-foreground transition-colors hover:bg-muted"
                      >
                        {t("common.cancel")}
                      </button>
                      <button
                        type="submit"
                        disabled={deleteBusy !== null}
                        className="rounded-xl bg-primary px-5 py-2.5 text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deleteBusy === "verifying" ? t("settings.verifyingDeleteCode") : t("settings.verifyDeleteCode")}
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <Dialog.Title className="text-xl text-card-foreground">
                      {t("settings.deleteConfirmationTitle")}
                    </Dialog.Title>
                    <Dialog.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {t("settings.deleteConfirm")}
                    </Dialog.Description>

                    {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

                    <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={closeDeleteDialog}
                        disabled={deleteBusy === "deleting"}
                        className="rounded-xl border border-border px-5 py-2.5 text-sm text-card-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {t("common.cancel")}
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteAccount}
                        disabled={deleteBusy === "deleting"}
                        className="rounded-xl bg-destructive px-5 py-2.5 text-sm text-destructive-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deleteBusy === "deleting" ? t("settings.deletingAccount") : t("settings.deleteAccount")}
                      </button>
                    </div>
                  </>
                )}
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function StarRating({ stars, max = 5, size = 14 }: { stars: number; max?: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={i < stars ? "fill-amber-400 text-amber-400" : "text-gray-200 fill-gray-200"}
        />
      ))}
    </div>
  );
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

async function handleJoinClass(cls: {
  id: string | number;
  startsAt?: Date;
  classLink?: string;
}, attendee: "student" | "teacher") {
  if (cls.startsAt) {
    const startsAt = cls.startsAt.getTime();
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;

    if (now >= startsAt - tenMinutes && now <= startsAt + tenMinutes) {
      const { error: attendanceError } = await supabase.rpc("secure_mark_class_attendance", {
        p_lesson_id: cls.id,
      });
      if (attendanceError) {
        console.error("secure_mark_class_attendance failed", attendanceError);
      }
    }
  }

  if (cls.classLink) {
    const safeUrl = safeExternalUrl(cls.classLink);
    if (safeUrl) {
      window.open(safeUrl, "_blank", "noopener,noreferrer");
    }
  }
}

function FeedbackDialog({
  open,
  onClose,
  feedback,
}: {
  open: boolean;
  onClose: () => void;
  feedback: (typeof COMPLETED_CLASSES)[0]["feedback"] | null;
}) {
  const { t, lang } = useLanguage();
  if (!feedback) return null;
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-2xl sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-card-foreground">{t("feedback.teacherTitle")}</Dialog.Title>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <BlankAvatar size={48} />
            <div>
              <p className="text-card-foreground">{feedback.teacher}</p>
              <p className="text-sm text-muted-foreground">{feedback.subject}</p>
            </div>
            <div className="ml-auto flex flex-col items-end gap-1">
              <StarRating stars={feedback.stars} />
              <span className="text-xs text-muted-foreground">{feedback.date}</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{feedback.text}</p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type ProfileDetail = {
  label: string;
  value: string;
};

function labelFromColumn(column: string) {
  return column
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function PersonProfileDialog({
  person,
  onClose,
}: {
  person: { uid: string; role: "student" | "tutor"; name: string } | null;
  onClose: () => void;
}) {
  const { t, lang } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [details, setDetails] = useState<ProfileDetail[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!person) return;
      setLoading(true);
      setError("");
      setDetails([]);

      const profileTable = person.role === "student" ? "student_profiles" : "tutor_profiles";
      const [baseProfileResult, roleProfileResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("name, student_wechat_id, parent_wechat_id, student_email, parent_email, communication_recipient, preferred_communication")
          .eq("uid", person.uid)
          .maybeSingle(),
        supabase
          .from(profileTable)
          .select("*")
          .eq("uid", person.uid)
          .maybeSingle(),
      ]);
      const { data: baseProfile, error: baseError } = baseProfileResult;

      if (baseError || !baseProfile) {
        if (!cancelled) {
          setError(baseError?.message || t("dashboard.profileLoadError"));
          setLoading(false);
        }
        return;
      }

      const { data: roleProfile, error: roleError } = roleProfileResult;

      if (roleError) {
        if (!cancelled) {
          setError(roleError.message);
          setLoading(false);
        }
        return;
      }

      const hiddenFields = new Set(
        person.role === "student"
          ? ["uid", "referrer", "trial_teacher"]
          : ["uid", "how_found_out"]
      );

      const roleDetails = Object.entries(roleProfile ?? {})
        .filter(([key, value]) => !hiddenFields.has(key) && value !== null && value !== "")
        .map(([key, value]) => ({
          label: key === "introduction"
            ? t(person.role === "student" ? "auth.studentIntroduction" : "auth.tutorIntroduction")
            : labelFromColumn(key),
          value: key === "country" ? countryLabelForValue(String(value), lang) : String(value),
        }));

      if (!cancelled) {
        setDetails([
          { label: t("common.name"), value: baseProfile.name },
          ...(baseProfile.communication_recipient
            ? [{
                label: t("auth.communicationRecipient"),
                value: baseProfile.communication_recipient === "both"
                  ? t(person.role === "tutor"
                    ? "auth.communicationRecipient.tutorAndParent"
                    : "auth.communicationRecipient.studentAndParent")
                  : baseProfile.communication_recipient === "student" && person.role === "tutor"
                    ? t("auth.communicationRecipient.tutor")
                    : t(`auth.communicationRecipient.${baseProfile.communication_recipient}` as "auth.communicationRecipient.student" | "auth.communicationRecipient.parent"),
              }]
            : []),
          ...(baseProfile.student_wechat_id
            ? [{
                label: t(person.role === "tutor" ? "auth.tutorWechatId" : "auth.studentWechatId"),
                value: baseProfile.student_wechat_id,
              }]
            : []),
          ...(baseProfile.parent_wechat_id
            ? [{ label: t("auth.parentWechatId"), value: baseProfile.parent_wechat_id }]
            : []),
          ...(baseProfile.student_email
            ? [{
                label: t(person.role === "tutor" ? "auth.tutorCommunicationEmail" : "auth.studentCommunicationEmail"),
                value: baseProfile.student_email,
              }]
            : []),
          ...(baseProfile.parent_email
            ? [{ label: t("auth.parentCommunicationEmail"), value: baseProfile.parent_email }]
            : []),
          ...(baseProfile.preferred_communication
            ? [{
                label: t("auth.preferredCommunication"),
                value: t(`auth.preferredCommunication.${baseProfile.preferred_communication}` as "auth.preferredCommunication.wechat" | "auth.preferredCommunication.email"),
              }]
            : []),
          ...roleDetails,
        ]);
        setLoading(false);
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [person, t, lang]);

  return (
    <Dialog.Root open={person !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-2xl">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-card-foreground">{person?.name}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                {person?.role === "student" ? t("common.student") : t("common.tutor")}
              </Dialog.Description>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted"
            >
              <X size={16} />
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : error ? (
            <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          ) : (
            <div>
              <div className="divide-y divide-border border-y border-border">
                {details.map((detail) => (
                  <div key={detail.label} className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4">
                    <p className="text-xs text-muted-foreground">{detail.label}</p>
                    <p className="whitespace-pre-wrap break-words text-sm text-card-foreground">{detail.value}</p>
                  </div>
                ))}
              </div>
              {person?.role === "student" && (
                <p className="mt-4 text-sm text-muted-foreground">
                  {t("speakingSamples.profileLinkLabel")}:{" "}
                  <Link
                    href={`/speaking-samples/${person.uid}`}
                    className="break-all text-primary hover:underline"
                  >
                    peerbridges.org/speaking-samples/{person.uid}
                  </Link>
                </p>
              )}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ClassCard({
  cls,
  completed,
  feedbackLabel,
  feedbackPendingLabel,
  useEvaluationPage = false,
  attendee = "student",
  onCancelClass,
}: {
  cls: {
    id: string | number;
    name: string;
    teacher: string;
    tutorName?: string;
    displayPersonUid?: string;
    displayPersonRole?: "student" | "tutor";
    displayPersonName?: string;
    descriptionLines?: string[];
    date: string;
    time: string;
    startsAt?: Date;
    recurringLessonId?: string | null;
    evaluationCompleted?: boolean;
    classLink?: string;
    meetingPassword?: string;
    feedback?: typeof LAST_FEEDBACK;
  };
  completed: boolean;
  feedbackLabel?: string;
  feedbackPendingLabel?: string;
  useEvaluationPage?: boolean;
  attendee?: "student" | "teacher";
  onCancelClass?: (cls: CancelClassTarget) => void;
}) {
  const { t } = useLanguage();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [profilePerson, setProfilePerson] = useState<{ uid: string; role: "student" | "tutor"; name: string } | null>(null);
  const displayPersonName = cls.displayPersonName ?? cls.tutorName ?? cls.teacher;
  const actionLabel =
    completed && "evaluationCompleted" in cls
      ? cls.evaluationCompleted
        ? feedbackLabel
        : feedbackPendingLabel
      : feedbackLabel;

  return (
    <>
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-card-foreground text-sm leading-snug">
              <span>{cls.name}</span>
              {cls.recurringLessonId && (
                <span className="inline-flex w-fit rounded-full bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700">
                  {t("dashboard.recurring")}
                </span>
              )}
            </p>
          </div>
          {completed && (
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            if (cls.displayPersonUid && cls.displayPersonRole) {
              setProfilePerson({
                uid: cls.displayPersonUid,
                role: cls.displayPersonRole,
                name: displayPersonName,
              });
            }
          }}
          className="flex w-fit items-center gap-2.5 rounded-lg text-left transition-colors hover:bg-accent"
        >
          <BlankAvatar size={32} />
          <div className="flex items-center gap-1.5">
            <p className="text-sm text-card-foreground">{displayPersonName}</p>
            <ChevronRight size={13} className="text-muted-foreground" />
          </div>
        </button>
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarDays size={14} />
            {cls.date}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={14} />
            {cls.time}
          </span>
          {!completed && cls.meetingPassword && (
            <span className="flex items-center gap-1.5">
              <KeyRound size={14} />
              {t("dashboard.meetingPassword", { password: cls.meetingPassword })}
            </span>
          )}
        </div>
        {cls.descriptionLines && cls.descriptionLines.length > 0 && (
          <div className="grid gap-1 text-xs leading-relaxed text-muted-foreground">
            {cls.descriptionLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        )}
        {completed && (cls.evaluationCompleted || feedbackPendingLabel !== t("dashboard.teacherFeedbackPending")) && (
          useEvaluationPage ? (
          <Link
            href={`/evaluations/${cls.id}`}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer mt-1 w-fit"
          >
            <MessageSquare size={12} />
            {actionLabel}
            <ChevronRight size={12} />
          </Link>
          ) : (
          <button
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer mt-1 w-fit"
          >
            <MessageSquare size={12} />
            {actionLabel}
            <ChevronRight size={12} />
          </button>
          )
        )}
        {completed && !cls.evaluationCompleted && feedbackPendingLabel === t("dashboard.teacherFeedbackPending") && (
          <p className="mt-1 text-xs text-muted-foreground">{actionLabel}</p>
        )}
        {!completed && (
          <div className="mt-1 grid gap-2">
            <button
              type="button"
              onClick={() => void handleJoinClass(cls, attendee)}
              disabled={!cls.classLink}
              className="w-full text-center text-xs text-primary border border-primary/30 rounded-lg py-1.5 hover:bg-accent transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("dashboard.joinSession")}
            </button>
            {onCancelClass && (
              <button
                type="button"
                onClick={() => onCancelClass(cls)}
                className="w-full text-center text-xs text-destructive border border-destructive/30 rounded-lg py-1.5 hover:bg-destructive/10 transition-colors cursor-pointer"
              >
                {t("dashboard.cancelClass")}
              </button>
            )}
          </div>
        )}
      </div>
      {completed && cls.feedback && (
        <FeedbackDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          feedback={cls.feedback}
        />
      )}
      <PersonProfileDialog person={profilePerson} onClose={() => setProfilePerson(null)} />
    </>
  );
}

// ─── TOP NAV ─────────────────────────────────────────────────────────────────

function TopNav({
  user,
  onMenuClick,
  onUserUpdated,
  onRulesClick,
}: {
  user: typeof STUDENT;
  onMenuClick: () => void;
  onUserUpdated: (user: StoredUser) => void;
  onRulesClick?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    if (searchParams.has(emailChangeConfirmationParam)) {
      setSettingsOpen(true);
    }
  }, [searchParams]);

  function handleSettingsOpenChange(nextOpen: boolean) {
    setSettingsOpen(nextOpen);
    if (!nextOpen && searchParams.has(emailChangeConfirmationParam)) {
      const nextSearchParams = new URLSearchParams(searchParams.toString());
      nextSearchParams.delete(emailChangeConfirmationParam);
      nextSearchParams.delete("message");
      nextSearchParams.delete("sb");
      const nextSearch = nextSearchParams.toString();
      router.replace(`${pathname}${nextSearch ? `?${nextSearch}` : ""}`);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    clearStoredAuthState();
    router.replace("/");
  }

  return (
    <>
    <header className="z-10 flex h-16 min-w-0 shrink-0 items-center gap-2 border-b border-border bg-card px-3 sm:gap-4 sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-card-foreground md:hidden"
        aria-label={t("common.openNavigation")}
      >
        <Menu size={18} />
      </button>

      {/* Logo */}
      <div className="mr-0 flex shrink-0 items-center gap-2 sm:mr-2">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <BookOpen size={16} className="text-primary-foreground" />
        </div>
        <span className="text-card-foreground hidden sm:block">PeerBridges</span>
      </div>

      <div className="flex-1" />

      {onRulesClick && (
        <button
          type="button"
          onClick={onRulesClick}
          className="flex shrink-0 items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-card-foreground transition-colors hover:bg-accent"
        >
          <CircleHelp size={16} className="text-muted-foreground" />
          <span className="hidden sm:inline">{t("rules.button")}</span>
        </button>
      )}

      <LanguageSelect />

      {/* Profile dropdown */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="flex shrink-0 cursor-pointer items-center gap-2.5 rounded-xl border border-transparent p-1.5 outline-none transition-colors hover:border-border hover:bg-accent sm:pl-2 sm:pr-3">
            <BlankAvatar size={32} />
            <span className="hidden min-w-0 text-left sm:block">
              <span className="block truncate text-sm text-card-foreground">{user.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
            </span>
            <ChevronDown size={14} className="text-muted-foreground" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={8}
            className="bg-popover border border-border rounded-xl shadow-xl z-50 w-52 p-1.5 overflow-hidden"
          >
            <DropdownMenu.Item
              onSelect={() => setSettingsOpen(true)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-popover-foreground rounded-lg hover:bg-accent cursor-pointer outline-none"
            >
              <Settings size={14} className="text-muted-foreground" />
              {t("common.accountSettings")}
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-1 h-px bg-border" />
            <DropdownMenu.Item
              onSelect={handleSignOut}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-destructive rounded-lg hover:bg-destructive/10 cursor-pointer outline-none"
            >
              <LogOut size={14} />
              {t("common.signOut")}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </header>
    <AccountSettingsDialog
      open={settingsOpen}
      onOpenChange={handleSettingsOpenChange}
      fallbackUser={user}
      onUserUpdated={onUserUpdated}
    />
    </>
  );
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────

function Sidebar({
  active,
  dashboardHref,
  individualQueryHref,
  scheduleHref,
  scheduleLabel,
  recordHref,
  trainingHref,
  volunteerAwardHref,
  studentMaterialsHref,
  speakingSamplesHref,
  manageMediaHref,
  communicationsHref,
  open,
  onClose,
}: {
  active: string;
  dashboardHref: string;
  individualQueryHref?: string;
  scheduleHref?: string | null;
  scheduleLabel: string;
  recordHref?: string;
  trainingHref?: string;
  volunteerAwardHref?: string;
  studentMaterialsHref?: string;
  speakingSamplesHref?: string;
  manageMediaHref?: string;
  communicationsHref?: string;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const items = [
    { id: "dashboard", href: dashboardHref, icon: LayoutDashboard, label: t("common.dashboard") },
    ...(individualQueryHref
      ? [{ id: "individualQuery", href: individualQueryHref, icon: User, label: t("admin.individualQuery") }]
      : []),
    ...(scheduleHref
      ? [{ id: "schedule", href: scheduleHref, icon: CalendarDays, label: scheduleLabel }]
      : []),
    ...(recordHref
      ? [{ id: "record", href: recordHref, icon: FileText, label: t("common.volunteerRecord") }]
      : []),
    ...(trainingHref
      ? [{ id: "training", href: trainingHref, icon: GraduationCap, label: t("common.trainingMaterials") }]
      : []),
    ...(volunteerAwardHref
      ? [{ id: "awards", href: volunteerAwardHref, icon: FileText, label: t("common.volunteerAwards") }]
      : []),
    ...(studentMaterialsHref
      ? [{ id: "studentMaterials", href: studentMaterialsHref, icon: FileText, label: t("common.studentMaterials") }]
      : []),
    ...(speakingSamplesHref
      ? [{ id: "speakingSamples", href: speakingSamplesHref, icon: Mic2, label: t("common.speakingSamples") }]
      : []),
    ...(manageMediaHref
      ? [{ id: "manageMedia", href: manageMediaHref, icon: GraduationCap, label: t("common.manageMedia") }]
      : []),
    ...(communicationsHref
      ? [{ id: "communications", href: communicationsHref, icon: MessageSquare, label: t("common.communications") }]
      : []),
  ];
  return (
    <>
      <button
        type="button"
        aria-label={t("common.closeNavigation")}
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-black/25 transition-opacity md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col gap-1 border-r border-sidebar-border bg-sidebar p-3 transition-transform duration-200 md:static md:z-auto md:w-56 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-2 flex items-center justify-between md:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <BookOpen size={16} className="text-primary-foreground" />
            </div>
            <span className="text-card-foreground">PeerBridges</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            aria-label={t("common.closeNavigation")}
          >
            <X size={17} />
          </button>
        </div>
      {items.map(({ id, href, icon: Icon, label }) => (
        <Link
          key={id}
          href={href}
          prefetch={false}
          onClick={(event) => {
            event.preventDefault();
            onClose();
            router.push(href);
          }}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
            active === id
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          }`}
        >
          <Icon size={18} />
          {label}
        </Link>
      ))}
      </aside>
    </>
  );
}

// ─── FEEDBACK CARD ────────────────────────────────────────────────────────────

function FeedbackCard({
  lang,
  feedback,
  loading,
}: {
  lang: string;
  feedback: StudentFeedback | null;
  loading: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-card-foreground">{t("dashboard.lastFeedback")}</h3>
        {feedback && <span className="text-xs text-muted-foreground">{feedback.date}</span>}
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border bg-background px-4 py-10 text-sm text-muted-foreground">
          {t("dashboard.loadingFeedback")}
        </div>
      ) : !feedback ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border bg-background px-4 py-10 text-sm text-muted-foreground">
          {t("dashboard.noFeedback")}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <BlankAvatar size={48} />
            <div className="flex-1 min-w-0">
              <p className="text-card-foreground text-sm">{feedback.teacher}</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed flex-1">{feedback.text}</p>

          <div className="border-t border-border pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">
                {t("dashboard.sessionRating")}
              </p>
              <StarRating stars={feedback.stars} size={22} />
            </div>
            <span className="text-2xl text-card-foreground">{feedback.stars}<span className="text-sm text-muted-foreground">/5</span></span>
          </div>
        </>
      )}
    </div>
  );
}

// ─── ASSIGNMENTS CARD ─────────────────────────────────────────────────────────

function AssignmentsCard({
  lang,
  assignments,
  loading,
  onCompleteAssignment,
}: {
  lang: string;
  assignments: UIAssignment[];
  loading: boolean;
  onCompleteAssignment: (assignmentId: string) => void;
}) {
  const { t } = useLanguage();
  const [completingId, setCompletingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleComplete(assignmentId: string) {
    setCompletingId(assignmentId);
    setError("");
    setMessage("");
    const storedUser = readStoredUser();
    const { data: authData } = await supabase.auth.getUser();
    const studentUid = authData.user?.id || storedUser?.uid || "";

    if (!studentUid) {
      setError(t("auth.authUserError"));
      setCompletingId("");
      return;
    }

    const { data: completedAssignment, error: completeError } = await supabase.rpc(
      "secure_complete_assignment",
      { p_assignment_id: assignmentId },
    );

    if (completeError || !completedAssignment) {
      console.error(
        "secure_complete_assignment failed",
        completeError ?? { message: "RPC returned no completed assignment" },
      );
      setError(completeError?.message || t("dashboard.assignmentCompleteError"));
      setCompletingId("");
      return;
    }

    onCompleteAssignment(assignmentId);
    setMessage(t("dashboard.assignmentCompleted"));
    setCompletingId("");
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-card-foreground">{t("dashboard.assignments")}</h3>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {assignments.length} {t("dashboard.pending")}
        </span>
      </div>
      <div className="flex flex-col gap-3 flex-1">
        {error && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        {message && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {message}
          </div>
        )}
        {loading ? (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border bg-background px-4 py-10 text-sm text-muted-foreground">
            {t("dashboard.loadingAssignments")}
          </div>
        ) : assignments.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border bg-background px-4 py-10 text-sm text-muted-foreground">
            {t("dashboard.noAssignments")}
          </div>
        ) : assignments.map((a) => (
          <div
            key={a.id}
            className={`flex flex-col gap-2.5 px-4 py-3.5 rounded-xl border ${
              a.overdue ? "border-destructive/30 bg-destructive/10" : a.dueSoon ? "border-amber-200 bg-amber-50" : "border-border bg-background"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-card-foreground">{a.name}</p>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                  a.overdue
                    ? "bg-destructive/10 text-destructive"
                    : a.dueSoon
                      ? "bg-amber-100 text-amber-700"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {a.status === "overdue" ? t("dashboard.overdue") : a.status === "dueSoon" ? t("dashboard.dueSoon") : t("dashboard.assigned")}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{a.description}</p>
            <p className="text-xs text-muted-foreground">
              {t("dashboard.assignedByOn", { teacher: a.assignedBy, date: a.assignedOn })}
            </p>
            <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarDays size={11} />
                {t("dashboard.dueAt", { date: a.due })}
              </div>
              <button
                type="button"
                onClick={() => void handleComplete(a.id)}
                disabled={completingId === a.id}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {completingId === a.id ? t("common.saving") : t("dashboard.markAssignmentComplete")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TUTOR STATS CARD ────────────────────────────────────────────────────────

function TutorStatsCard({
  lang,
  data,
}: {
  lang: string;
  data: TutorDashboardData;
}) {
  const { t } = useLanguage();
  const totalHours = data.stats.totalMinutes / 60;
  const stats = [
    {
      label: t("dashboard.totalClassesTaught"),
      value: data.loading ? "..." : String(data.stats.totalClasses),
      icon: BookOpen,
      tone: "bg-violet-50",
      iconTone: "bg-primary text-primary-foreground",
    },
    {
      label: t("dashboard.studentsTaught"),
      value: data.loading ? "..." : String(data.stats.studentsTaught),
      icon: Users,
      tone: "bg-emerald-50",
      iconTone: "bg-emerald-500 text-white",
    },
    {
      label: t("dashboard.totalHoursSpent"),
      value: data.loading ? "..." : `${Number.isInteger(totalHours) ? totalHours : totalHours.toFixed(1)}h`,
      icon: Clock,
      tone: "bg-sky-50",
      iconTone: "bg-sky-500 text-white",
    },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4 h-full">
      <div>
        <h3 className="text-card-foreground">{t("dashboard.teachingStats")}</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t("dashboard.teachingStatsHelp")}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 flex-1 sm:grid-cols-2">
        {stats.slice(0, 2).map(({ label, value, icon: Icon, tone, iconTone }) => (
          <div key={label} className={`${tone} border border-border rounded-xl p-4 flex flex-col justify-between min-h-28`}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs text-muted-foreground leading-snug">{label}</p>
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconTone}`}>
                <Icon size={15} />
              </span>
            </div>
            <p className="text-3xl text-card-foreground mt-5">{value}</p>
          </div>
        ))}
        <div className="flex justify-center sm:col-span-2">
          {stats.slice(2).map(({ label, value, icon: Icon, tone, iconTone }) => (
            <div key={label} className={`${tone} border border-border rounded-xl p-4 flex flex-col justify-between min-h-28 w-full sm:max-w-[calc(50%-0.375rem)]`}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs text-muted-foreground leading-snug">{label}</p>
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconTone}`}>
                  <Icon size={15} />
                </span>
              </div>
              <p className="text-3xl text-card-foreground mt-5">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── PENDING EVALUATIONS CARD ────────────────────────────────────────────────

function PendingEvaluationsCard({
  lang,
  evaluations,
  loading,
}: {
  lang: string;
  evaluations: UIClass[];
  loading: boolean;
}) {
  const { t } = useLanguage();

  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4 h-full">
        <div className="flex items-center justify-between">
          <h3 className="text-card-foreground">{t("dashboard.pendingEvaluations")}</h3>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {evaluations.length} {t("dashboard.pending")}
          </span>
        </div>
        <div className="flex flex-col gap-3 flex-1">
          {loading ? (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border bg-background px-4 py-10 text-sm text-muted-foreground">
              {t("dashboard.loadingPendingEvaluations")}
            </div>
          ) : evaluations.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border bg-background px-4 py-10 text-sm text-muted-foreground">
              {t("dashboard.nothingPending")}
            </div>
          ) : evaluations.map((evaluation) => (
            <div
              key={evaluation.id}
              className="flex flex-col gap-3 px-4 py-3.5 rounded-xl border border-border bg-background"
            >
              <div className="flex items-center gap-3">
                <BlankAvatar size={34} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-card-foreground truncate">{evaluation.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{evaluation.student} · {evaluation.date} · {evaluation.time}</p>
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">{t("dashboard.readyToComplete")}</p>
                <Link
                  href={`/evaluations/${evaluation.id}`}
                  className="flex w-full shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
                >
                  <FileText size={12} />
                  {t("dashboard.complete")}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
  );
}

// ─── UPCOMING CLASS HERO ──────────────────────────────────────────────────────

function UpcomingClassHero({
  cls,
  lang,
  attendee,
  onCancelClass,
}: {
  cls: {
    id: string | number;
    name: string;
    teacher: string;
    displayPersonName?: string;
    displayPersonUid?: string;
    displayPersonRole?: "student" | "tutor";
    descriptionLines?: string[];
    date: string;
    time: string;
    startsAt?: Date;
    recurringLessonId?: string | null;
    classLink?: string;
    meetingPassword?: string;
  };
  lang: string;
  attendee: "student" | "teacher";
  onCancelClass?: (cls: CancelClassTarget) => void;
}) {
  const { t } = useLanguage();
  const [profilePerson, setProfilePerson] = useState<{ uid: string; role: "student" | "tutor"; name: string } | null>(null);
  const displayPersonName = cls.displayPersonName ?? cls.teacher;
  return (
    <>
    <div className="flex flex-col items-start gap-5 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-accent to-secondary p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-primary bg-primary/10 px-2.5 py-1 rounded-full">
            {t("dashboard.upNext")}
          </span>
        </div>
        <div>
          <p className="mb-1 flex flex-wrap items-center gap-2 text-card-foreground">
            <span>{cls.name}</span>
            {cls.recurringLessonId && (
              <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700">
                {t("dashboard.recurring")}
              </span>
            )}
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1.5"><CalendarDays size={14} />{cls.date}</span>
            <span className="flex items-center gap-1.5"><Clock size={14} />{cls.time}</span>
            {cls.meetingPassword && (
              <span className="flex items-center gap-1.5">
                <KeyRound size={14} />
                {t("dashboard.meetingPassword", { password: cls.meetingPassword })}
              </span>
            )}
          </div>
        </div>
        {cls.descriptionLines && cls.descriptionLines.length > 0 && (
          <div className="grid gap-1 text-xs leading-relaxed text-muted-foreground">
            {cls.descriptionLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            if (cls.displayPersonUid && cls.displayPersonRole) {
              setProfilePerson({ uid: cls.displayPersonUid, role: cls.displayPersonRole, name: displayPersonName });
            }
          }}
          className="flex w-fit items-center gap-3 rounded-lg text-left transition-colors hover:bg-accent"
        >
          <BlankAvatar size={36} />
          <div>
            <p className="flex items-center gap-1.5 text-sm text-card-foreground">
              {displayPersonName}
              <ChevronRight size={13} className="text-muted-foreground" />
            </p>
            <p className="text-xs text-muted-foreground">
              {cls.displayPersonRole === "student" ? t("common.student") : t("dashboard.yourTutor")}
            </p>
          </div>
        </button>
      </div>
      <div className="grid w-full shrink-0 gap-2 sm:w-48">
        <button
          type="button"
          onClick={() => void handleJoinClass(cls, attendee)}
          disabled={!cls.classLink}
          className="w-full bg-primary text-primary-foreground px-6 py-3 rounded-xl text-sm hover:bg-primary/90 transition-colors cursor-pointer shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("dashboard.joinSession")}
        </button>
        {onCancelClass && (
          <button
            type="button"
            onClick={() => onCancelClass(cls)}
            className="w-full rounded-xl border border-destructive/30 px-6 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
          >
            {t("dashboard.cancelClass")}
          </button>
        )}
      </div>
    </div>
    <PersonProfileDialog person={profilePerson} onClose={() => setProfilePerson(null)} />
    </>
  );
}

// ─── CLASSES CARD ────────────────────────────────────────────────────────────

const upcomingClassesPerPage = 3;
const completedClassesPerPage = 9;

function PaginationControls({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const { t } = useLanguage();
  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-center gap-2 border-t border-border pt-3">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="rounded-lg border border-border px-3 py-1.5 text-xs text-card-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {t("common.prev")}
      </button>
      <span className="min-w-10 text-center text-xs text-muted-foreground">
        {page} / {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className="rounded-lg border border-border px-3 py-1.5 text-xs text-card-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {t("common.next")}
      </button>
    </div>
  );
}

function ClassesCard({
  lang,
  feedbackLabel,
  feedbackPendingLabel,
  upcomingClasses = [],
  completedClasses = [],
  recurringClasses = [],
  loading = false,
  useEvaluationPage = false,
  attendee = "student",
  onCancelClass,
  onCancelRecurring,
}: {
  lang: string;
  feedbackLabel?: string;
  feedbackPendingLabel?: string;
  upcomingClasses?: Array<{
    id: string | number;
    name: string;
    teacher: string;
    date: string;
    time: string;
    startsAt: Date;
    recurringLessonId?: string | null;
    evaluationCompleted?: boolean;
    feedback?: typeof LAST_FEEDBACK;
  }>;
  completedClasses?: Array<{
    id: string | number;
    name: string;
    teacher: string;
    date: string;
    time: string;
    evaluationCompleted?: boolean;
    feedback?: typeof LAST_FEEDBACK;
  }>;
  recurringClasses?: UIRecurringClass[];
  loading?: boolean;
  useEvaluationPage?: boolean;
  attendee?: "student" | "teacher";
  onCancelClass?: (cls: CancelClassTarget) => void;
  onCancelRecurring?: (recurringClass: UIRecurringClass) => Promise<void>;
}) {
  const { t } = useLanguage();
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);
  const [recurringCancelTarget, setRecurringCancelTarget] = useState<UIRecurringClass | null>(null);
  const [recurringCancelError, setRecurringCancelError] = useState("");
  const [cancellingRecurring, setCancellingRecurring] = useState(false);
  const [profilePerson, setProfilePerson] = useState<{ uid: string; role: "student" | "tutor"; name: string } | null>(null);
  const resolvedFeedbackLabel = feedbackLabel ?? t("dashboard.viewTeacherFeedback");
  const resolvedFeedbackPendingLabel = feedbackPendingLabel ?? t("dashboard.teacherFeedbackPending");
  const upcomingTotalPages = Math.max(1, Math.ceil(upcomingClasses.length / upcomingClassesPerPage));
  const completedTotalPages = Math.max(1, Math.ceil(completedClasses.length / completedClassesPerPage));
  const safeUpcomingPage = Math.min(upcomingPage, upcomingTotalPages);
  const safeCompletedPage = Math.min(completedPage, completedTotalPages);
  const pagedUpcomingClasses = upcomingClasses.slice((safeUpcomingPage - 1) * upcomingClassesPerPage, safeUpcomingPage * upcomingClassesPerPage);
  const pagedCompletedClasses = completedClasses.slice((safeCompletedPage - 1) * completedClassesPerPage, safeCompletedPage * completedClassesPerPage);

  useEffect(() => {
    setUpcomingPage(1);
  }, [upcomingClasses.length]);

  useEffect(() => {
    setCompletedPage(1);
  }, [completedClasses.length]);

  async function cancelRecurringClass() {
    if (!recurringCancelTarget || !onCancelRecurring) return;
    setCancellingRecurring(true);
    setRecurringCancelError("");
    try {
      await onCancelRecurring(recurringCancelTarget);
      setRecurringCancelTarget(null);
    } catch (error) {
      console.error("Failed to cancel recurring class", error);
      setRecurringCancelError(error instanceof Error ? error.message : t("dashboard.cancelClassError"));
    } finally {
      setCancellingRecurring(false);
    }
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4">
      <h3 className="text-card-foreground">{t("dashboard.classes")}</h3>
      <Tabs.Root defaultValue="scheduled">
        <Tabs.List className="mb-4 flex w-full gap-1 rounded-xl bg-muted p-1 sm:w-fit">
          {[
            { value: "scheduled", label: t("dashboard.upcoming") },
            { value: "completed", label: t("dashboard.completed") },
            { value: "recurring", label: t("dashboard.recurring") },
          ].map(({ value, label }) => (
            <Tabs.Trigger
              key={value}
              value={value}
              className="flex-1 rounded-lg px-4 py-1.5 text-sm text-muted-foreground transition-all cursor-pointer data-[state=active]:bg-card data-[state=active]:text-card-foreground data-[state=active]:shadow-sm sm:flex-none"
            >
              {label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        <Tabs.Content value="scheduled">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <CalendarDays size={32} className="opacity-30" />
              <p className="text-sm">{t("dashboard.loadingClasses")}</p>
            </div>
          ) : upcomingClasses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <CalendarDays size={32} className="opacity-30" />
              <p className="text-sm">{t("dashboard.noUpcomingClasses")}</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3">
                {pagedUpcomingClasses.map((cls, index) =>
                  (safeUpcomingPage - 1) * upcomingClassesPerPage + index === 0 ? (
                    <UpcomingClassHero key={cls.id} cls={cls} lang={lang} attendee={attendee} onCancelClass={onCancelClass} />
                  ) : (
                    <ClassCard key={cls.id} cls={cls} completed={false} attendee={attendee} onCancelClass={onCancelClass} />
                  )
                )}
              </div>
              <PaginationControls page={safeUpcomingPage} totalPages={upcomingTotalPages} onPageChange={setUpcomingPage} />
            </>
          )}
        </Tabs.Content>
        <Tabs.Content value="completed">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <CheckCircle2 size={32} className="opacity-30" />
              <p className="text-sm">{t("dashboard.loadingClasses")}</p>
            </div>
          ) : completedClasses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <CheckCircle2 size={32} className="opacity-30" />
              <p className="text-sm">{t("dashboard.noCompletedClasses")}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {pagedCompletedClasses.map((cls) => (
                  <ClassCard key={cls.id} cls={cls} completed={true} feedbackLabel={resolvedFeedbackLabel} feedbackPendingLabel={resolvedFeedbackPendingLabel} useEvaluationPage={useEvaluationPage} attendee={attendee} />
                ))}
              </div>
              <PaginationControls page={safeCompletedPage} totalPages={completedTotalPages} onPageChange={setCompletedPage} />
            </>
          )}
        </Tabs.Content>
        <Tabs.Content value="recurring">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <CalendarDays size={32} className="opacity-30" />
              <p className="text-sm">{t("dashboard.loadingClasses")}</p>
            </div>
          ) : recurringClasses.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <CalendarDays size={32} className="opacity-30" />
              <p className="text-sm">{t("dashboard.noRecurringClasses")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recurringClasses.map((recurringClass) => (
                <div key={recurringClass.id} className="rounded-xl border border-border bg-background p-4">
                  <button
                    type="button"
                    onClick={() => setProfilePerson({
                      uid: recurringClass.personUid,
                      role: recurringClass.personRole,
                      name: recurringClass.personName,
                    })}
                    className="flex w-fit items-center gap-2.5 rounded-lg text-left transition-colors hover:bg-accent"
                  >
                    <BlankAvatar size={32} />
                    <div>
                      <p className="flex items-center gap-1.5 text-sm font-medium text-card-foreground">
                        {recurringClass.personName}
                        <ChevronRight size={13} className="text-muted-foreground" />
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {attendee === "teacher" ? t("common.student") : t("common.tutor")}
                      </p>
                    </div>
                  </button>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t("dashboard.recurringSchedule", { day: recurringClass.day, time: recurringClass.time })}
                  </p>
                  {recurringClass.skippedDates.length > 0 && (
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {t("dashboard.recurringSkippedDates", {
                        dates: recurringClass.skippedDates.join(", "),
                      })}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {recurringClass.duration} {t("common.minutes")}
                  </p>
                  {onCancelRecurring && (
                    <button
                      type="button"
                      onClick={() => {
                        setRecurringCancelError("");
                        setRecurringCancelTarget(recurringClass);
                      }}
                      className="mt-4 w-full rounded-xl border border-destructive/30 px-4 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
                    >
                      {t("dashboard.cancelRecurringClass")}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Tabs.Content>
      </Tabs.Root>

      <Dialog.Root open={recurringCancelTarget !== null} onOpenChange={(open) => !open && setRecurringCancelTarget(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl">
            <Dialog.Title className="text-card-foreground">{t("dashboard.cancelRecurringClassTitle")}</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t("dashboard.cancelRecurringClassHelp")}
            </Dialog.Description>
            {recurringCancelTarget && isLateCancellation(
              recurringCancelTarget.nextStartsAt,
              attendee === "teacher" ? "tutor" : "student"
            ) && (
              <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {t("strikes.lateCancellationWarning")}
              </p>
            )}
            {recurringCancelError && <p className="mt-4 text-sm text-destructive">{recurringCancelError}</p>}
            <div className="mt-5 flex gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => setRecurringCancelTarget(null)}
                disabled={cancellingRecurring}
                className="rounded-xl border border-border px-4 py-2 text-sm text-card-foreground hover:bg-accent disabled:opacity-50"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={() => void cancelRecurringClass()}
                disabled={cancellingRecurring}
                className="rounded-xl bg-destructive px-4 py-2 text-sm text-destructive-foreground hover:opacity-90 disabled:opacity-50"
              >
                {t("common.confirm")}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <PersonProfileDialog person={profilePerson} onClose={() => setProfilePerson(null)} />
    </div>
  );
}

// ─── DASHBOARD PAGE ───────────────────────────────────────────────────────────

export function StudentDashboardPage({ lang }: { lang: string }) {
  const { t } = useLanguage();
  const [studentData, setStudentData] = useState<StudentDashboardData>(emptyStudentDashboardData);
  const [storedUser, setStoredUser] = useState<StoredUser | null>(null);
  const [cancelTarget, setCancelTarget] = useState<CancelClassTarget | null>(null);
  const [cancelError, setCancelError] = useState("");
  const [cancelMessage, setCancelMessage] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const studentName = storedUser?.name || t("common.student");

  async function updateStudentStrikeStatus() {
    const { status, error } = await refreshStrikeStatus();
    if (!error) {
      setStudentData((current) => ({ ...current, strikeStatus: status }));
    }
  }

  async function cancelOneClass(target: { id: string | number }) {
    const { error } = await supabase.rpc("secure_cancel_class", {
      p_lesson_id: target.id,
      p_series: false,
    });

    if (error) throw error;
    void dispatchReminderEmails();
    await updateStudentStrikeStatus();

    setStudentData((current) => ({
      ...current,
      upcomingClasses: current.upcomingClasses.filter((cls) => cls.id !== target.id),
    }));
  }

  async function handleCancelThisClass() {
    if (!cancelTarget) return;
    setCancelling(true);
    setCancelError("");

    try {
      await cancelOneClass(cancelTarget);
      setCancelMessage(t("dashboard.classCancelled"));
      setCancelTarget(null);
    } catch (error) {
      console.error("Failed to cancel class", error);
      setCancelError(error instanceof Error ? error.message : t("dashboard.cancelClassError"));
    } finally {
      setCancelling(false);
    }
  }

  async function handleCancelRecurringSeries() {
    if (!cancelTarget?.recurringLessonId) return;
    setCancelling(true);
    setCancelError("");

    try {
      const { error: cancelSeriesError } = await supabase.rpc("secure_cancel_class", {
        p_lesson_id: cancelTarget.id,
        p_series: true,
      });

      if (cancelSeriesError) throw cancelSeriesError;
      void dispatchReminderEmails();
      await updateStudentStrikeStatus();

      setStudentData((current) => ({
        ...current,
        upcomingClasses: current.upcomingClasses.filter((cls) => cls.recurringLessonId !== cancelTarget.recurringLessonId),
        recurringClasses: current.recurringClasses.filter((cls) => cls.id !== cancelTarget.recurringLessonId),
      }));
      setCancelMessage(t("dashboard.classCancelled"));
      setCancelTarget(null);
    } catch (error) {
      console.error("Failed to cancel recurring class series", error);
      setCancelError(error instanceof Error ? error.message : t("dashboard.cancelClassError"));
    } finally {
      setCancelling(false);
    }
  }

  async function cancelRecurringFromCard(recurringClass: UIRecurringClass) {
    const { error } = await supabase.rpc("secure_cancel_class", {
      p_lesson_id: recurringClass.nextLessonId,
      p_series: true,
    });
    if (error) throw error;
    void dispatchReminderEmails();
    await updateStudentStrikeStatus();

    setStudentData((current) => ({
      ...current,
      recurringClasses: current.recurringClasses.filter((cls) => cls.id !== recurringClass.id),
      upcomingClasses: current.upcomingClasses.filter((cls) => cls.recurringLessonId !== recurringClass.id),
    }));
    setCancelMessage(t("dashboard.classCancelled"));
  }

  useEffect(() => {
    let cancelled = false;
    function handleStoredUserUpdated(event: Event) {
      setStoredUser((event as CustomEvent<StoredUser>).detail);
    }
    window.addEventListener(storedUserUpdatedEvent, handleStoredUserUpdated);

    async function loadStudentDashboard() {
      setStudentData(emptyStudentDashboardData);

      const stored = readStoredUser();
      if (!cancelled) {
        setStoredUser(stored);
      }

      const { data: authData } = await supabase.auth.getUser();
      const studentUid = authData.user?.id ?? stored?.uid;

      if (!studentUid) {
        if (!cancelled) {
          setStudentData({
            ...emptyStudentDashboardData,
            loading: false,
            error: t("common.noStudentUid"),
          });
        }
        return;
      }

      const [
        strikeStatusResult,
        classesResult,
        recurringResult,
        assignmentsResult,
      ] = await Promise.all([
        refreshStrikeStatus(),
        supabase
          .from("classes")
          .select("lesson_id, student_uid, teacher_uid, time, duration, evaluation_completed, student_attended, teacher_attended, student_wants_to_share, recurring_lesson_id, status")
          .eq("student_uid", studentUid)
          .or("status.is.null,status.neq.cancelled")
          .order("time", { ascending: true }),
        supabase
          .from("recurring_classes")
          .select("lesson_id, student_uid, teacher_uid, time, duration")
          .eq("student_uid", studentUid)
          .order("time", { ascending: true }),
        supabase
          .from("assignments")
          .select("assignment_id, lesson_id, student_uid, teacher_uid, name, description, due_date, complete")
          .eq("student_uid", studentUid)
          .eq("complete", false)
          .order("due_date", { ascending: true }),
      ]);
      const { status: strikeStatus, error: strikeStatusError } = strikeStatusResult;
      if (strikeStatusError) {
        if (!cancelled) {
          setStudentData({
            ...emptyStudentDashboardData,
            loading: false,
            error: strikeStatusError.message,
          });
        }
        return;
      }

      if (classesResult.error) {
        if (!cancelled) {
          setStudentData({ ...emptyStudentDashboardData, loading: false, error: classesResult.error.message });
        }
        return;
      }

      if (recurringResult.error) {
        if (!cancelled) {
          setStudentData({ ...emptyStudentDashboardData, loading: false, error: recurringResult.error.message });
        }
        return;
      }

      if (assignmentsResult.error) {
        if (!cancelled) {
          setStudentData({ ...emptyStudentDashboardData, loading: false, error: assignmentsResult.error.message });
        }
        return;
      }

      const classes = (classesResult.data ?? []) as ClassRow[];
      const recurringClassRows = (recurringResult.data ?? []) as RecurringClassRow[];
      const assignmentData = (assignmentsResult.data ?? []) as AssignmentRow[];
      const { skippedDatesBySeries, error: skippedDatesError } =
        await loadRecurringSkippedDates(recurringClassRows);
      if (skippedDatesError) {
        if (!cancelled) {
          setStudentData({ ...emptyStudentDashboardData, loading: false, error: skippedDatesError.message });
        }
        return;
      }
      const today = new Date();
      const lessonIds = classes.map((cls) => cls.lesson_id);
      const teacherUids = Array.from(new Set([
        ...classes.map((cls) => cls.teacher_uid),
        ...recurringClassRows.map((cls) => cls.teacher_uid),
      ]));
      const teacherNames = new Map<string, string>();
      const tutorDetails = new Map<string, StudentTutorDetails>();
      const evaluations = new Map<string, EvaluationRow>();

      const [teacherProfilesResult, tutorRowsResult, evaluationRowsResult] = await Promise.all([
        teacherUids.length > 0
          ? supabase
              .from("profiles")
              .select("uid, name, student_wechat_id, parent_wechat_id, student_email, parent_email, preferred_communication")
              .in("uid", teacherUids)
          : Promise.resolve({ data: [], error: null }),
        teacherUids.length > 0
          ? supabase
              .from("tutor_profiles")
              .select("uid, class_link, meeting_password")
              .in("uid", teacherUids)
          : Promise.resolve({ data: [], error: null }),
        lessonIds.length > 0
          ? supabase
              .from("evaluations")
              .select("evaluation_id, lesson_id, feedback, stars, created_at")
              .in("lesson_id", lessonIds)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (teacherProfilesResult.error) {
        if (!cancelled) {
          setStudentData({ ...emptyStudentDashboardData, loading: false, error: teacherProfilesResult.error.message });
        }
        return;
      }

      if (tutorRowsResult.error) {
        if (!cancelled) {
          setStudentData({ ...emptyStudentDashboardData, loading: false, error: tutorRowsResult.error.message });
        }
        return;
      }

      if (evaluationRowsResult.error) {
        if (!cancelled) {
          setStudentData({ ...emptyStudentDashboardData, loading: false, error: evaluationRowsResult.error.message });
        }
        return;
      }

      teacherProfilesResult.data?.forEach((teacher) => {
        teacherNames.set(teacher.uid, teacher.name);
        tutorDetails.set(teacher.uid, {
          classLink: "",
          meetingPassword: "",
          tutorWechatId: teacher.student_wechat_id ?? "",
          parentWechatId: teacher.parent_wechat_id ?? "",
          tutorEmail: teacher.student_email ?? "",
          parentEmail: teacher.parent_email ?? "",
          preferredCommunication:
            teacher.preferred_communication === "wechat"
              || teacher.preferred_communication === "email"
              ? teacher.preferred_communication
              : "",
        });
      });

      ((tutorRowsResult.data ?? []) as TutorDetailsRow[]).forEach((tutor) => {
        const existing = tutorDetails.get(tutor.uid);
        tutorDetails.set(tutor.uid, {
          classLink: tutor.class_link,
          meetingPassword: tutor.meeting_password,
          tutorWechatId: existing?.tutorWechatId ?? "",
          parentWechatId: existing?.parentWechatId ?? "",
          tutorEmail: existing?.tutorEmail ?? "",
          parentEmail: existing?.parentEmail ?? "",
          preferredCommunication: existing?.preferredCommunication ?? "",
        });
      });

      ((evaluationRowsResult.data ?? []) as EvaluationRow[]).forEach((evaluation) => {
        if (!evaluations.has(evaluation.lesson_id)) {
          evaluations.set(evaluation.lesson_id, evaluation);
        }
      });
      const missingAssignmentTeacherUids = Array.from(
        new Set(
          assignmentData
            .map((assignment) => assignment.teacher_uid)
            .filter((teacherUid) => !teacherNames.has(teacherUid))
        )
      );
      const missingAssignmentLessonIds = Array.from(
        new Set(
          assignmentData
            .map((assignment) => assignment.lesson_id)
            .filter((lessonId): lessonId is string => lessonId !== null)
            .filter((lessonId) => !evaluations.has(lessonId))
        )
      );
      const [assignmentTeachersResult, assignmentEvaluationsResult] = await Promise.all([
        missingAssignmentTeacherUids.length > 0
          ? supabase
              .from("profiles")
              .select("uid, name")
              .in("uid", missingAssignmentTeacherUids)
          : Promise.resolve({ data: [], error: null }),
        missingAssignmentLessonIds.length > 0
          ? supabase
              .from("evaluations")
              .select("evaluation_id, lesson_id, feedback, stars, created_at")
              .in("lesson_id", missingAssignmentLessonIds)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (assignmentTeachersResult.error) {
        if (!cancelled) {
          setStudentData({ ...emptyStudentDashboardData, loading: false, error: assignmentTeachersResult.error.message });
        }
        return;
      }

      if (assignmentEvaluationsResult.error) {
        if (!cancelled) {
          setStudentData({ ...emptyStudentDashboardData, loading: false, error: assignmentEvaluationsResult.error.message });
        }
        return;
      }

      assignmentTeachersResult.data?.forEach((teacher) => {
        teacherNames.set(teacher.uid, teacher.name);
      });

      ((assignmentEvaluationsResult.data ?? []) as EvaluationRow[]).forEach((evaluation) => {
        if (!evaluations.has(evaluation.lesson_id)) {
          evaluations.set(evaluation.lesson_id, evaluation);
        }
      });

      const studentClassLabels = {
        tutor: t("common.tutor"),
        chineseClass: t("dashboard.chineseClass"),
        myNote: (value: string) => t("dashboard.myNote", { value }),
        tutorWechatId: (value: string) => t("dashboard.tutorWechatId", { value }),
        parentWechatId: (value: string) => t("dashboard.parentWechatId", { value }),
        tutorAndParentWechatIds: (tutor: string, parent: string) =>
          t("dashboard.tutorAndParentWechatIds", { tutor, parent }),
        tutorEmail: (value: string) => t("dashboard.tutorCommunicationEmail", { value }),
        parentEmail: (value: string) => t("dashboard.parentCommunicationEmail", { value }),
        tutorAndParentEmails: (tutor: string, parent: string) =>
          t("dashboard.tutorAndParentEmails", { tutor, parent }),
        preferredCommunication: (value: string) => t("dashboard.preferredCommunication", {
          value: value === "wechat" || value === "email"
            ? t(`auth.preferredCommunication.${value}` as "auth.preferredCommunication.wechat" | "auth.preferredCommunication.email")
            : value,
        }),
        none: t("common.none"),
      };
      const uiClasses = classes.map((cls) => toStudentUIClass(cls, teacherNames, tutorDetails, evaluations, lang, studentClassLabels));
      const recurringClasses = recurringClassRows.flatMap((recurringClass) => {
        const nextClass = classes.find(
          (cls) => cls.recurring_lesson_id === recurringClass.lesson_id && getClassStart(cls) > today
        );
        if (!nextClass) return [];
        return [toUIRecurringClass(
          recurringClass,
          nextClass.lesson_id,
          getClassStart(nextClass),
          recurringClass.teacher_uid,
          "tutor",
          teacherNames.get(recurringClass.teacher_uid)?.trim() || t("common.tutor"),
          skippedDatesBySeries.get(recurringClass.lesson_id) ?? [],
          lang
        )];
      });
      const byStartTime = (a: UIClass, b: UIClass) => a.startsAt.getTime() - b.startsAt.getTime();
      const byEndTimeNearestCompleted = (a: UIClass, b: UIClass) => b.endsAt.getTime() - a.endsAt.getTime();
      const latestClass = classes
        .filter((cls) => evaluations.has(cls.lesson_id))
        .sort((a, b) => getClassStart(b).getTime() - getClassStart(a).getTime())[0];
      const latestEvaluation = latestClass ? evaluations.get(latestClass.lesson_id) : undefined;
      const feedback = latestEvaluation && latestClass
        ? {
            teacher: teacherNames.get(latestClass.teacher_uid)?.trim() || t("common.tutor"),
            text: latestEvaluation.feedback,
            stars: latestEvaluation.stars,
            date: formatClassDateFromInstant(getClassStart(latestClass), lang),
          }
        : null;
      const classStartByLessonId = new Map(
        classes.map((cls) => [cls.lesson_id, getClassStart(cls)] as const)
      );
      const assignments = assignmentData.map((assignment) => {
        const deadline = aoeDeadlineInstant(assignment.due_date);
        const msUntilDue = deadline.getTime() - today.getTime();
        const overdue = msUntilDue < 0;
        const dueSoon = !overdue && msUntilDue <= 48 * 60 * 60 * 1000;
        const status: UIAssignment["status"] = overdue ? "overdue" : dueSoon ? "dueSoon" : "assigned";
        const assignmentEvaluation = assignment.lesson_id
          ? evaluations.get(assignment.lesson_id)
          : undefined;
        const assignedAt = assignmentEvaluation
          ? new Date(assignmentEvaluation.created_at)
          : assignment.lesson_id
            ? classStartByLessonId.get(assignment.lesson_id)
            : undefined;

        return {
          id: assignment.assignment_id,
          name: assignment.name,
          description: assignment.description,
          assignedBy: teacherNames.get(assignment.teacher_uid)?.trim() || t("common.tutor"),
          assignedOn: assignedAt
            ? formatClassDateFromInstant(assignedAt, lang)
            : t("common.unknownDate"),
          due: formatAoeDeadlineLocal(assignment.due_date, lang),
          status,
          dueSoon,
          overdue,
        };
      });

      if (!cancelled) {
        setStudentData({
          loading: false,
          error: "",
          strikeStatus,
          feedback,
          assignments,
          upcomingClasses: uiClasses.filter((cls) => cls.startsAt > today).sort(byStartTime),
          completedClasses: uiClasses.filter((cls) => cls.endsAt < today).sort(byEndTimeNearestCompleted),
          recurringClasses,
        });
      }
    }

    loadStudentDashboard();

    return () => {
      cancelled = true;
      window.removeEventListener(storedUserUpdatedEvent, handleStoredUserUpdated);
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground">
            {t("dashboard.hello", { name: studentName.split(" ")[0] })}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("dashboard.studentOverview")}
          </p>
          <p className={`mt-1 text-xs font-medium ${strikeCountClass(studentData.strikeStatus.strikes)}`}>
            {t("strikes.count", { count: studentData.strikeStatus.strikes })}
          </p>
        </div>
      </div>

      {studentData.error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {studentData.error}
        </div>
      )}
      {cancelMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {cancelMessage}
        </div>
      )}
      {studentData.strikeStatus.isBanned && studentData.strikeStatus.bannedUntil && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {t("strikes.bannedWarning", {
            date: formatBanEnd(studentData.strikeStatus.bannedUntil, lang),
          })}
        </div>
      )}

      {/* Top row: Feedback + Assignments side by side */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:[min-height:300px]">
        <FeedbackCard lang={lang} feedback={studentData.feedback} loading={studentData.loading} />
        <AssignmentsCard
          lang={lang}
          assignments={studentData.assignments}
          loading={studentData.loading}
          onCompleteAssignment={(assignmentId) => {
            setStudentData((current) => ({
              ...current,
              assignments: current.assignments.filter((assignment) => assignment.id !== assignmentId),
            }));
          }}
        />
      </div>

      {/* Bottom: Classes (full width, larger) */}
      <ClassesCard
        lang={lang}
        upcomingClasses={studentData.upcomingClasses}
        completedClasses={studentData.completedClasses}
        recurringClasses={studentData.recurringClasses}
        loading={studentData.loading}
        onCancelClass={(cls) => {
          setCancelMessage("");
          setCancelError("");
          setCancelTarget(cls);
        }}
        onCancelRecurring={cancelRecurringFromCard}
      />
      <Dialog.Root open={cancelTarget !== null} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl">
            <Dialog.Close
              className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-card-foreground"
              aria-label={t("common.close")}
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
            <Dialog.Title className="pr-10 text-card-foreground">
              {cancelTarget?.recurringLessonId ? t("dashboard.cancelRecurringTitle") : t("dashboard.cancelClassTitle")}
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {cancelTarget?.recurringLessonId ? t("dashboard.cancelRecurringHelp") : t("dashboard.cancelClassHelp")}
            </Dialog.Description>
            {isLateCancellation(cancelTarget?.startsAt, "student") && (
              <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {t("strikes.lateCancellationWarning")}
              </p>
            )}
            {cancelError && (
              <p className="mt-4 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {cancelError}
              </p>
            )}
            <div className={`mt-5 grid w-full gap-2 ${cancelTarget?.recurringLessonId ? "sm:grid-cols-2" : ""}`}>
              {cancelTarget?.recurringLessonId && (
                <button
                  type="button"
                  onClick={() => void handleCancelRecurringSeries()}
                  disabled={cancelling}
                  className="w-full rounded-xl border border-destructive/30 px-4 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                >
                  {t("dashboard.cancelRecurringSeries")}
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleCancelThisClass()}
                disabled={cancelling}
                className="w-full rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {cancelTarget?.recurringLessonId ? t("dashboard.cancelThisClass") : t("common.confirm")}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

export function TutorDashboardPage({ lang }: { lang: string }) {
  const { t } = useLanguage();
  const [dashboardData, setDashboardData] = useState<TutorDashboardData>(emptyTutorDashboardData);
  const [storedUser, setStoredUser] = useState<StoredUser | null>(null);
  const [cancelTarget, setCancelTarget] = useState<CancelClassTarget | null>(null);
  const [cancelError, setCancelError] = useState("");
  const [cancelMessage, setCancelMessage] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const tutorName = storedUser?.name || t("common.tutor");

  async function updateTutorStrikeStatus() {
    const { status, error } = await refreshStrikeStatus();
    if (!error) {
      setDashboardData((current) => ({ ...current, strikeStatus: status }));
    }
  }

  useEffect(() => {
    let cancelled = false;
    function handleStoredUserUpdated(event: Event) {
      setStoredUser((event as CustomEvent<StoredUser>).detail);
    }
    window.addEventListener(storedUserUpdatedEvent, handleStoredUserUpdated);

    async function loadTutorDashboard() {
      setDashboardData(emptyTutorDashboardData);

      const stored = readStoredUser();
      if (!cancelled) {
        setStoredUser(stored);
      }

      const { data: authData } = await supabase.auth.getUser();
      const tutorUid = authData.user?.id ?? stored?.uid;
      if (!tutorUid) {
        if (!cancelled) {
          setDashboardData({
            ...emptyTutorDashboardData,
            loading: false,
            error: t("common.noTutorUid"),
          });
        }
        return;
      }

      const [strikeStatusResult, tutorProfileResult] = await Promise.all([
        refreshStrikeStatus(),
        supabase
          .from("profiles")
          .select("uid, role, name, email")
          .eq("uid", tutorUid)
          .maybeSingle(),
      ]);
      const { status: strikeStatus, error: strikeStatusError } = strikeStatusResult;
      if (strikeStatusError) {
        if (!cancelled) {
          setDashboardData({
            ...emptyTutorDashboardData,
            loading: false,
            error: strikeStatusError.message,
          });
        }
        return;
      }

      const { data: tutorProfile, error: tutorProfileError } = tutorProfileResult;

      if (tutorProfileError || !tutorProfile) {
        if (!cancelled) {
          setDashboardData({
            ...emptyTutorDashboardData,
            loading: false,
            error: tutorProfileError?.message || t("common.noTutorProfile"),
          });
        }
        return;
      }

      const currentTutorName = tutorProfile.name;
      if (!cancelled) {
        const currentTutor = {
          uid: tutorProfile.uid,
          role: tutorProfile.role as AccountRole,
          name: tutorProfile.name,
          email: tutorProfile.email,
        };
        setStoredUser(currentTutor);
        writeStoredUser(currentTutor);
      }

      const now = new Date();
      const classColumns = "lesson_id, student_uid, teacher_uid, time, duration, evaluation_completed, student_attended, teacher_attended, student_wants_to_share, recurring_lesson_id, status";

      const [tutorClassesResult, recurringResult] = await Promise.all([
        supabase
          .from("classes")
          .select(classColumns)
          .eq("teacher_uid", tutorUid)
          .or("status.is.null,status.neq.cancelled")
          .order("time", { ascending: true }),
        supabase
          .from("recurring_classes")
          .select("lesson_id, student_uid, teacher_uid, time, duration")
          .eq("teacher_uid", tutorUid)
          .order("time", { ascending: true }),
      ]);

      if (tutorClassesResult.error) {
        if (!cancelled) {
          setDashboardData({
            ...emptyTutorDashboardData,
            loading: false,
            error: tutorClassesResult.error.message,
          });
        }
        return;
      }

      if (recurringResult.error) {
        if (!cancelled) {
          setDashboardData({
            ...emptyTutorDashboardData,
            loading: false,
            error: recurringResult.error.message,
          });
        }
        return;
      }

      const tutorClassRows = (tutorClassesResult.data ?? []) as ClassRow[];
      const recurringClassRows = (recurringResult.data ?? []) as RecurringClassRow[];
      const { skippedDatesBySeries, error: skippedDatesError } =
        await loadRecurringSkippedDates(recurringClassRows);
      if (skippedDatesError) {
        if (!cancelled) {
          setDashboardData({
            ...emptyTutorDashboardData,
            loading: false,
            error: skippedDatesError.message,
          });
        }
        return;
      }
      const completedClassRows = tutorClassRows.filter((cls) => getClassEnd(cls) < now);
      const upcomingClassRows = tutorClassRows.filter((cls) => getClassEnd(cls) >= now);
      const classes = [...completedClassRows, ...upcomingClassRows];
      const studentUids = Array.from(new Set([
        ...classes.map((cls) => cls.student_uid),
        ...recurringClassRows.map((cls) => cls.student_uid),
      ]));
      const completedStudentUids = Array.from(new Set(completedClassRows.map((cls) => cls.student_uid)));
      const studentProfiles = new Map<string, BasicProfile>();

      const [
        studentProfilesResult,
        volunteerRecordsResult,
        tutorDetailsResult,
        availabilityResult,
      ] = await Promise.all([
        studentUids.length > 0
          ? supabase
              .from("profiles")
              .select("uid, role, name, student_wechat_id, parent_wechat_id")
              .in("uid", studentUids)
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from("volunteer_records")
          .select("minutes")
          .eq("tutor_uid", tutorUid),
        supabase
          .from("tutor_profiles")
          .select("class_link, meeting_password")
          .eq("uid", tutorUid)
          .maybeSingle(),
        supabase
          .from("tutor_availability")
          .select("tutor_uid")
          .eq("tutor_uid", tutorUid)
          .eq("weekend_date", currentBeijingWeekendDate())
          .maybeSingle(),
      ]);

      if (studentProfilesResult.error) {
        if (!cancelled) {
          setDashboardData({
            ...emptyTutorDashboardData,
            loading: false,
            error: studentProfilesResult.error.message,
          });
        }
        return;
      }

      if (volunteerRecordsResult.error) {
        if (!cancelled) {
          setDashboardData({
            ...emptyTutorDashboardData,
            loading: false,
            error: volunteerRecordsResult.error.message,
          });
        }
        return;
      }

      if (tutorDetailsResult.error) {
        if (!cancelled) {
          setDashboardData({
            ...emptyTutorDashboardData,
            loading: false,
            error: tutorDetailsResult.error.message,
          });
        }
        return;
      }

      if (availabilityResult.error) {
        if (!cancelled) {
          setDashboardData({
            ...emptyTutorDashboardData,
            loading: false,
            error: availabilityResult.error.message,
          });
        }
        return;
      }

      ((studentProfilesResult.data ?? []) as BasicProfile[]).forEach((profile) => {
        studentProfiles.set(profile.uid, profile);
      });

      const volunteerRecords = volunteerRecordsResult.data;
      const tutorDetails = tutorDetailsResult.data;
      const availabilityRow = availabilityResult.data;
      const tutorDetailsRow = tutorDetails as Record<string, string | null> | null;
      const beijingDay = beijingCalendarToday().getDay();
      const availabilityDeadlinePassed = beijingDay === 5 || beijingDay === 6 || beijingDay === 0;
      const availabilityNeedsSetup = !availabilityRow && !availabilityDeadlinePassed;
      const meetingDetails = tutorDetails
        ? {
            classLink: String(tutorDetailsRow?.class_link ?? ""),
            meetingPassword: String(tutorDetailsRow?.meeting_password ?? ""),
          }
        : undefined;

      const tutorClassLabels = {
        unknownStudent: (uid: string) => t("dashboard.unknownStudent", { uid }),
        classWith: (name: string) => t("dashboard.classWith", { name }),
        studentNotes: (value: string) => t("dashboard.studentNotes", { value }),
        studentWechatId: (value: string) => t("dashboard.studentWechatId", { value }),
        none: t("common.none"),
      };
      const completedUiClasses = completedClassRows.map((cls) => toUIClass(cls, studentProfiles, currentTutorName, meetingDetails, lang, tutorClassLabels));
      const upcomingUiClasses = upcomingClassRows.map((cls) => toUIClass(cls, studentProfiles, currentTutorName, meetingDetails, lang, tutorClassLabels));
      const recurringClasses = recurringClassRows.flatMap((recurringClass) => {
        const nextClass = upcomingClassRows.find(
          (cls) => cls.recurring_lesson_id === recurringClass.lesson_id && getClassStart(cls) > now
        );
        if (!nextClass) return [];
        return [toUIRecurringClass(
          recurringClass,
          nextClass.lesson_id,
          getClassStart(nextClass),
          recurringClass.student_uid,
          "student",
          studentProfiles.get(recurringClass.student_uid)?.name ?? t("common.student"),
          skippedDatesBySeries.get(recurringClass.lesson_id) ?? [],
          lang
        )];
      });
      const byStartTime = (a: UIClass, b: UIClass) => a.startsAt.getTime() - b.startsAt.getTime();
      const byEndTimeNearestCompleted = (a: UIClass, b: UIClass) => b.endsAt.getTime() - a.endsAt.getTime();
      const totalVolunteerMinutes = ((volunteerRecords ?? []) as VolunteerRecordRow[]).reduce(
        (total, record) => total + record.minutes,
        0
      );

      if (!cancelled) {
        setDashboardData({
          loading: false,
          error: "",
          strikeStatus,
          availabilityNeedsSetup,
          stats: {
            totalClasses: completedClassRows.length,
            studentsTaught: completedStudentUids.length,
            totalMinutes: totalVolunteerMinutes,
          },
          pendingEvaluations: completedUiClasses
            .filter((cls) => !cls.evaluationCompleted && studentProfiles.get(cls.studentUid)?.role !== "deleted")
            .sort(byEndTimeNearestCompleted),
          upcomingClasses: upcomingUiClasses.sort(byStartTime),
          completedClasses: completedUiClasses.sort(byEndTimeNearestCompleted),
          recurringClasses,
        });
      }
    }

    loadTutorDashboard();

    return () => {
      cancelled = true;
      window.removeEventListener(storedUserUpdatedEvent, handleStoredUserUpdated);
    };
  }, []);

  async function cancelTutorRecurringClass(recurringClass: UIRecurringClass) {
    const { error } = await supabase.rpc("secure_cancel_class", {
      p_lesson_id: recurringClass.nextLessonId,
      p_series: true,
    });
    if (error) throw error;
    void dispatchReminderEmails();
    await updateTutorStrikeStatus();

    setDashboardData((current) => ({
      ...current,
      recurringClasses: current.recurringClasses.filter((cls) => cls.id !== recurringClass.id),
      upcomingClasses: current.upcomingClasses.filter((cls) => cls.recurringLessonId !== recurringClass.id),
    }));
  }

  async function handleTutorCancelClass(series: boolean) {
    if (!cancelTarget) return;
    setCancelling(true);
    setCancelError("");

    const { error } = await supabase.rpc("secure_cancel_class", {
      p_lesson_id: cancelTarget.id,
      p_series: series,
    });

    if (error) {
      console.error("Failed to cancel tutor class", error);
      setCancelError(error.message);
      setCancelling(false);
      return;
    }
    void dispatchReminderEmails();
    await updateTutorStrikeStatus();

    setDashboardData((current) => ({
      ...current,
      upcomingClasses: series && cancelTarget.recurringLessonId
        ? current.upcomingClasses.filter((cls) => cls.recurringLessonId !== cancelTarget.recurringLessonId)
        : current.upcomingClasses.filter((cls) => cls.id !== cancelTarget.id),
      recurringClasses: series && cancelTarget.recurringLessonId
        ? current.recurringClasses.filter((cls) => cls.id !== cancelTarget.recurringLessonId)
        : current.recurringClasses,
    }));
    setCancelMessage(t("dashboard.classCancelled"));
    setCancelTarget(null);
    setCancelling(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground">
            {t("dashboard.hello", { name: tutorName.split(" ")[0] })}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("dashboard.tutorOverview")}
          </p>
          <p className={`mt-1 text-xs font-medium ${strikeCountClass(dashboardData.strikeStatus.strikes)}`}>
            {t("strikes.count", { count: dashboardData.strikeStatus.strikes })}
          </p>
        </div>
      </div>

      {dashboardData.error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {dashboardData.error}
        </div>
      )}
      {cancelMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {cancelMessage}
        </div>
      )}
      {dashboardData.strikeStatus.isBanned && dashboardData.strikeStatus.bannedUntil && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {t("strikes.bannedWarning", {
            date: formatBanEnd(dashboardData.strikeStatus.bannedUntil, lang),
          })}
        </div>
      )}

      {!dashboardData.loading
        && !dashboardData.error
        && !dashboardData.strikeStatus.isBanned
        && dashboardData.availabilityNeedsSetup && (
        <div className="flex flex-col gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-200">
              <AlertTriangle size={20} aria-hidden="true" />
            </span>
            <div>
              <p className="font-medium">{t("dashboard.availabilityRequired")}</p>
              <p className="mt-1 text-sm text-amber-800">{t("dashboard.availabilityRequiredHelp")}</p>
            </div>
          </div>
          <Link
            href="/tutor-schedule"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-800"
          >
            {t("dashboard.setAvailability")}
            <ChevronRight size={16} />
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:[min-height:300px]">
        <TutorStatsCard lang={lang} data={dashboardData} />
        <PendingEvaluationsCard
          lang={lang}
          evaluations={dashboardData.pendingEvaluations}
          loading={dashboardData.loading}
        />
      </div>

      <ClassesCard
        lang={lang}
        feedbackLabel={t("dashboard.viewEvaluation")}
        feedbackPendingLabel={t("dashboard.writeEvaluation")}
        upcomingClasses={dashboardData.upcomingClasses}
        completedClasses={dashboardData.completedClasses}
        recurringClasses={dashboardData.recurringClasses}
        loading={dashboardData.loading}
        useEvaluationPage
        attendee="teacher"
        onCancelRecurring={cancelTutorRecurringClass}
        onCancelClass={(cls) => {
          setCancelMessage("");
          setCancelError("");
          setCancelTarget(cls);
        }}
      />
      <Dialog.Root open={cancelTarget !== null} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl">
            <Dialog.Close
              className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-card-foreground"
              aria-label={t("common.close")}
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
            <Dialog.Title className="pr-10 text-card-foreground">
              {cancelTarget?.recurringLessonId ? t("dashboard.cancelRecurringTitle") : t("dashboard.cancelClassTitle")}
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {cancelTarget?.recurringLessonId ? t("dashboard.cancelRecurringHelp") : t("dashboard.cancelClassHelp")}
            </Dialog.Description>
            {isLateCancellation(cancelTarget?.startsAt, "tutor") && (
              <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {t("strikes.lateCancellationWarning")}
              </p>
            )}
            {cancelError && <p className="mt-4 text-sm text-destructive">{cancelError}</p>}
            <div className={`mt-5 grid w-full gap-2 ${cancelTarget?.recurringLessonId ? "sm:grid-cols-2" : ""}`}>
              {cancelTarget?.recurringLessonId && (
                <button
                  type="button"
                  onClick={() => void handleTutorCancelClass(true)}
                  disabled={cancelling}
                  className="w-full rounded-xl border border-destructive/30 px-4 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                >
                  {t("dashboard.cancelRecurringSeries")}
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleTutorCancelClass(false)}
                disabled={cancelling}
                className="w-full rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {cancelTarget?.recurringLessonId ? t("dashboard.cancelThisClass") : t("common.confirm")}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

// ─── ROOT SHELL ──────────────────────────────────────────────────────────────

function LoadingFallback() {
  const { t } = useLanguage();
  return <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">{t("common.loading")}</div>;
}

// Temporary signed-in-page feedback link. Remove this component and its usage
// in AppShellContent when the external feedback form is no longer needed.
function TemporaryFeedbackLink() {
  return (
    <a
      href="https://form.jotform.com/261875934177067"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full border border-border bg-card px-4 py-3 text-sm font-medium text-card-foreground shadow-xl transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      aria-label="Bug Report / Feature Request"
    >
      <CircleHelp size={18} className="shrink-0 text-primary" />
      <span>Bug Report / Feature Request</span>
    </a>
  );
}

export function AppShell({
  activePage,
  children,
  user = STUDENT,
  dashboardHref = "/student-dashboard",
  individualQueryHref,
  scheduleHref = "/student-schedule",
  recordHref,
  trainingHref,
  volunteerAwardHref,
  studentMaterialsHref,
  speakingSamplesHref,
  manageMediaHref,
  communicationsHref,
  requiredRole,
}: {
  activePage: "dashboard" | "individualQuery" | "schedule" | "record" | "training" | "awards" | "studentMaterials" | "speakingSamples" | "manageMedia" | "communications";
  children: (lang: string) => ReactNode;
  user?: typeof STUDENT;
  dashboardHref?: string;
  individualQueryHref?: string;
  scheduleHref?: string | null;
  recordHref?: string;
  trainingHref?: string;
  volunteerAwardHref?: string;
  studentMaterialsHref?: string;
  speakingSamplesHref?: string;
  manageMediaHref?: string;
  communicationsHref?: string;
  requiredRole?: AccountRole;
}) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AppShellContent
        activePage={activePage}
        user={user}
        dashboardHref={dashboardHref}
        individualQueryHref={individualQueryHref}
        scheduleHref={scheduleHref}
        recordHref={recordHref}
        trainingHref={trainingHref}
        volunteerAwardHref={volunteerAwardHref}
        studentMaterialsHref={studentMaterialsHref}
        speakingSamplesHref={speakingSamplesHref}
        manageMediaHref={manageMediaHref}
        communicationsHref={communicationsHref}
        requiredRole={requiredRole}
      >
        {children}
      </AppShellContent>
    </Suspense>
  );
}

function AppShellContent({
  activePage,
  children,
  user,
  dashboardHref,
  individualQueryHref,
  scheduleHref,
  recordHref,
  trainingHref,
  volunteerAwardHref,
  studentMaterialsHref,
  speakingSamplesHref,
  manageMediaHref,
  communicationsHref,
  requiredRole,
}: {
  activePage: "dashboard" | "individualQuery" | "schedule" | "record" | "training" | "awards" | "studentMaterials" | "speakingSamples" | "manageMedia" | "communications";
  children: (lang: string) => ReactNode;
  user: typeof STUDENT;
  dashboardHref: string;
  individualQueryHref?: string;
  scheduleHref?: string | null;
  recordHref?: string;
  trainingHref?: string;
  volunteerAwardHref?: string;
  studentMaterialsHref?: string;
  speakingSamplesHref?: string;
  manageMediaHref?: string;
  communicationsHref?: string;
  requiredRole?: AccountRole;
}) {
  const { lang, t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchString = searchParams.toString();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [storedUser, setStoredUser] = useState<StoredUser | null>(null);
  const [authChecked, setAuthChecked] = useState(!requiredRole);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [rulesRequired, setRulesRequired] = useState(false);
  const [notificationMethod, setNotificationMethod] = useState<"wechat" | "email" | "phone" | null>(null);
  const [accessError, setAccessError] = useState("");
  const fallbackName =
    requiredRole === "tutor"
      ? t("common.tutor")
      : requiredRole === "admin"
        ? t("role.administrator")
        : t("common.student");
  const navUser = {
    ...user,
    name: storedUser?.name || fallbackName,
    email: storedUser?.email || user.email,
  };

  useEffect(() => {
    let cancelled = false;
    if (requiredRole) {
      setAuthChecked(false);
      setAccessError("");
    }

    function handleStoredUserUpdated(event: Event) {
      setStoredUser((event as CustomEvent<StoredUser>).detail);
    }
    window.addEventListener(storedUserUpdatedEvent, handleStoredUserUpdated);

    async function checkAccess() {
      const cachedUser = readStoredUser();
      if (!cancelled) {
        setStoredUser(cachedUser);
      }

      if (!requiredRole) {
        if (!cancelled) setAuthChecked(true);
        return;
      }

      const currentPath = `${pathname}${searchString ? `?${searchString}` : ""}`;
      const signInPath = `/?redirectTo=${encodeURIComponent(currentPath)}`;
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        clearStoredAuthState();
        router.replace(signInPath);
        return;
      }

      await refreshStrikeStatus();

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("uid, role, name, email, notification_method, rules_acknowledged_at, time_zone")
        .eq("uid", authData.user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Failed to load profile while checking page access", profileError);
        if (!cancelled) {
          setAccessError(profileError.message);
          setAuthChecked(true);
        }
        return;
      }

      if (!profile) {
        router.replace(signInPath);
        return;
      }

      if (profile.role !== requiredRole) {
        await supabase.auth.signOut();
        clearStoredAuthState();
        router.replace(signInPath);
        return;
      }

      const currentUser = {
        uid: profile.uid,
        role: profile.role as AccountRole,
        name: profile.name,
        email: profile.email,
      };
      writeStoredUser(currentUser);

      const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (browserTimeZone && profile.time_zone !== browserTimeZone) {
        void supabase
          .from("profiles")
          .update({ time_zone: browserTimeZone })
          .eq("uid", profile.uid)
          .then(({ error }) => {
            if (error) console.error("Failed to update profile time zone", error);
          });
      }

      if (!cancelled) {
        setStoredUser(currentUser);
        if (profile.role === "student" || profile.role === "tutor") {
          const registrationNotificationMethod =
            authData.user.user_metadata?.pending_registration?.details?.notification_method;
          setNotificationMethod(
            profile.notification_method === "wechat"
              || profile.notification_method === "email"
              || profile.notification_method === "phone"
              ? profile.notification_method
              : registrationNotificationMethod === "wechat"
                  || registrationNotificationMethod === "email"
                  || registrationNotificationMethod === "phone"
                ? registrationNotificationMethod
                : "email"
          );
          if (profile.rules_acknowledged_at === null) {
            setRulesRequired(true);
            setRulesOpen(true);
          } else {
            setRulesRequired(false);
          }
        }
        setAuthChecked(true);
      }
    }

    void checkAccess();

    return () => {
      cancelled = true;
      window.removeEventListener(storedUserUpdatedEvent, handleStoredUserUpdated);
    };
  }, [pathname, requiredRole, router, searchString]);

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        {t("common.loading")}
      </div>
    );
  }

  if (accessError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md rounded-2xl border border-destructive/20 bg-card p-5 text-sm text-destructive">
          {accessError}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background md:h-screen md:overflow-hidden">
      <TopNav
        user={navUser}
        onMenuClick={() => setSidebarOpen(true)}
        onUserUpdated={setStoredUser}
        onRulesClick={
          requiredRole === "student" || requiredRole === "tutor"
            ? () => {
                setRulesRequired(false);
                setRulesOpen(true);
              }
            : undefined
        }
      />
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        <Sidebar
          active={activePage}
          dashboardHref={dashboardHref}
          individualQueryHref={individualQueryHref}
          scheduleHref={scheduleHref}
          scheduleLabel={requiredRole === "tutor" ? t("schedule.setAvailability") : t("schedule.studentTitle")}
          recordHref={recordHref}
          trainingHref={trainingHref}
          volunteerAwardHref={volunteerAwardHref}
          studentMaterialsHref={studentMaterialsHref}
          speakingSamplesHref={speakingSamplesHref}
          manageMediaHref={manageMediaHref}
          communicationsHref={communicationsHref}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main key={pathname} className={`min-w-0 flex-1 p-4 sm:p-6 ${activePage === "schedule" ? "flex flex-col overflow-y-auto md:overflow-hidden" : "overflow-y-auto"}`}>
          {children(lang)}
        </main>
      </div>
      {(requiredRole === "student" || requiredRole === "tutor") && (
        <AccountRulesDialog
          open={rulesOpen}
          required={rulesRequired}
          role={requiredRole}
          notificationMethod={notificationMethod}
          onOpenChange={setRulesOpen}
          onAcknowledge={async () => {
            const { error } = await supabase.rpc("acknowledge_current_user_rules");
            if (error) throw error;
            setRulesRequired(false);
            setRulesOpen(false);
          }}
        />
      )}
      {requiredRole && <TemporaryFeedbackLink />}
    </div>
  );
}

export function StudentScheduleApp() {
  return (
    <AppShell activePage="schedule" studentMaterialsHref="/student-materials" speakingSamplesHref="/speaking-samples" communicationsHref="/student-communications" requiredRole="student">
      {(lang) => <StudentSchedulePage lang={lang} />}
    </AppShell>
  );
}

export function TutorApp() {
  return (
    <AppShell activePage="dashboard" user={TUTOR} dashboardHref="/tutor-dashboard" scheduleHref="/tutor-schedule" recordHref="/volunteer-record" trainingHref="/training-materials" volunteerAwardHref="/volunteer-awards" communicationsHref="/tutor-communications" requiredRole="tutor">
      {(lang) => <TutorDashboardPage lang={lang} />}
    </AppShell>
  );
}

export function TutorScheduleApp() {
  return (
    <AppShell activePage="schedule" user={TUTOR} dashboardHref="/tutor-dashboard" scheduleHref="/tutor-schedule" recordHref="/volunteer-record" trainingHref="/training-materials" volunteerAwardHref="/volunteer-awards" communicationsHref="/tutor-communications" requiredRole="tutor">
      {(lang) => <TutorSchedulePage lang={lang} />}
    </AppShell>
  );
}

export function VolunteerRecordApp() {
  return (
    <AppShell activePage="record" user={TUTOR} dashboardHref="/tutor-dashboard" scheduleHref="/tutor-schedule" recordHref="/volunteer-record" trainingHref="/training-materials" volunteerAwardHref="/volunteer-awards" communicationsHref="/tutor-communications" requiredRole="tutor">
      {(lang) => <VolunteerRecordPage lang={lang} />}
    </AppShell>
  );
}

export function TrainingMaterialsApp() {
  return (
    <AppShell activePage="training" user={TUTOR} dashboardHref="/tutor-dashboard" scheduleHref="/tutor-schedule" recordHref="/volunteer-record" trainingHref="/training-materials" volunteerAwardHref="/volunteer-awards" communicationsHref="/tutor-communications" requiredRole="tutor">
      {() => <MediaListPage category="tutor_training" titleKey="media.tutorTrainingTitle" helpKey="media.tutorTrainingHelp" />}
    </AppShell>
  );
}

export function VolunteerAwardsApp() {
  return (
    <AppShell activePage="awards" user={TUTOR} dashboardHref="/tutor-dashboard" scheduleHref="/tutor-schedule" recordHref="/volunteer-record" trainingHref="/training-materials" volunteerAwardHref="/volunteer-awards" communicationsHref="/tutor-communications" requiredRole="tutor">
      {() => <MediaListPage category="volunteer_award" titleKey="media.volunteerAwardTitle" helpKey="media.volunteerAwardHelp" />}
    </AppShell>
  );
}

export function StudentMaterialsApp() {
  return (
    <AppShell activePage="studentMaterials" studentMaterialsHref="/student-materials" speakingSamplesHref="/speaking-samples" communicationsHref="/student-communications" requiredRole="student">
      {() => <MediaListPage category="student_material" titleKey="media.studentMaterialTitle" helpKey="media.studentMaterialHelp" />}
    </AppShell>
  );
}

export function StudentSpeakingSamplesApp() {
  return (
    <AppShell activePage="speakingSamples" studentMaterialsHref="/student-materials" speakingSamplesHref="/speaking-samples" communicationsHref="/student-communications" requiredRole="student">
      {() => <StudentSpeakingSamplesPage />}
    </AppShell>
  );
}

export function StudentCommunicationsApp() {
  return (
    <AppShell activePage="communications" studentMaterialsHref="/student-materials" speakingSamplesHref="/speaking-samples" communicationsHref="/student-communications" requiredRole="student">
      {() => <CommunicationsPage viewerRole="student" />}
    </AppShell>
  );
}

export function TutorCommunicationsApp() {
  return (
    <AppShell activePage="communications" user={TUTOR} dashboardHref="/tutor-dashboard" scheduleHref="/tutor-schedule" recordHref="/volunteer-record" trainingHref="/training-materials" volunteerAwardHref="/volunteer-awards" communicationsHref="/tutor-communications" requiredRole="tutor">
      {() => <CommunicationsPage viewerRole="tutor" />}
    </AppShell>
  );
}

export function AdminApp() {
  return (
    <AppShell activePage="dashboard" user={ADMIN} dashboardHref="/admin-dashboard" individualQueryHref="/admin-individual-query" scheduleHref={null} manageMediaHref="/admin-media" communicationsHref="/admin-communications" requiredRole="admin">
      {(lang) => <AdminDashboardPage lang={lang} />}
    </AppShell>
  );
}

export function AdminIndividualQueryApp() {
  return (
    <AppShell activePage="individualQuery" user={ADMIN} dashboardHref="/admin-dashboard" individualQueryHref="/admin-individual-query" scheduleHref={null} manageMediaHref="/admin-media" communicationsHref="/admin-communications" requiredRole="admin">
      {() => <AdminIndividualQueryPage />}
    </AppShell>
  );
}

export function ManageMediaApp() {
  return (
    <AppShell activePage="manageMedia" user={ADMIN} dashboardHref="/admin-dashboard" individualQueryHref="/admin-individual-query" scheduleHref={null} manageMediaHref="/admin-media" communicationsHref="/admin-communications" requiredRole="admin">
      {() => <ManageMediaPage />}
    </AppShell>
  );
}

export function AdminCommunicationsApp() {
  return (
    <AppShell activePage="communications" user={ADMIN} dashboardHref="/admin-dashboard" individualQueryHref="/admin-individual-query" scheduleHref={null} manageMediaHref="/admin-media" communicationsHref="/admin-communications" requiredRole="admin">
      {() => <CommunicationsPage viewerRole="admin" />}
    </AppShell>
  );
}

export default function App() {
  return (
    <AppShell activePage="dashboard" studentMaterialsHref="/student-materials" speakingSamplesHref="/speaking-samples" communicationsHref="/student-communications" requiredRole="student">
      {(lang) => <StudentDashboardPage lang={lang} />}
    </AppShell>
  );
}

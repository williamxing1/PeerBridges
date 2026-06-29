"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { StudentSchedulePage } from "./components/StudentSchedulePage";
import { GradesToTutorMultiSelect } from "./components/GradesToTutorMultiSelect";
import { TutorSchedulePage } from "./components/TutorSchedulePage";
import { VolunteerRecordPage } from "./components/VolunteerRecordPage";
import { AdminDashboardPage } from "./components/AdminDashboardPage";
import { ManageMediaPage, MediaListPage } from "./components/MediaPages";
import { CommunicationsPage } from "./components/CommunicationsPage";
import { LanguageProvider, LanguageSelect, optionLabel, useLanguage } from "./i18n";
import { countryLabelForValue, countryOptionsForLang } from "./data/countries";
import { parseGradesToTutor, serializeGradesToTutor } from "./lib/gradesToTutor";
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
  CheckCircle2,
  Settings,
  LogOut,
  User,
  Menu,
  X,
  ChevronRight,
  Users,
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
const gradeOptions = ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];
const englishLevels = ["Beginner", "Intermediate", "Advanced"];

type StoredUser = {
  uid: string;
  role: AccountRole;
  name: string;
  email: string;
};
type AccountRole = "student" | "tutor" | "admin";
type SettingsProfile = {
  uid: string;
  role: "student" | "tutor" | "admin";
  name: string;
  email: string;
  wechatId: string;
  country: string;
  grade: string;
  englishLevel: string;
  school: string;
  gradesToTutor: string;
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
type BasicProfile = {
  uid: string;
  name: string;
  email?: string;
  wechat_id?: string;
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
type UIAssignment = {
  id: string;
  name: string;
  description: string;
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
  feedback: StudentFeedback | null;
  assignments: UIAssignment[];
  upcomingClasses: UIClass[];
  completedClasses: UIClass[];
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

type TutorDashboardData = {
  loading: boolean;
  error: string;
  stats: {
    totalClasses: number;
    studentsTaught: number;
    totalMinutes: number;
  };
  pendingEvaluations: UIClass[];
  upcomingClasses: UIClass[];
  completedClasses: UIClass[];
};

const emptyTutorDashboardData: TutorDashboardData = {
  loading: true,
  error: "",
  stats: {
    totalClasses: 0,
    studentsTaught: 0,
    totalMinutes: 0,
  },
  pendingEvaluations: [],
  upcomingClasses: [],
  completedClasses: [],
};

const emptyStudentDashboardData: StudentDashboardData = {
  loading: true,
  error: "",
  feedback: null,
  assignments: [],
  upcomingClasses: [],
  completedClasses: [],
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
  const studentWechat = studentProfile?.wechat_id?.trim() || labels.none;

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
  tutorDetails: Map<string, { classLink: string; meetingPassword: string }>,
  evaluations: Map<string, EvaluationRow>,
  lang: string,
  labels: {
    tutor: string;
    chineseClass: string;
    myNote: (value: string) => string;
    meetingPassword: (value: string) => string;
    none: string;
  }
): UIClass {
  const startsAt = getClassStart(cls);
  const endsAt = getClassEnd(cls);
  const teacher = teacherNames.get(cls.teacher_uid)?.trim() || labels.tutor;
  const details = tutorDetails.get(cls.teacher_uid);
  const evaluation = evaluations.get(cls.lesson_id);
  const studentNote = cls.student_wants_to_share?.trim() || labels.none;
  const meetingPassword = details?.meetingPassword?.trim() || labels.none;

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
      labels.meetingPassword(meetingPassword),
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm text-card-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition focus:border-primary/40 focus:bg-card"
      />
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
    wechatId: "",
    country: "",
    grade: "",
    englishLevel: "",
    school: "",
    gradesToTutor: "",
    classLink: "",
    meetingPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function updateProfile(key: keyof SettingsProfile, value: string) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function loadSettings() {
      setLoading(true);
      setMessage("");
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

      const { data: baseProfile, error: profileError } = await supabase
        .from("profiles")
        .select("uid, role, name, email, wechat_id")
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
        email: baseProfile.email,
        wechatId: baseProfile.wechat_id,
        country: "",
        grade: "",
        englishLevel: "",
        school: "",
        gradesToTutor: "",
        classLink: "",
        meetingPassword: "",
      };

      if (baseProfile.role === "student") {
        const { data, error: studentError } = await supabase
          .from("student_profiles")
          .select("country, grade, english_level")
          .eq("uid", uid)
          .single();

        if (studentError) {
          if (!cancelled) setError(studentError.message);
        } else {
          nextProfile.country = data.country;
          nextProfile.grade = data.grade;
          nextProfile.englishLevel = data.english_level;
        }
      }

      if (baseProfile.role === "tutor") {
        const { data, error: tutorError } = await supabase
          .from("tutor_profiles")
          .select("school, grade, grades_to_tutor, class_link, meeting_password")
          .eq("uid", uid)
          .single();

        if (tutorError) {
          if (!cancelled) setError(tutorError.message);
        } else {
          nextProfile.school = data.school;
          nextProfile.grade = data.grade;
          nextProfile.gradesToTutor = serializeGradesToTutor(parseGradesToTutor(data.grades_to_tutor));
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
    setError("");

    const { error: authError } = await supabase.auth.updateUser({ email: profile.email });
    if (authError) {
      setError(authError.message);
      setSaving(false);
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        name: profile.name,
        email: profile.email,
        wechat_id: profile.wechatId,
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
          english_level: profile.englishLevel,
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
          grades_to_tutor: profile.gradesToTutor,
          class_link: profile.classLink,
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
      email: profile.email,
    };
    writeStoredUser(updatedUser);
    onUserUpdated(updatedUser);
    setMessage(t("settings.saved"));
    setSaving(false);
  }

  async function handleResetPassword() {
    setMessage("");
    setError("");
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(profile.email, {
      redirectTo: window.location.origin,
    });

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setMessage(t("settings.resetSent"));
  }

  async function handleDeleteAccount() {
    setMessage("");
    setError("");
    const confirmed = window.confirm(t("settings.deleteConfirm"));
    if (!confirmed) return;

    const { error: rpcError } = await supabase.rpc("delete_current_user");
    if (rpcError) {
      setError(t("settings.deleteRpcRequired", { message: rpcError.message }));
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
                  <SettingsField label={t("auth.wechatId")} value={profile.wechatId} onChange={(value) => updateProfile("wechatId", value)} />

                  {profile.role === "student" && (
                    <>
                      <SettingsCountrySelect label={t("auth.country")} value={profile.country} onChange={(value) => updateProfile("country", value)} />
                      <SettingsSelect label={t("auth.grade")} value={profile.grade} onChange={(value) => updateProfile("grade", value)} options={gradeOptions} />
                      <SettingsSelect label={t("auth.englishLevel")} value={profile.englishLevel} onChange={(value) => updateProfile("englishLevel", value)} options={englishLevels} />
                    </>
                  )}

                  {profile.role === "tutor" && (
                    <>
                      <SettingsField label={t("auth.school")} value={profile.school} onChange={(value) => updateProfile("school", value)} />
                      <SettingsSelect label={t("auth.grade")} value={profile.grade} onChange={(value) => updateProfile("grade", value)} options={gradeOptions} />
                      <GradesToTutorMultiSelect
                        label={t("auth.studentGradeToTutor")}
                        placeholder={t("auth.selectTargetGrade")}
                        value={profile.gradesToTutor}
                        onChange={(value) => updateProfile("gradesToTutor", value)}
                      />
                      <SettingsField label={t("auth.classLink")} value={profile.classLink} onChange={(value) => updateProfile("classLink", value)} />
                      <SettingsField label={t("auth.classPassword")} value={profile.meetingPassword} onChange={(value) => updateProfile("meetingPassword", value)} />
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
                      onClick={handleDeleteAccount}
                      className="rounded-full border border-destructive px-7 py-3 text-sm text-destructive transition-colors hover:bg-destructive/10"
                    >
                      {t("settings.delete")}
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
                {message && <p className="text-emerald-600">{message}</p>}
              </div>
            </div>
          </section>
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

function normalizeExternalUrl(url: string) {
  const trimmed = url.trim();
  if (/^[a-z][a-z\d+\-.]*:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
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
      await supabase
        .from("classes")
        .update({ [attendee === "student" ? "student_attended" : "teacher_attended"]: true })
        .eq("lesson_id", cls.id);
    }
  }

  if (cls.classLink) {
    window.open(normalizeExternalUrl(cls.classLink), "_blank", "noopener,noreferrer");
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
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-5 shadow-2xl sm:p-6">
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

      const { data: baseProfile, error: baseError } = await supabase
        .from("profiles")
        .select("name, email, wechat_id")
        .eq("uid", person.uid)
        .maybeSingle();

      if (baseError || !baseProfile) {
        if (!cancelled) {
          setError(baseError?.message || t("dashboard.profileLoadError"));
          setLoading(false);
        }
        return;
      }

      const profileTable = person.role === "student" ? "student_profiles" : "tutor_profiles";
      const { data: roleProfile, error: roleError } = await supabase
        .from(profileTable)
        .select("*")
        .eq("uid", person.uid)
        .maybeSingle();

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
          : [
              "uid",
              "how_found_out",
              "sat_700",
              "sat_730",
              "sat_800",
              "sat_830",
              "sat_900",
              "sat_930",
              "sat_1000",
              "sat_1030",
              "sat_1100",
              "sat_1130",
              "sun_700",
              "sun_730",
              "sun_800",
              "sun_830",
              "sun_900",
              "sun_930",
              "sun_1000",
              "sun_1030",
              "sun_1100",
              "sun_1130",
            ]
      );

      const roleDetails = Object.entries(roleProfile ?? {})
        .filter(([key, value]) => !hiddenFields.has(key) && value !== null && value !== "")
        .map(([key, value]) => ({
          label: labelFromColumn(key),
          value: key === "country" ? countryLabelForValue(String(value), lang) : String(value),
        }));

      if (!cancelled) {
        setDetails([
          { label: t("common.name"), value: baseProfile.name },
          { label: t("auth.email"), value: baseProfile.email },
          { label: t("auth.wechatId"), value: baseProfile.wechat_id },
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
            <div className="divide-y divide-border border-y border-border">
              {details.map((detail) => (
                <div key={detail.label} className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4">
                  <p className="text-xs text-muted-foreground">{detail.label}</p>
                  <p className="break-words text-sm text-card-foreground">{detail.value}</p>
                </div>
              ))}
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
  onCancelClass?: (cls: { id: string | number; recurringLessonId?: string | null }) => void;
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
        {cls.descriptionLines && cls.descriptionLines.length > 0 && (
          <div className="grid gap-1 text-xs leading-relaxed text-muted-foreground">
            {cls.descriptionLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        )}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CalendarDays size={12} />
            {cls.date}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {cls.time}
          </span>
        </div>
        {cls.meetingPassword && (
          <p className="text-xs text-muted-foreground">
            {t("dashboard.meetingPassword", { password: cls.meetingPassword })}
          </p>
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
            {attendee === "student" && onCancelClass && (
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
}: {
  user: typeof STUDENT;
  onMenuClick: () => void;
  onUserUpdated: (user: StoredUser) => void;
}) {
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { t } = useLanguage();

  async function handleSignOut() {
    await supabase.auth.signOut();
    clearStoredAuthState();
    router.replace("/");
  }

  return (
    <>
    <header className="h-16 bg-card border-b border-border flex items-center px-4 sm:px-6 gap-3 sm:gap-4 shrink-0 z-10">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-card-foreground md:hidden"
        aria-label={t("common.openNavigation")}
      >
        <Menu size={18} />
      </button>

      {/* Logo */}
      <div className="flex items-center gap-2 mr-2">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <BookOpen size={16} className="text-primary-foreground" />
        </div>
        <span className="text-card-foreground hidden sm:block">TutorFlow</span>
      </div>

      <div className="flex-1" />

      <LanguageSelect />

      {/* Profile dropdown */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-accent transition-colors cursor-pointer outline-none border border-transparent hover:border-border">
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
      onOpenChange={setSettingsOpen}
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
  scheduleHref,
  recordHref,
  trainingHref,
  volunteerAwardHref,
  studentMaterialsHref,
  manageMediaHref,
  communicationsHref,
  open,
  onClose,
}: {
  active: string;
  dashboardHref: string;
  scheduleHref?: string | null;
  recordHref?: string;
  trainingHref?: string;
  volunteerAwardHref?: string;
  studentMaterialsHref?: string;
  manageMediaHref?: string;
  communicationsHref?: string;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const items = [
    { id: "dashboard", href: dashboardHref, icon: LayoutDashboard, label: t("common.dashboard") },
    ...(scheduleHref
      ? [{ id: "schedule", href: scheduleHref, icon: CalendarDays, label: t("common.schedule") }]
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
            <span className="text-card-foreground">TutorFlow</span>
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

    const { data: completedAssignment, error: completeError } = await supabase
      .from("assignments")
      .update({ complete: true })
      .eq("assignment_id", assignmentId)
      .eq("student_uid", studentUid)
      .select("assignment_id")
      .maybeSingle();

    if (completeError || !completedAssignment) {
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
                  <p className="text-xs text-muted-foreground">{evaluation.student} · {evaluation.date} · {evaluation.time}</p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">{t("dashboard.readyToComplete")}</p>
                <Link
                  href={`/evaluations/${evaluation.id}`}
                  className="shrink-0 flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 transition-colors"
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
  onCancelClass?: (cls: { id: string | number; recurringLessonId?: string | null }) => void;
}) {
  const { t } = useLanguage();
  const [profilePerson, setProfilePerson] = useState<{ uid: string; role: "student" | "tutor"; name: string } | null>(null);
  const displayPersonName = cls.displayPersonName ?? cls.teacher;
  return (
    <>
    <div className="bg-gradient-to-br from-primary/10 via-accent to-secondary border border-primary/20 rounded-2xl p-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
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
          </div>
          {cls.meetingPassword && (
            <p className="mt-2 text-xs text-muted-foreground">{t("dashboard.meetingPassword", { password: cls.meetingPassword })}</p>
          )}
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
      <div className="grid w-full shrink-0 gap-2 sm:w-auto">
        <button
          type="button"
          onClick={() => void handleJoinClass(cls, attendee)}
          disabled={!cls.classLink}
          className="w-full bg-primary text-primary-foreground px-6 py-3 rounded-xl text-sm hover:bg-primary/90 transition-colors cursor-pointer shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("dashboard.joinSession")}
        </button>
        {attendee === "student" && onCancelClass && (
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
  loading = false,
  useEvaluationPage = false,
  attendee = "student",
  onCancelClass,
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
  loading?: boolean;
  useEvaluationPage?: boolean;
  attendee?: "student" | "teacher";
  onCancelClass?: (cls: { id: string | number; recurringLessonId?: string | null }) => void;
}) {
  const { t } = useLanguage();
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);
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

  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4">
      <h3 className="text-card-foreground">{t("dashboard.classes")}</h3>
      <Tabs.Root defaultValue="scheduled">
        <Tabs.List className="mb-4 flex w-full gap-1 rounded-xl bg-muted p-1 sm:w-fit">
          {[
            { value: "scheduled", label: t("dashboard.upcoming") },
            { value: "completed", label: t("dashboard.completed") },
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
      </Tabs.Root>
    </div>
  );
}

// ─── DASHBOARD PAGE ───────────────────────────────────────────────────────────

export function StudentDashboardPage({ lang }: { lang: string }) {
  const { t } = useLanguage();
  const [studentData, setStudentData] = useState<StudentDashboardData>(emptyStudentDashboardData);
  const [storedUser, setStoredUser] = useState<StoredUser | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{ id: string | number; recurringLessonId?: string | null } | null>(null);
  const [cancelError, setCancelError] = useState("");
  const [cancelMessage, setCancelMessage] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const studentName = storedUser?.name || t("common.student");

  async function cancelOneClass(target: { id: string | number }) {
    const { error } = await supabase
      .from("classes")
      .update({ status: "cancelled" })
      .eq("lesson_id", target.id);

    if (error) throw error;

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
      const { error: deleteClassesError } = await supabase
        .from("classes")
        .delete()
        .eq("recurring_lesson_id", cancelTarget.recurringLessonId);

      if (deleteClassesError) throw deleteClassesError;

      const { error: deleteRecurringError } = await supabase
        .from("recurring_classes")
        .delete()
        .eq("lesson_id", cancelTarget.recurringLessonId);

      if (deleteRecurringError) throw deleteRecurringError;

      setStudentData((current) => ({
        ...current,
        upcomingClasses: current.upcomingClasses.filter((cls) => cls.recurringLessonId !== cancelTarget.recurringLessonId),
      }));
      setCancelMessage(t("dashboard.classCancelled"));
      setCancelTarget(null);
    } catch (error) {
      setCancelError(error instanceof Error ? error.message : t("dashboard.cancelClassError"));
    } finally {
      setCancelling(false);
    }
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

      const { data: classRows, error: classesError } = await supabase
        .from("classes")
        .select("lesson_id, student_uid, teacher_uid, time, duration, evaluation_completed, student_attended, teacher_attended, student_wants_to_share, recurring_lesson_id, status")
        .eq("student_uid", studentUid)
        .or("status.is.null,status.neq.cancelled")
        .order("time", { ascending: true });

      if (classesError) {
        if (!cancelled) {
          setStudentData({ ...emptyStudentDashboardData, loading: false, error: classesError.message });
        }
        return;
      }

      const classes = (classRows ?? []) as ClassRow[];
      const lessonIds = classes.map((cls) => cls.lesson_id);
      const teacherUids = Array.from(new Set(classes.map((cls) => cls.teacher_uid)));
      const teacherNames = new Map<string, string>();
      const tutorDetails = new Map<string, { classLink: string; meetingPassword: string }>();
      const evaluations = new Map<string, EvaluationRow>();

      if (teacherUids.length > 0) {
        const { data: teacherProfiles, error: teacherError } = await supabase
          .from("profiles")
          .select("uid, name")
          .in("uid", teacherUids);

        if (teacherError) {
          if (!cancelled) {
            setStudentData({ ...emptyStudentDashboardData, loading: false, error: teacherError.message });
          }
          return;
        }

        teacherProfiles?.forEach((teacher) => {
          teacherNames.set(teacher.uid, teacher.name);
        });

        const { data: tutorRows, error: tutorError } = await supabase
          .from("tutor_profiles")
          .select("uid, class_link, meeting_password")
          .in("uid", teacherUids);

        if (tutorError) {
          if (!cancelled) {
            setStudentData({ ...emptyStudentDashboardData, loading: false, error: tutorError.message });
          }
          return;
        }

        ((tutorRows ?? []) as TutorDetailsRow[]).forEach((tutor) => {
          tutorDetails.set(tutor.uid, {
            classLink: tutor.class_link,
            meetingPassword: tutor.meeting_password,
          });
        });
      }

      if (lessonIds.length > 0) {
        const { data: evaluationRows, error: evaluationsError } = await supabase
          .from("evaluations")
          .select("evaluation_id, lesson_id, feedback, stars, created_at")
          .in("lesson_id", lessonIds)
          .order("created_at", { ascending: false });

        if (evaluationsError) {
          if (!cancelled) {
            setStudentData({ ...emptyStudentDashboardData, loading: false, error: evaluationsError.message });
          }
          return;
        }

        ((evaluationRows ?? []) as EvaluationRow[]).forEach((evaluation) => {
          if (!evaluations.has(evaluation.lesson_id)) {
            evaluations.set(evaluation.lesson_id, evaluation);
          }
        });
      }

      const today = new Date();
      const { data: assignmentRows, error: assignmentsError } = await supabase
        .from("assignments")
        .select("assignment_id, student_uid, teacher_uid, name, description, due_date, complete")
        .eq("student_uid", studentUid)
        .eq("complete", false)
        .order("due_date", { ascending: true });

      if (assignmentsError) {
        if (!cancelled) {
          setStudentData({ ...emptyStudentDashboardData, loading: false, error: assignmentsError.message });
        }
        return;
      }

      const studentClassLabels = {
        tutor: t("common.tutor"),
        chineseClass: t("dashboard.chineseClass"),
        myNote: (value: string) => t("dashboard.myNote", { value }),
        meetingPassword: (value: string) => t("dashboard.meetingPassword", { password: value }),
        none: t("common.none"),
      };
      const uiClasses = classes.map((cls) => toStudentUIClass(cls, teacherNames, tutorDetails, evaluations, lang, studentClassLabels));
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
      const assignments = ((assignmentRows ?? []) as AssignmentRow[]).map((assignment) => {
        const deadline = aoeDeadlineInstant(assignment.due_date);
        const msUntilDue = deadline.getTime() - today.getTime();
        const overdue = msUntilDue < 0;
        const dueSoon = !overdue && msUntilDue <= 48 * 60 * 60 * 1000;
        const status: UIAssignment["status"] = overdue ? "overdue" : dueSoon ? "dueSoon" : "assigned";

        return {
          id: assignment.assignment_id,
          name: assignment.name,
          description: assignment.description,
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
          feedback,
          assignments,
          upcomingClasses: uiClasses.filter((cls) => cls.startsAt > today).sort(byStartTime),
          completedClasses: uiClasses.filter((cls) => cls.endsAt < today).sort(byEndTimeNearestCompleted),
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
        loading={studentData.loading}
        onCancelClass={(cls) => {
          setCancelMessage("");
          setCancelError("");
          setCancelTarget(cls);
        }}
      />
      <Dialog.Root open={cancelTarget !== null} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-5 shadow-xl">
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
  const [currentTutorUid, setCurrentTutorUid] = useState("");
  const tutorName = storedUser?.name || t("common.tutor");

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
      if (!cancelled) {
        setCurrentTutorUid(tutorUid ?? "");
      }

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

      const { data: tutorProfile, error: tutorProfileError } = await supabase
        .from("profiles")
        .select("uid, role, name, email")
        .eq("uid", tutorUid)
        .maybeSingle();

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

      const { data: allClassRowsData, error: allClassRowsError } = await supabase
        .from("classes")
        .select("*");
      console.log("All classes query result", {
        error: allClassRowsError,
        rows: allClassRowsData ?? [],
      });

      const { data: tutorClassRowsData, error: tutorClassesError } = await supabase
        .from("classes")
        .select(classColumns)
        .eq("teacher_uid", tutorUid)
        .or("status.is.null,status.neq.cancelled")
        .order("time", { ascending: true });

      if (tutorClassesError) {
        if (!cancelled) {
          setDashboardData({
            ...emptyTutorDashboardData,
            loading: false,
            error: tutorClassesError.message,
          });
        }
        return;
      }

      const tutorClassRows = (tutorClassRowsData ?? []) as ClassRow[];
      const completedClassRows = tutorClassRows.filter((cls) => getClassEnd(cls) < now);
      console.log("Tutor completed classes query result", {
        tutorUid,
        now: now.toISOString(),
        completedClassRows,
      });
      const upcomingClassRows = tutorClassRows.filter((cls) => getClassEnd(cls) >= now);
      const classes = [...completedClassRows, ...upcomingClassRows];
      const studentUids = Array.from(new Set(classes.map((cls) => cls.student_uid)));
      const completedStudentUids = Array.from(new Set(completedClassRows.map((cls) => cls.student_uid)));
      const studentProfiles = new Map<string, BasicProfile>();

      if (studentUids.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("uid, name, email, wechat_id")
          .in("uid", studentUids);

        if (profilesError) {
          if (!cancelled) {
            setDashboardData({
              ...emptyTutorDashboardData,
              loading: false,
              error: profilesError.message,
            });
          }
          return;
        }

        ((profiles ?? []) as BasicProfile[]).forEach((profile) => {
          studentProfiles.set(profile.uid, profile);
        });
      }

      const { data: volunteerRecords, error: volunteerRecordsError } = await supabase
        .from("volunteer_records")
        .select("minutes")
        .eq("tutor_uid", tutorUid);

      if (volunteerRecordsError) {
        if (!cancelled) {
          setDashboardData({
            ...emptyTutorDashboardData,
            loading: false,
            error: volunteerRecordsError.message,
          });
        }
        return;
      }

      const { data: tutorDetails } = await supabase
        .from("tutor_profiles")
        .select("class_link, meeting_password")
        .eq("uid", tutorUid)
        .maybeSingle();
      const meetingDetails = tutorDetails
        ? {
            classLink: tutorDetails.class_link,
            meetingPassword: tutorDetails.meeting_password,
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
          stats: {
            totalClasses: completedClassRows.length,
            studentsTaught: completedStudentUids.length,
            totalMinutes: totalVolunteerMinutes,
          },
          pendingEvaluations: completedUiClasses
            .filter((cls) => !cls.evaluationCompleted)
            .sort(byEndTimeNearestCompleted),
          upcomingClasses: upcomingUiClasses.sort(byStartTime),
          completedClasses: completedUiClasses.sort(byEndTimeNearestCompleted),
        });
      }
    }

    loadTutorDashboard();

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
            {t("dashboard.hello", { name: tutorName.split(" ")[0] })}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("dashboard.tutorOverview")}
          </p>
          {currentTutorUid && (
            <p className="mt-1 text-xs text-muted-foreground">
              {t("common.tutorUid", { uid: currentTutorUid })}
            </p>
          )}
        </div>
      </div>

      {dashboardData.error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {dashboardData.error}
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
        loading={dashboardData.loading}
        useEvaluationPage
        attendee="teacher"
      />
    </div>
  );
}

// ─── ROOT SHELL ──────────────────────────────────────────────────────────────

function LoadingFallback() {
  const { t } = useLanguage();
  return <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">{t("common.loading")}</div>;
}

export function AppShell({
  activePage,
  children,
  user = STUDENT,
  dashboardHref = "/student-dashboard",
  scheduleHref = "/student-schedule",
  recordHref,
  trainingHref,
  volunteerAwardHref,
  studentMaterialsHref,
  manageMediaHref,
  communicationsHref,
  requiredRole,
}: {
  activePage: "dashboard" | "schedule" | "record" | "training" | "awards" | "studentMaterials" | "manageMedia" | "communications";
  children: (lang: string) => ReactNode;
  user?: typeof STUDENT;
  dashboardHref?: string;
  scheduleHref?: string | null;
  recordHref?: string;
  trainingHref?: string;
  volunteerAwardHref?: string;
  studentMaterialsHref?: string;
  manageMediaHref?: string;
  communicationsHref?: string;
  requiredRole?: AccountRole;
}) {
  return (
    <LanguageProvider>
      <Suspense fallback={<LoadingFallback />}>
        <AppShellContent
          activePage={activePage}
          user={user}
          dashboardHref={dashboardHref}
          scheduleHref={scheduleHref}
          recordHref={recordHref}
          trainingHref={trainingHref}
          volunteerAwardHref={volunteerAwardHref}
          studentMaterialsHref={studentMaterialsHref}
          manageMediaHref={manageMediaHref}
          communicationsHref={communicationsHref}
          requiredRole={requiredRole}
        >
          {children}
        </AppShellContent>
      </Suspense>
    </LanguageProvider>
  );
}

function AppShellContent({
  activePage,
  children,
  user,
  dashboardHref,
  scheduleHref,
  recordHref,
  trainingHref,
  volunteerAwardHref,
  studentMaterialsHref,
  manageMediaHref,
  communicationsHref,
  requiredRole,
}: {
  activePage: "dashboard" | "schedule" | "record" | "training" | "awards" | "studentMaterials" | "manageMedia" | "communications";
  children: (lang: string) => ReactNode;
  user: typeof STUDENT;
  dashboardHref: string;
  scheduleHref?: string | null;
  recordHref?: string;
  trainingHref?: string;
  volunteerAwardHref?: string;
  studentMaterialsHref?: string;
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

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("uid, role, name, email")
        .eq("uid", authData.user.id)
        .maybeSingle();

      if (profileError || !profile) {
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

      if (!cancelled) {
        setStoredUser(currentUser);
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

  return (
    <div className="flex min-h-screen flex-col bg-background md:h-screen md:overflow-hidden">
      <TopNav
        user={navUser}
        onMenuClick={() => setSidebarOpen(true)}
        onUserUpdated={setStoredUser}
      />
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        <Sidebar
          active={activePage}
          dashboardHref={dashboardHref}
          scheduleHref={scheduleHref}
          recordHref={recordHref}
          trainingHref={trainingHref}
          volunteerAwardHref={volunteerAwardHref}
          studentMaterialsHref={studentMaterialsHref}
          manageMediaHref={manageMediaHref}
          communicationsHref={communicationsHref}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main key={pathname} className={`min-w-0 flex-1 p-4 sm:p-6 ${activePage === "schedule" ? "flex flex-col overflow-y-auto md:overflow-hidden" : "overflow-y-auto"}`}>
          {children(lang)}
        </main>
      </div>
    </div>
  );
}

export function StudentScheduleApp() {
  return (
    <AppShell activePage="schedule" studentMaterialsHref="/student-materials" communicationsHref="/student-communications" requiredRole="student">
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
    <AppShell activePage="studentMaterials" studentMaterialsHref="/student-materials" communicationsHref="/student-communications" requiredRole="student">
      {() => <MediaListPage category="student_material" titleKey="media.studentMaterialTitle" helpKey="media.studentMaterialHelp" />}
    </AppShell>
  );
}

export function StudentCommunicationsApp() {
  return (
    <AppShell activePage="communications" studentMaterialsHref="/student-materials" communicationsHref="/student-communications" requiredRole="student">
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
    <AppShell activePage="dashboard" user={ADMIN} dashboardHref="/admin-dashboard" scheduleHref={null} manageMediaHref="/admin-media" communicationsHref="/admin-communications" requiredRole="admin">
      {(lang) => <AdminDashboardPage lang={lang} />}
    </AppShell>
  );
}

export function ManageMediaApp() {
  return (
    <AppShell activePage="manageMedia" user={ADMIN} dashboardHref="/admin-dashboard" scheduleHref={null} manageMediaHref="/admin-media" communicationsHref="/admin-communications" requiredRole="admin">
      {() => <ManageMediaPage />}
    </AppShell>
  );
}

export function AdminCommunicationsApp() {
  return (
    <AppShell activePage="communications" user={ADMIN} dashboardHref="/admin-dashboard" scheduleHref={null} manageMediaHref="/admin-media" communicationsHref="/admin-communications" requiredRole="admin">
      {() => <CommunicationsPage viewerRole="admin" />}
    </AppShell>
  );
}

export default function App() {
  return (
    <AppShell activePage="dashboard" studentMaterialsHref="/student-materials" communicationsHref="/student-communications" requiredRole="student">
      {(lang) => <StudentDashboardPage lang={lang} />}
    </AppShell>
  );
}

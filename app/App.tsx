"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StudentSchedulePage } from "./components/StudentSchedulePage";
import { TutorSchedulePage } from "./components/TutorSchedulePage";
import { VolunteerRecordPage } from "./components/VolunteerRecordPage";
import { AdminDashboardPage } from "./components/AdminDashboardPage";
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

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "zh", label: "中文" },
];

const storedUserKey = "tutorflow-user";
const provinces = ["Ontario", "British Columbia", "Alberta", "Quebec", "California", "New York"];
const cities = ["Toronto", "Vancouver", "Calgary", "Montreal", "Los Angeles", "New York City"];
const gradeOptions = ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];
const englishLevels = ["Beginner", "Primary", "Intermediate"];
const tutorStudentGrades = ["Elementary school", "Middle school", "High school"];

type StoredUser = {
  uid: string;
  role: string;
  name: string;
  email: string;
};
type SettingsProfile = {
  uid: string;
  role: "student" | "tutor" | "admin";
  name: string;
  email: string;
  wechatId: string;
  province: string;
  city: string;
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
  lesson_date: string;
  start_time: string;
  end_time: string;
  evaluation_completed: boolean;
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
  dueSoon: boolean;
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
  teacher: string;
  date: string;
  time: string;
  startsAt: Date;
  endsAt: Date;
  minutes: number;
  evaluationCompleted: boolean;
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

function getClassDateTime(date: string, time: string) {
  return new Date(`${date}T${time}`);
}

function formatClassDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDueDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatClassTime(time: string) {
  return new Date(`1970-01-01T${time}`).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getClassMinutes(cls: ClassRow) {
  const startsAt = getClassDateTime(cls.lesson_date, cls.start_time);
  const endsAt = getClassDateTime(cls.lesson_date, cls.end_time);
  return Math.max(0, Math.round((endsAt.getTime() - startsAt.getTime()) / 60000));
}

function toUIClass(
  cls: ClassRow,
  studentNames: Map<string, string>,
  teacherName: string,
  meetingDetails?: { classLink: string; meetingPassword: string }
): UIClass {
  const startsAt = getClassDateTime(cls.lesson_date, cls.start_time);
  const endsAt = getClassDateTime(cls.lesson_date, cls.end_time);
  const student = studentNames.get(cls.student_uid) ?? cls.student_uid;

  return {
    id: cls.lesson_id,
    name: `Class with ${student}`,
    student,
    teacher: teacherName,
    date: formatClassDate(cls.lesson_date),
    time: `${formatClassTime(cls.start_time)} - ${formatClassTime(cls.end_time)}`,
    startsAt,
    endsAt,
    minutes: getClassMinutes(cls),
    evaluationCompleted: cls.evaluation_completed,
    classLink: meetingDetails?.classLink,
    meetingPassword: meetingDetails?.meetingPassword,
    feedback: cls.evaluation_completed ? LAST_FEEDBACK : undefined,
  };
}

function toStudentUIClass(
  cls: ClassRow,
  teacherNames: Map<string, string>,
  tutorDetails: Map<string, { classLink: string; meetingPassword: string }>,
  evaluations: Map<string, EvaluationRow>
): UIClass {
  const startsAt = getClassDateTime(cls.lesson_date, cls.start_time);
  const endsAt = getClassDateTime(cls.lesson_date, cls.end_time);
  const teacher = teacherNames.get(cls.teacher_uid) ?? cls.teacher_uid;
  const details = tutorDetails.get(cls.teacher_uid);
  const evaluation = evaluations.get(cls.lesson_id);

  return {
    id: cls.lesson_id,
    name: "Chinese Class",
    student: "",
    teacher,
    date: formatClassDate(cls.lesson_date),
    time: `${formatClassTime(cls.start_time)} - ${formatClassTime(cls.end_time)}`,
    startsAt,
    endsAt,
    minutes: getClassMinutes(cls),
    evaluationCompleted: cls.evaluation_completed,
    classLink: details?.classLink,
    meetingPassword: details?.meetingPassword,
    feedback: evaluation
      ? {
          teacher,
          stars: evaluation.stars,
          subject: "",
          text: evaluation.feedback,
          date: formatClassDate(evaluation.created_at.slice(0, 10)),
        }
      : undefined,
  };
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
  return (
    <label className="block">
      <span className="text-sm text-card-foreground">{label}</span>
      <Select.Root value={value} onValueChange={onChange}>
        <Select.Trigger className="mt-2 flex h-11 w-full items-center justify-between rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition data-[placeholder]:text-muted-foreground focus:border-primary/40 focus:bg-card">
          <Select.Value placeholder={`Select ${label.toLowerCase()}`} />
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
                  <Select.ItemText>{option}</Select.ItemText>
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fallbackUser: typeof STUDENT;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"general" | "account">("general");
  const [profile, setProfile] = useState<SettingsProfile>({
    uid: "",
    role: "student",
    name: fallbackUser.name,
    email: fallbackUser.email,
    wechatId: "",
    province: "",
    city: "",
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
          setError(authError?.message ?? "No signed-in user found.");
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
        province: "",
        city: "",
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
          .select("province, city, grade, english_level")
          .eq("uid", uid)
          .single();

        if (studentError) {
          if (!cancelled) setError(studentError.message);
        } else {
          nextProfile.province = data.province;
          nextProfile.city = data.city;
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
          nextProfile.gradesToTutor = data.grades_to_tutor;
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
          province: profile.province,
          city: profile.city,
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

    sessionStorage.setItem(storedUserKey, JSON.stringify({
      uid: profile.uid,
      role: profile.role,
      name: profile.name,
      email: profile.email,
    }));
    setMessage("Settings saved.");
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

    setMessage("Password reset email sent.");
  }

  async function handleDeleteAccount() {
    setMessage("");
    setError("");
    const confirmed = window.confirm("Delete this account? This cannot be undone.");
    if (!confirmed) return;

    const { error: rpcError } = await supabase.rpc("delete_current_user");
    if (rpcError) {
      setError("Account deletion requires a Supabase RPC named delete_current_user. " + rpcError.message);
      return;
    }

    await supabase.auth.signOut();
    sessionStorage.removeItem(storedUserKey);
    onOpenChange(false);
    router.push("/");
  }

  const sidebarItems = [
    { id: "general" as const, label: "General", icon: Settings },
    { id: "account" as const, label: "Account", icon: User },
  ];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex h-[min(42rem,calc(100vh-2rem))] w-[min(64rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <aside className="flex w-64 shrink-0 flex-col gap-2 border-r border-border bg-sidebar p-4">
            <Dialog.Close asChild>
              <button className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-card-foreground">
                <X size={22} />
              </button>
            </Dialog.Close>
            {sidebarItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition-colors ${
                  tab === id ? "bg-accent text-card-foreground" : "text-muted-foreground hover:bg-accent/70 hover:text-card-foreground"
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </aside>

          <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <div className="border-b border-border px-8 py-6">
              <Dialog.Title className="text-3xl text-card-foreground">
                {tab === "general" ? "General" : "Account"}
              </Dialog.Title>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-6">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading settings...</p>
              ) : tab === "general" ? (
                <div className="grid gap-5 md:grid-cols-2">
                  <SettingsField label="Name" value={profile.name} onChange={(value) => updateProfile("name", value)} />
                  <SettingsField label="Email" type="email" value={profile.email} onChange={(value) => updateProfile("email", value)} />
                  <SettingsField label="WeChat ID" value={profile.wechatId} onChange={(value) => updateProfile("wechatId", value)} />

                  {profile.role === "student" && (
                    <>
                      <SettingsSelect label="Province" value={profile.province} onChange={(value) => updateProfile("province", value)} options={provinces} />
                      <SettingsSelect label="City" value={profile.city} onChange={(value) => updateProfile("city", value)} options={cities} />
                      <SettingsSelect label="Grade" value={profile.grade} onChange={(value) => updateProfile("grade", value)} options={gradeOptions} />
                      <SettingsSelect label="English Level" value={profile.englishLevel} onChange={(value) => updateProfile("englishLevel", value)} options={englishLevels} />
                    </>
                  )}

                  {profile.role === "tutor" && (
                    <>
                      <SettingsField label="School" value={profile.school} onChange={(value) => updateProfile("school", value)} />
                      <SettingsSelect label="Grade" value={profile.grade} onChange={(value) => updateProfile("grade", value)} options={gradeOptions} />
                      <SettingsSelect label="Student Grade to Tutor" value={profile.gradesToTutor} onChange={(value) => updateProfile("gradesToTutor", value)} options={tutorStudentGrades} />
                      <SettingsField label="Class Link" value={profile.classLink} onChange={(value) => updateProfile("classLink", value)} />
                      <SettingsField label="Class Password" value={profile.meetingPassword} onChange={(value) => updateProfile("meetingPassword", value)} />
                    </>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-border border-y border-border">
                  <div className="flex items-center justify-between gap-4 py-7">
                    <div>
                      <p className="text-lg text-card-foreground">Reset password</p>
                      <p className="mt-1 text-sm text-muted-foreground">Send a password reset email to {profile.email}.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetPassword}
                      className="rounded-full border border-primary px-7 py-3 text-sm text-primary transition-colors hover:bg-primary/10"
                    >
                      Reset
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-7">
                    <p className="text-lg text-card-foreground">Delete account</p>
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      className="rounded-full border border-destructive px-7 py-3 text-sm text-destructive transition-colors hover:bg-destructive/10"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 border-t border-border px-8 py-5">
              {tab === "general" && (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || loading}
                  className="rounded-xl bg-primary px-5 py-2.5 text-sm text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
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

function FeedbackDialog({
  open,
  onClose,
  feedback,
}: {
  open: boolean;
  onClose: () => void;
  feedback: (typeof COMPLETED_CLASSES)[0]["feedback"] | null;
}) {
  if (!feedback) return null;
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-5 shadow-2xl sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-card-foreground">Teacher Feedback</Dialog.Title>
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

function ClassCard({
  cls,
  completed,
  feedbackLabel = "View Teacher Feedback",
  feedbackPendingLabel = "Teacher feedback pending",
}: {
  cls: {
    id: string | number;
    name: string;
    teacher: string;
    date: string;
    time: string;
    evaluationCompleted?: boolean;
    classLink?: string;
    meetingPassword?: string;
    feedback?: typeof LAST_FEEDBACK;
  };
  completed: boolean;
  feedbackLabel?: string;
  feedbackPendingLabel?: string;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
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
          <p className="text-card-foreground text-sm leading-snug">{cls.name}</p>
          {completed && (
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
          )}
        </div>
        <div className="flex items-center gap-2.5">
          <BlankAvatar size={32} />
          <div>
            <p className="text-sm text-card-foreground">{cls.teacher}</p>
          </div>
        </div>
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
            {`Meeting password: ${cls.meetingPassword}`}
          </p>
        )}
        {completed && (cls.evaluationCompleted || feedbackPendingLabel !== "Teacher feedback pending") && (
          <button
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer mt-1 w-fit"
          >
            <MessageSquare size={12} />
            {actionLabel}
            <ChevronRight size={12} />
          </button>
        )}
        {completed && !cls.evaluationCompleted && feedbackPendingLabel === "Teacher feedback pending" && (
          <p className="mt-1 text-xs text-muted-foreground">{actionLabel}</p>
        )}
        {!completed && (
          <button
            type="button"
            onClick={() => cls.classLink && window.open(cls.classLink, "_blank", "noopener,noreferrer")}
            disabled={!cls.classLink}
            className="mt-1 w-full text-center text-xs text-primary border border-primary/30 rounded-lg py-1.5 hover:bg-accent transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            Join Session
          </button>
        )}
      </div>
      {completed && cls.feedback && (
        <FeedbackDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          feedback={cls.feedback}
        />
      )}
    </>
  );
}

// ─── TOP NAV ─────────────────────────────────────────────────────────────────

function TopNav({
  lang,
  setLang,
  user,
  onMenuClick,
}: {
  lang: string;
  setLang: (l: string) => void;
  user: typeof STUDENT;
  onMenuClick: () => void;
}) {
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);

  async function handleSignOut() {
    await supabase.auth.signOut();
    sessionStorage.removeItem(storedUserKey);
    router.push("/");
  }

  return (
    <>
    <header className="h-16 bg-card border-b border-border flex items-center px-4 sm:px-6 gap-3 sm:gap-4 shrink-0 z-10">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-card-foreground md:hidden"
        aria-label="Open navigation"
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

      {/* Language Select */}
      <Select.Root value={lang} onValueChange={setLang}>
        <Select.Trigger className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-card-foreground border border-border rounded-lg px-2.5 sm:px-3 py-1.5 bg-background hover:bg-accent transition-colors cursor-pointer outline-none">
          <Select.Value />
          <Select.Icon>
            <ChevronDown size={14} />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content className="bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden">
            <Select.Viewport className="p-1">
              {LANGUAGES.map((l) => (
                <Select.Item
                  key={l.code}
                  value={l.code}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-popover-foreground rounded-lg hover:bg-accent cursor-pointer outline-none data-[highlighted]:bg-accent"
                >
                  <Select.ItemText>{l.label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>

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
            <div className="mb-1 flex items-center gap-3 border-b border-border px-3 py-2">
              <BlankAvatar size={34} />
              <div className="min-w-0">
                <p className="text-sm text-popover-foreground">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <DropdownMenu.Item
              onSelect={() => setSettingsOpen(true)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-popover-foreground rounded-lg hover:bg-accent cursor-pointer outline-none"
            >
              <Settings size={14} className="text-muted-foreground" />
              {lang === "zh" ? "账户设置" : "Account Settings"}
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-1 h-px bg-border" />
            <DropdownMenu.Item
              onSelect={handleSignOut}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-destructive rounded-lg hover:bg-destructive/10 cursor-pointer outline-none"
            >
              <LogOut size={14} />
              {lang === "zh" ? "退出登录" : "Sign Out"}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </header>
    <AccountSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} fallbackUser={user} />
    </>
  );
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────

function Sidebar({
  active,
  lang,
  dashboardHref,
  scheduleHref,
  recordHref,
  open,
  onClose,
}: {
  active: string;
  lang: string;
  dashboardHref: string;
  scheduleHref?: string | null;
  recordHref?: string;
  open: boolean;
  onClose: () => void;
}) {
  const items = [
    { id: "dashboard", href: dashboardHref, icon: LayoutDashboard, label: lang === "zh" ? "仪表板" : "Dashboard" },
    ...(scheduleHref
      ? [{ id: "schedule", href: scheduleHref, icon: CalendarDays, label: lang === "zh" ? "课程表" : "Schedule" }]
      : []),
    ...(recordHref
      ? [{ id: "record", href: recordHref, icon: FileText, label: lang === "zh" ? "志愿记录" : "Volunteer Record" }]
      : []),
  ];
  return (
    <>
      <button
        type="button"
        aria-label="Close navigation"
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
            aria-label="Close navigation"
          >
            <X size={17} />
          </button>
        </div>
      {items.map(({ id, href, icon: Icon, label }) => (
        <Link
          key={id}
          href={href}
          onClick={onClose}
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
  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-card-foreground">{lang === "zh" ? "上次课程反馈" : "Last Class Feedback"}</h3>
        {feedback && <span className="text-xs text-muted-foreground">{feedback.date}</span>}
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border bg-background px-4 py-10 text-sm text-muted-foreground">
          {lang === "zh" ? "正在加载反馈..." : "Loading feedback..."}
        </div>
      ) : !feedback ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border bg-background px-4 py-10 text-sm text-muted-foreground">
          {lang === "zh" ? "暂无课程反馈" : "No teacher feedback yet."}
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
                {lang === "zh" ? "本次课程评分" : "Session rating"}
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
}: {
  lang: string;
  assignments: UIAssignment[];
  loading: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-card-foreground">{lang === "zh" ? "作业" : "Assignments"}</h3>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {assignments.length} {lang === "zh" ? "项" : "pending"}
        </span>
      </div>
      <div className="flex flex-col gap-3 flex-1">
        {loading ? (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border bg-background px-4 py-10 text-sm text-muted-foreground">
            {lang === "zh" ? "正在加载作业..." : "Loading assignments..."}
          </div>
        ) : assignments.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border bg-background px-4 py-10 text-sm text-muted-foreground">
            {lang === "zh" ? "暂无待完成作业" : "No upcoming assignments."}
          </div>
        ) : assignments.map((a) => (
          <div
            key={a.id}
            className={`flex flex-col gap-2.5 px-4 py-3.5 rounded-xl border ${
              a.dueSoon ? "border-amber-200 bg-amber-50" : "border-border bg-background"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-card-foreground">{a.name}</p>
              {a.dueSoon && (
                <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full shrink-0">
                  {lang === "zh" ? "紧急" : "Due soon"}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{a.description}</p>
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays size={11} />
              {a.due}
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
  const totalHours = data.stats.totalMinutes / 60;
  const stats = [
    {
      label: lang === "zh" ? "已授课程" : "Total classes taught",
      value: data.loading ? "..." : String(data.stats.totalClasses),
      icon: BookOpen,
      tone: "bg-violet-50",
      iconTone: "bg-primary text-primary-foreground",
    },
    {
      label: lang === "zh" ? "学生人数" : "Students taught",
      value: data.loading ? "..." : String(data.stats.studentsTaught),
      icon: Users,
      tone: "bg-emerald-50",
      iconTone: "bg-emerald-500 text-white",
    },
    {
      label: lang === "zh" ? "教学时长" : "Total hours spent",
      value: data.loading ? "..." : `${Number.isInteger(totalHours) ? totalHours : totalHours.toFixed(1)}h`,
      icon: Clock,
      tone: "bg-sky-50",
      iconTone: "bg-sky-500 text-white",
    },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4 h-full">
      <div>
        <h3 className="text-card-foreground">{lang === "zh" ? "教学统计" : "Teaching Stats"}</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          {lang === "zh" ? "你的教学概览。" : "A quick snapshot of your tutoring activity."}
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
  const [activeEvaluation, setActiveEvaluation] = useState<UIClass | null>(null);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");

  function closeDialog() {
    setActiveEvaluation(null);
    setRating(0);
    setFeedback("");
  }

  return (
    <>
      <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4 h-full">
        <div className="flex items-center justify-between">
          <h3 className="text-card-foreground">{lang === "zh" ? "待完成评价" : "Pending Evaluations"}</h3>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {evaluations.length} {lang === "zh" ? "项" : "pending"}
          </span>
        </div>
        <div className="flex flex-col gap-3 flex-1">
          {loading ? (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border bg-background px-4 py-10 text-sm text-muted-foreground">
              {lang === "zh" ? "正在加载..." : "Loading pending evaluations..."}
            </div>
          ) : evaluations.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border bg-background px-4 py-10 text-sm text-muted-foreground">
              {lang === "zh" ? "暂无待完成评价" : "Nothing pending right now."}
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
                <p className="text-xs text-muted-foreground">Ready to complete</p>
                <button
                  onClick={() => setActiveEvaluation(evaluation)}
                  className="shrink-0 flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <FileText size={12} />
                  {lang === "zh" ? "填写" : "Complete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog.Root open={activeEvaluation !== null} onOpenChange={(open) => !open && closeDialog()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-card-foreground">
                  {lang === "zh" ? "完成评价" : "Complete Evaluation"}
                </Dialog.Title>
	                {activeEvaluation && (
	                  <Dialog.Description className="mt-1 text-sm text-muted-foreground">
	                    {activeEvaluation.student} · {activeEvaluation.date} · {activeEvaluation.time}
	                  </Dialog.Description>
	                )}
              </div>
              <button
                onClick={closeDialog}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted"
              >
                <X size={16} />
              </button>
            </div>

            <form
              className="mt-5 flex flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                closeDialog();
              }}
            >
              <div>
                <p className="text-sm text-card-foreground">
                  {lang === "zh" ? "评分" : "Star rating"}
                </p>
                <div className="mt-2 flex gap-1">
                  {Array.from({ length: 5 }).map((_, index) => {
                    const value = index + 1;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRating(value)}
                        className="rounded-lg p-1 transition-colors hover:bg-accent"
                        aria-label={`${value} star${value === 1 ? "" : "s"}`}
                      >
                        <Star
                          size={28}
                          className={
                            value <= rating
                              ? "fill-amber-400 text-amber-400"
                              : "fill-gray-200 text-gray-200"
                          }
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="block">
                <span className="text-sm text-card-foreground">
                  {lang === "zh" ? "文字反馈" : "Text feedback"}
                </span>
                <textarea
                  required
                  value={feedback}
                  onChange={(event) => setFeedback(event.target.value)}
                  rows={5}
                  placeholder={
                    lang === "zh"
                      ? "写下学生本节课的表现、作业或下一步建议..."
                      : "Write feedback, lesson notes, homework, or next steps..."
                  }
                  className="mt-2 w-full resize-none rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-card-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/40 focus:bg-card"
                />
              </label>

              <button
                type="submit"
                disabled={rating === 0}
                className="w-full rounded-xl bg-primary px-5 py-3 text-sm text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-fit"
              >
                {lang === "zh" ? "提交评价" : "Submit Evaluation"}
              </button>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

// ─── UPCOMING CLASS HERO ──────────────────────────────────────────────────────

function UpcomingClassHero({
  cls,
  lang,
}: {
  cls: {
    name: string;
    teacher: string;
    date: string;
    time: string;
    classLink?: string;
    meetingPassword?: string;
  };
  lang: string;
}) {
  return (
    <div className="bg-gradient-to-br from-primary/10 via-accent to-secondary border border-primary/20 rounded-2xl p-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-primary bg-primary/10 px-2.5 py-1 rounded-full">
            {lang === "zh" ? "即将开始" : "Up next"}
          </span>
        </div>
        <div>
          <p className="text-card-foreground mb-1">{cls.name}</p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1.5"><CalendarDays size={14} />{cls.date}</span>
            <span className="flex items-center gap-1.5"><Clock size={14} />{cls.time}</span>
          </div>
          {cls.meetingPassword && (
            <p className="mt-2 text-xs text-muted-foreground">Meeting password: {cls.meetingPassword}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <BlankAvatar size={36} />
          <div>
            <p className="text-sm text-card-foreground">{cls.teacher}</p>
            <p className="text-xs text-muted-foreground">{lang === "zh" ? "您的老师" : "Your tutor"}</p>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => cls.classLink && window.open(cls.classLink, "_blank", "noopener,noreferrer")}
        disabled={!cls.classLink}
        className="w-full shrink-0 bg-primary text-primary-foreground px-6 py-3 rounded-xl text-sm hover:bg-primary/90 transition-colors cursor-pointer shadow-sm disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {lang === "zh" ? "加入课堂" : "Join Session"}
      </button>
    </div>
  );
}

// ─── CLASSES CARD ────────────────────────────────────────────────────────────

function ClassesCard({
  lang,
  feedbackLabel = "View Teacher Feedback",
  feedbackPendingLabel = "Teacher feedback pending",
  upcomingClasses = SCHEDULED_CLASSES,
  completedClasses = COMPLETED_CLASSES,
  loading = false,
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
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4">
      <h3 className="text-card-foreground">{lang === "zh" ? "课程" : "Classes"}</h3>
      <Tabs.Root defaultValue="scheduled">
        <Tabs.List className="flex gap-1 bg-muted p-1 rounded-xl w-fit mb-4">
          {[
            { value: "scheduled", label: lang === "zh" ? "即将到来" : "Upcoming" },
            { value: "completed", label: lang === "zh" ? "已完成" : "Completed" },
          ].map(({ value, label }) => (
            <Tabs.Trigger
              key={value}
              value={value}
              className="px-4 py-1.5 text-sm rounded-lg transition-all cursor-pointer text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-card-foreground data-[state=active]:shadow-sm"
            >
              {label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        <Tabs.Content value="scheduled">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <CalendarDays size={32} className="opacity-30" />
              <p className="text-sm">{lang === "zh" ? "正在加载课程..." : "Loading classes..."}</p>
            </div>
          ) : upcomingClasses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <CalendarDays size={32} className="opacity-30" />
              <p className="text-sm">{lang === "zh" ? "暂无即将到来的课程" : "No upcoming classes scheduled"}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {upcomingClasses.map((cls, index) =>
                index === 0 ? (
                  <UpcomingClassHero key={cls.id} cls={cls} lang={lang} />
                ) : (
                  <ClassCard key={cls.id} cls={cls} completed={false} />
                )
              )}
            </div>
          )}
        </Tabs.Content>
        <Tabs.Content value="completed">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <CheckCircle2 size={32} className="opacity-30" />
              <p className="text-sm">{lang === "zh" ? "正在加载课程..." : "Loading classes..."}</p>
            </div>
          ) : completedClasses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <CheckCircle2 size={32} className="opacity-30" />
              <p className="text-sm">{lang === "zh" ? "暂无已完成课程" : "No completed classes yet."}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {completedClasses.map((cls) => (
                <ClassCard key={cls.id} cls={cls} completed={true} feedbackLabel={feedbackLabel} feedbackPendingLabel={feedbackPendingLabel} />
              ))}
            </div>
          )}
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}

// ─── DASHBOARD PAGE ───────────────────────────────────────────────────────────

export function StudentDashboardPage({ lang }: { lang: string }) {
  const [studentData, setStudentData] = useState<StudentDashboardData>(emptyStudentDashboardData);
  const [storedUser, setStoredUser] = useState<StoredUser | null>(null);
  const studentName = storedUser?.name || STUDENT.name;

  useEffect(() => {
    let cancelled = false;

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
            error: "No student uid available.",
          });
        }
        return;
      }

      const { data: classRows, error: classesError } = await supabase
        .from("classes")
        .select("lesson_id, student_uid, teacher_uid, lesson_date, start_time, end_time, evaluation_completed")
        .eq("student_uid", studentUid)
        .order("lesson_date", { ascending: true })
        .order("start_time", { ascending: true });

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
      const todayDate = today.toISOString().slice(0, 10);
      const { data: assignmentRows, error: assignmentsError } = await supabase
        .from("assignments")
        .select("assignment_id, student_uid, teacher_uid, name, description, due_date")
        .eq("student_uid", studentUid)
        .gt("due_date", todayDate)
        .order("due_date", { ascending: true });

      if (assignmentsError) {
        if (!cancelled) {
          setStudentData({ ...emptyStudentDashboardData, loading: false, error: assignmentsError.message });
        }
        return;
      }

      const uiClasses = classes.map((cls) => toStudentUIClass(cls, teacherNames, tutorDetails, evaluations));
      const byStartTime = (a: UIClass, b: UIClass) => a.startsAt.getTime() - b.startsAt.getTime();
      const latestEvaluation = Array.from(evaluations.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];
      const latestClass = latestEvaluation
        ? classes.find((cls) => cls.lesson_id === latestEvaluation.lesson_id)
        : undefined;
      const feedback = latestEvaluation && latestClass
        ? {
            teacher: teacherNames.get(latestClass.teacher_uid) ?? latestClass.teacher_uid,
            text: latestEvaluation.feedback,
            stars: latestEvaluation.stars,
            date: formatClassDate(latestEvaluation.created_at.slice(0, 10)),
          }
        : null;
      const assignments = ((assignmentRows ?? []) as AssignmentRow[]).map((assignment) => {
        const dueDate = new Date(`${assignment.due_date}T00:00:00`);
        const daysUntilDue = Math.ceil((dueDate.getTime() - new Date(todayDate).getTime()) / 86400000);

        return {
          id: assignment.assignment_id,
          name: assignment.name,
          description: assignment.description,
          due: formatDueDate(assignment.due_date),
          dueSoon: daysUntilDue <= 2,
        };
      });

      if (!cancelled) {
        setStudentData({
          loading: false,
          error: "",
          feedback,
          assignments,
          upcomingClasses: uiClasses.filter((cls) => cls.startsAt > today).sort(byStartTime),
          completedClasses: uiClasses.filter((cls) => cls.endsAt < today).sort(byStartTime),
        });
      }
    }

    loadStudentDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground">
            {lang === "zh" ? `你好，${studentName.split(" ")[0]}！` : `Hello, ${studentName.split(" ")[0]}!`}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {lang === "zh" ? "这是你今天的学习概览。" : "Here's your learning overview for today."}
          </p>
        </div>
      </div>

      {studentData.error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {studentData.error}
        </div>
      )}

      {/* Top row: Feedback + Assignments side by side */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:[min-height:300px]">
        <FeedbackCard lang={lang} feedback={studentData.feedback} loading={studentData.loading} />
        <AssignmentsCard lang={lang} assignments={studentData.assignments} loading={studentData.loading} />
      </div>

      {/* Bottom: Classes (full width, larger) */}
      <ClassesCard
        lang={lang}
        upcomingClasses={studentData.upcomingClasses}
        completedClasses={studentData.completedClasses}
        loading={studentData.loading}
      />
    </div>
  );
}

export function TutorDashboardPage({ lang }: { lang: string }) {
  const [dashboardData, setDashboardData] = useState<TutorDashboardData>(emptyTutorDashboardData);
  const [storedUser, setStoredUser] = useState<StoredUser | null>(null);
  const tutorName = storedUser?.name || TUTOR.name;

  useEffect(() => {
    let cancelled = false;

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
            error: "No tutor uid available.",
          });
        }
        return;
      }

      const { data: classRows, error } = await supabase
        .from("classes")
        .select("lesson_id, student_uid, teacher_uid, lesson_date, start_time, end_time, evaluation_completed")
        .eq("teacher_uid", tutorUid)
        .order("lesson_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) {
        if (!cancelled) {
          setDashboardData({
            ...emptyTutorDashboardData,
            loading: false,
            error: error.message,
          });
        }
        return;
      }

      const classes = (classRows ?? []) as ClassRow[];
      const now = new Date();
      const completedClassRows = classes.filter((cls) => getClassDateTime(cls.lesson_date, cls.end_time) < now);
      const studentUids = Array.from(new Set(classes.map((cls) => cls.student_uid)));
      const completedStudentUids = Array.from(new Set(completedClassRows.map((cls) => cls.student_uid)));
      const studentNames = new Map<string, string>();

      if (studentUids.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("uid, name")
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

        profiles?.forEach((profile) => {
          studentNames.set(profile.uid, profile.name);
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
        .single();
      const meetingDetails = tutorDetails
        ? {
            classLink: tutorDetails.class_link,
            meetingPassword: tutorDetails.meeting_password,
          }
        : undefined;

      const uiClasses = classes.map((cls) => toUIClass(cls, studentNames, tutorName, meetingDetails));
      const byStartTime = (a: UIClass, b: UIClass) => a.startsAt.getTime() - b.startsAt.getTime();
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
          pendingEvaluations: uiClasses
            .filter((cls) => cls.endsAt < now && !cls.evaluationCompleted)
            .sort(byStartTime),
          upcomingClasses: uiClasses
            .filter((cls) => cls.startsAt > now)
            .sort(byStartTime),
          completedClasses: uiClasses
            .filter((cls) => cls.endsAt < now)
            .sort(byStartTime),
        });
      }
    }

    loadTutorDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground">
            {lang === "zh" ? `你好，${tutorName.split(" ")[0]}！` : `Hello, ${tutorName.split(" ")[0]}!`}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {lang === "zh" ? "这是你今天的教学概览。" : "Here's your teaching overview for today."}
          </p>
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
        feedbackLabel={lang === "zh" ? "查看评价" : "View Evaluation"}
        feedbackPendingLabel={lang === "zh" ? "填写评价" : "Write Evaluation"}
        upcomingClasses={dashboardData.upcomingClasses}
        completedClasses={dashboardData.completedClasses}
        loading={dashboardData.loading}
      />
    </div>
  );
}

// ─── ROOT SHELL ──────────────────────────────────────────────────────────────

export function AppShell({
  activePage,
  children,
  user = STUDENT,
  dashboardHref = "/student-dashboard",
  scheduleHref = "/student-schedule",
  recordHref,
}: {
  activePage: "dashboard" | "schedule" | "record";
  children: (lang: string) => ReactNode;
  user?: typeof STUDENT;
  dashboardHref?: string;
  scheduleHref?: string | null;
  recordHref?: string;
}) {
  const [lang, setLang] = useState("en");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [storedUser, setStoredUser] = useState<StoredUser | null>(null);
  const navUser = {
    ...user,
    name: storedUser?.name || user.name,
    email: storedUser?.email || user.email,
  };

  useEffect(() => {
    setStoredUser(readStoredUser());
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background md:h-screen md:overflow-hidden">
      <TopNav lang={lang} setLang={setLang} user={navUser} onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        <Sidebar
          active={activePage}
          lang={lang}
          dashboardHref={dashboardHref}
          scheduleHref={scheduleHref}
          recordHref={recordHref}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className={`min-w-0 flex-1 p-4 sm:p-6 ${activePage === "schedule" ? "flex flex-col overflow-y-auto md:overflow-hidden" : "overflow-y-auto"}`}>
          {children(lang)}
        </main>
      </div>
    </div>
  );
}

export function StudentScheduleApp() {
  return (
    <AppShell activePage="schedule">
      {(lang) => <StudentSchedulePage lang={lang} />}
    </AppShell>
  );
}

export function TutorApp() {
  return (
    <AppShell activePage="dashboard" user={TUTOR} dashboardHref="/tutor-dashboard" scheduleHref="/tutor-schedule" recordHref="/volunteer-record">
      {(lang) => <TutorDashboardPage lang={lang} />}
    </AppShell>
  );
}

export function TutorScheduleApp() {
  return (
    <AppShell activePage="schedule" user={TUTOR} dashboardHref="/tutor-dashboard" scheduleHref="/tutor-schedule" recordHref="/volunteer-record">
      {(lang) => <TutorSchedulePage lang={lang} />}
    </AppShell>
  );
}

export function VolunteerRecordApp() {
  return (
    <AppShell activePage="record" user={TUTOR} dashboardHref="/tutor-dashboard" scheduleHref="/tutor-schedule" recordHref="/volunteer-record">
      {(lang) => <VolunteerRecordPage lang={lang} />}
    </AppShell>
  );
}

export function AdminApp() {
  return (
    <AppShell activePage="dashboard" user={ADMIN} dashboardHref="/admin-dashboard" scheduleHref={null}>
      {(lang) => <AdminDashboardPage lang={lang} />}
    </AppShell>
  );
}

export default function App() {
  return (
    <AppShell activePage="dashboard">
      {(lang) => <StudentDashboardPage lang={lang} />}
    </AppShell>
  );
}

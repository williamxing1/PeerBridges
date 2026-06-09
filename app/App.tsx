"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { SchedulePage } from "./components/SchedulePage";
import { TutorSchedulePage } from "./components/TutorSchedulePage";
import { VolunteerRecordPage } from "./components/VolunteerRecordPage";
import { AdminDashboardPage } from "./components/AdminDashboardPage";
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
  Bell,
  X,
  ChevronRight,
  Users,
} from "lucide-react";

{/* MARKER-MAKE-KIT-INVOKED */}

// ─── DATA ────────────────────────────────────────────────────────────────────

const STUDENT = {
  name: "Sophie Chen",
  email: "sophie@example.com",
  avatar:
    "https://images.unsplash.com/photo-1514355315815-2b64b0216b14?w=80&h=80&fit=crop&auto=format",
};

const TUTOR = {
  name: "Dr. Sarah Mitchell",
  email: "sarah@example.com",
  avatar:
    "https://images.unsplash.com/photo-1590650213165-c1fef80648c4?w=80&h=80&fit=crop&auto=format",
};

const ADMIN = {
  name: "Admin User",
  email: "admin@example.com",
  avatar:
    "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=80&h=80&fit=crop&auto=format",
};

const LAST_FEEDBACK = {
  teacher: "Dr. Sarah Mitchell",
  avatar:
    "https://images.unsplash.com/photo-1590650213165-c1fef80648c4?w=80&h=80&fit=crop&auto=format",
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
    avatar:
      "https://images.unsplash.com/photo-1514355315815-2b64b0216b14?w=60&h=60&fit=crop&auto=format",
    date: "Jun 11, 2026",
    time: "4:00 PM – 5:30 PM",
  },
  {
    id: 2,
    student: "Leo Wang",
    name: "English Literature — Essay Review",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=60&h=60&fit=crop&auto=format",
    date: "Jun 10, 2026",
    time: "6:00 PM – 7:00 PM",
  },
];

const SCHEDULED_CLASSES = [
  {
    id: 1,
    name: "AP Calculus — Limits & Continuity",
    teacher: "Dr. Sarah Mitchell",
    avatar:
      "https://images.unsplash.com/photo-1590650213165-c1fef80648c4?w=60&h=60&fit=crop&auto=format",
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
    avatar:
      "https://images.unsplash.com/photo-1590650213165-c1fef80648c4?w=60&h=60&fit=crop&auto=format",
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
    avatar:
      "https://images.unsplash.com/photo-1758685734503-58a8accc24e8?w=60&h=60&fit=crop&auto=format",
    date: "Jun 5, 2026",
    time: "2:00 PM – 3:30 PM",
    subject: "Chemistry",
    subjectColor: "bg-sky-100 text-sky-700",
    feedback: {
      teacher: "Prof. James Okafor",
      avatar: "https://images.unsplash.com/photo-1758685734503-58a8accc24e8?w=80&h=80&fit=crop&auto=format",
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
    avatar:
      "https://images.unsplash.com/photo-1573496799652-408c2ac9fe98?w=60&h=60&fit=crop&auto=format",
    date: "Jun 3, 2026",
    time: "3:30 PM – 5:00 PM",
    subject: "Test Prep",
    subjectColor: "bg-orange-100 text-orange-700",
    feedback: {
      teacher: "Ms. Karen Liu",
      avatar: "https://images.unsplash.com/photo-1573496799652-408c2ac9fe98?w=80&h=80&fit=crop&auto=format",
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

function Avatar({
  src,
  alt,
  size = 40,
}: {
  src: string;
  alt: string;
  size?: number;
}) {
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="rounded-full object-cover shrink-0"
      style={{ width: size, height: size }}
    />
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
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-card rounded-2xl shadow-2xl p-6 w-full max-w-md border border-border">
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
            <Avatar src={feedback.avatar} alt={feedback.teacher} size={48} />
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
}: {
  cls: (typeof SCHEDULED_CLASSES)[0] | (typeof COMPLETED_CLASSES)[0];
  completed: boolean;
  feedbackLabel?: string;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const completedCls = cls as (typeof COMPLETED_CLASSES)[0];

  return (
    <>
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-2">
          <span />
          {completed && (
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
          )}
        </div>
        <p className="text-card-foreground text-sm leading-snug">{cls.name}</p>
        <div className="flex items-center gap-2.5">
          <Avatar src={cls.avatar} alt={cls.teacher} size={32} />
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
        {completed && completedCls.feedback && (
          <button
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer mt-1 w-fit"
          >
            <MessageSquare size={12} />
            {feedbackLabel}
            <ChevronRight size={12} />
          </button>
        )}
        {!completed && (
          <button className="mt-1 w-full text-center text-xs text-primary border border-primary/30 rounded-lg py-1.5 hover:bg-accent transition-colors cursor-pointer">
            Join Session
          </button>
        )}
      </div>
      {completed && completedCls.feedback && (
        <FeedbackDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          feedback={completedCls.feedback}
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
}: {
  lang: string;
  setLang: (l: string) => void;
  user: typeof STUDENT;
}) {
  return (
    <header className="h-16 bg-card border-b border-border flex items-center px-6 gap-4 shrink-0 z-10">
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
        <Select.Trigger className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-card-foreground border border-border rounded-lg px-3 py-1.5 bg-background hover:bg-accent transition-colors cursor-pointer outline-none">
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

      {/* Notification bell */}
      <button className="relative p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-card-foreground transition-colors cursor-pointer">
        <Bell size={18} />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
      </button>

      {/* Profile dropdown */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-accent transition-colors cursor-pointer outline-none border border-transparent hover:border-border">
            <Avatar src={user.avatar} alt={user.name} size={32} />
            <span className="text-sm text-card-foreground hidden sm:block">{user.name}</span>
            <ChevronDown size={14} className="text-muted-foreground" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={8}
            className="bg-popover border border-border rounded-xl shadow-xl z-50 w-52 p-1.5 overflow-hidden"
          >
            <div className="px-3 py-2 mb-1 border-b border-border">
              <p className="text-sm text-popover-foreground">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            {[
              { icon: User, label: lang === "zh" ? "我的资料" : "My Profile" },
              { icon: Settings, label: lang === "zh" ? "账户设置" : "Account Settings" },
              { icon: Bell, label: lang === "zh" ? "通知偏好" : "Notification Preferences" },
            ].map(({ icon: Icon, label }) => (
              <DropdownMenu.Item
                key={label}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-popover-foreground rounded-lg hover:bg-accent cursor-pointer outline-none"
              >
                <Icon size={14} className="text-muted-foreground" />
                {label}
              </DropdownMenu.Item>
            ))}
            <DropdownMenu.Separator className="my-1 h-px bg-border" />
            <DropdownMenu.Item className="flex items-center gap-2.5 px-3 py-2 text-sm text-destructive rounded-lg hover:bg-destructive/10 cursor-pointer outline-none">
              <LogOut size={14} />
              {lang === "zh" ? "退出登录" : "Sign Out"}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </header>
  );
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────

function Sidebar({
  active,
  lang,
  dashboardHref,
  scheduleHref,
  recordHref,
}: {
  active: string;
  lang: string;
  dashboardHref: string;
  scheduleHref?: string | null;
  recordHref?: string;
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
    <aside className="w-56 bg-sidebar border-r border-sidebar-border flex flex-col p-3 gap-1 shrink-0">
      {items.map(({ id, href, icon: Icon, label }) => (
        <Link
          key={id}
          href={href}
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
  );
}

// ─── FEEDBACK CARD ────────────────────────────────────────────────────────────

function FeedbackCard({ lang }: { lang: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-card-foreground">{lang === "zh" ? "上次课程反馈" : "Last Class Feedback"}</h3>
        <span className="text-xs text-muted-foreground">{LAST_FEEDBACK.date}</span>
      </div>

      {/* Teacher info row */}
      <div className="flex items-center gap-3">
        <Avatar src={LAST_FEEDBACK.avatar} alt={LAST_FEEDBACK.teacher} size={48} />
        <div className="flex-1 min-w-0">
          <p className="text-card-foreground text-sm">{LAST_FEEDBACK.teacher}</p>
          <p className="text-xs text-muted-foreground">{LAST_FEEDBACK.subject}</p>
        </div>
      </div>

      {/* Feedback text */}
      <p className="text-sm text-muted-foreground leading-relaxed flex-1">{LAST_FEEDBACK.text}</p>

      {/* Rating section — clearly labeled as the student's session rating */}
      <div className="border-t border-border pt-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">
            {lang === "zh" ? "您对本次课程的评分" : "Your session rating"}
          </p>
          <StarRating stars={LAST_FEEDBACK.stars} size={22} />
        </div>
        <span className="text-2xl text-card-foreground">{LAST_FEEDBACK.stars}<span className="text-sm text-muted-foreground">/5</span></span>
      </div>
    </div>
  );
}

// ─── ASSIGNMENTS CARD ─────────────────────────────────────────────────────────

function AssignmentsCard({ lang }: { lang: string }) {
  const subjectColors: Record<string, string> = {
    Calculus: "bg-violet-100 text-violet-700",
    "English Lit": "bg-emerald-100 text-emerald-700",
    Chemistry: "bg-sky-100 text-sky-700",
    History: "bg-rose-100 text-rose-700",
    "Test Prep": "bg-orange-100 text-orange-700",
  };
  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-card-foreground">{lang === "zh" ? "作业" : "Assignments"}</h3>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {ASSIGNMENTS.length} {lang === "zh" ? "项" : "pending"}
        </span>
      </div>
      <div className="flex flex-col gap-3 flex-1">
        {ASSIGNMENTS.map((a) => (
          <div
            key={a.id}
            className={`flex flex-col gap-2.5 px-4 py-3.5 rounded-xl border ${
              a.urgent ? "border-amber-200 bg-amber-50" : "border-border bg-background"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-card-foreground">{a.name}</p>
              {a.urgent && (
                <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full shrink-0">
                  {lang === "zh" ? "紧急" : "Due soon"}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{a.description}</p>
            <div className="flex items-center justify-between mt-1">
              <span className={`text-xs px-2.5 py-1 rounded-full ${subjectColors[a.subject] ?? "bg-muted text-muted-foreground"}`}>
                {a.subject}
              </span>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarDays size={11} />
                {a.due}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TUTOR STATS CARD ────────────────────────────────────────────────────────

function TutorStatsCard({ lang }: { lang: string }) {
  const stats = [
    {
      label: lang === "zh" ? "已授课程" : "Total classes taught",
      value: "128",
      icon: BookOpen,
      tone: "bg-violet-50",
      iconTone: "bg-primary text-primary-foreground",
    },
    {
      label: lang === "zh" ? "学生人数" : "Students taught",
      value: "42",
      icon: Users,
      tone: "bg-emerald-50",
      iconTone: "bg-emerald-500 text-white",
    },
    {
      label: lang === "zh" ? "教学时长" : "Total hours spent",
      value: "196h",
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
      <div className="grid grid-cols-2 gap-3 flex-1">
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
        <div className="col-span-2 flex justify-center">
          {stats.slice(2).map(({ label, value, icon: Icon, tone, iconTone }) => (
            <div key={label} className={`${tone} border border-border rounded-xl p-4 flex flex-col justify-between min-h-28 w-full max-w-[calc(50%-0.375rem)]`}>
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

function PendingEvaluationsCard({ lang }: { lang: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-card-foreground">{lang === "zh" ? "待完成评价" : "Pending Evaluations"}</h3>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {PENDING_EVALUATIONS.length} {lang === "zh" ? "项" : "pending"}
        </span>
      </div>
      <div className="flex flex-col gap-3 flex-1">
        {PENDING_EVALUATIONS.map((evaluation) => (
          <div
            key={evaluation.id}
            className="flex flex-col gap-3 px-4 py-3.5 rounded-xl border border-border bg-background"
          >
            <div className="flex items-center gap-3">
              <Avatar src={evaluation.avatar} alt={evaluation.student} size={34} />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-card-foreground truncate">{evaluation.name}</p>
                <p className="text-xs text-muted-foreground">{evaluation.student}</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">Ready to complete</p>
              <button className="shrink-0 flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 transition-colors">
                <FileText size={12} />
                {lang === "zh" ? "填写" : "Complete"}
              </button>
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
}: {
  cls: typeof SCHEDULED_CLASSES[0];
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
        </div>
        <div className="flex items-center gap-3">
          <Avatar src={cls.avatar} alt={cls.teacher} size={36} />
          <div>
            <p className="text-sm text-card-foreground">{cls.teacher}</p>
            <p className="text-xs text-muted-foreground">{lang === "zh" ? "您的老师" : "Your tutor"}</p>
          </div>
        </div>
      </div>
      <button className="shrink-0 bg-primary text-primary-foreground px-6 py-3 rounded-xl text-sm hover:bg-primary/90 transition-colors cursor-pointer shadow-sm">
        {lang === "zh" ? "加入课堂" : "Join Session"}
      </button>
    </div>
  );
}

// ─── CLASSES CARD ────────────────────────────────────────────────────────────

function ClassesCard({
  lang,
  feedbackLabel = "View Teacher Feedback",
}: {
  lang: string;
  feedbackLabel?: string;
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
          {SCHEDULED_CLASSES.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <CalendarDays size={32} className="opacity-30" />
              <p className="text-sm">{lang === "zh" ? "暂无即将到来的课程" : "No upcoming classes scheduled"}</p>
            </div>
          ) : (
            <UpcomingClassHero cls={SCHEDULED_CLASSES[0]} lang={lang} />
          )}
        </Tabs.Content>
        <Tabs.Content value="completed">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {COMPLETED_CLASSES.map((cls) => (
              <ClassCard key={cls.id} cls={cls} completed={true} feedbackLabel={feedbackLabel} />
            ))}
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}

// ─── DASHBOARD PAGE ───────────────────────────────────────────────────────────

export function DashboardPage({ lang }: { lang: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground">
            {lang === "zh" ? `你好，${STUDENT.name.split(" ")[0]}！` : `Hello, ${STUDENT.name.split(" ")[0]}!`}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {lang === "zh" ? "这是你今天的学习概览。" : "Here's your learning overview for today."}
          </p>
        </div>
      </div>

      {/* Top row: Feedback + Assignments side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ minHeight: 300 }}>
        <FeedbackCard lang={lang} />
        <AssignmentsCard lang={lang} />
      </div>

      {/* Bottom: Classes (full width, larger) */}
      <ClassesCard lang={lang} />
    </div>
  );
}

export function TutorDashboardPage({ lang }: { lang: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground">
            {lang === "zh" ? "你好，Sarah！" : "Hello, Sarah!"}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {lang === "zh" ? "这是你今天的教学概览。" : "Here's your teaching overview for today."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ minHeight: 300 }}>
        <TutorStatsCard lang={lang} />
        <PendingEvaluationsCard lang={lang} />
      </div>

      <ClassesCard lang={lang} feedbackLabel={lang === "zh" ? "查看评价" : "View Evaluation"} />
    </div>
  );
}

// ─── ROOT SHELL ──────────────────────────────────────────────────────────────

export function AppShell({
  activePage,
  children,
  user = STUDENT,
  dashboardHref = "/dashboard",
  scheduleHref = "/schedule",
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

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <TopNav lang={lang} setLang={setLang} user={user} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar active={activePage} lang={lang} dashboardHref={dashboardHref} scheduleHref={scheduleHref} recordHref={recordHref} />
        <main className={`flex-1 p-6 min-w-0 ${activePage === "schedule" ? "overflow-hidden flex flex-col" : "overflow-y-auto"}`}>
          {children(lang)}
        </main>
      </div>
    </div>
  );
}

export function ScheduleApp() {
  return (
    <AppShell activePage="schedule">
      {(lang) => <SchedulePage lang={lang} />}
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
      {(lang) => <DashboardPage lang={lang} />}
    </AppShell>
  );
}

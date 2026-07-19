"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ClipboardList } from "lucide-react";
import { supabase } from "../../lib/supabase/client";
import { ClassCard } from "../App";
import { useLanguage } from "../i18n";
import { PersonProfileDetails, type ProfilePerson } from "./PersonProfileDetails";

type StudentOption = {
  uid: string;
  name: string;
  student_wechat_id: string | null;
  parent_wechat_id: string | null;
};

type StudentClassRow = {
  lesson_id: string;
  student_uid: string;
  teacher_uid: string;
  time: string;
  duration: number;
  evaluation_completed: boolean;
  student_wants_to_share: string | null;
  recurring_lesson_id: string | null;
};

type StudentAssignmentRow = {
  assignment_id: string;
  name: string;
  description: string;
  due_date: string;
  complete: boolean;
};

function localeForLang(lang: string) {
  return lang === "zh" ? "zh-CN" : "en-US";
}

function formatDate(value: string, lang: string) {
  return new Date(value).toLocaleDateString(localeForLang(lang), {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDueDate(value: string, lang: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(localeForLang(lang), {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value: string, duration: number, lang: string) {
  const start = new Date(value);
  const end = new Date(start.getTime() + duration * 60000);
  const options: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  return `${start.toLocaleTimeString(localeForLang(lang), options)} - ${end.toLocaleTimeString(localeForLang(lang), options)}`;
}

export function ViewStudentsPage({ studentId }: { studentId?: string }) {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState("");
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);
  const [assignments, setAssignments] = useState<StudentAssignmentRow[]>([]);
  const [classes, setClasses] = useState<StudentClassRow[]>([]);
  const [tutorName, setTutorName] = useState("");
  const [classLink, setClassLink] = useState("");
  const [meetingPassword, setMeetingPassword] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadStudents() {
      setLoading(true);
      setAccessDenied(false);
      setError("");

      const { data: authData, error: authError } = await supabase.auth.getUser();
      const tutorUid = authData.user?.id;
      if (authError || !tutorUid) {
        if (!cancelled) {
          setAccessDenied(true);
          setLoading(false);
        }
        return;
      }

      const [tutorResult, classesResult, tutorDetailsResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("uid, role, name")
          .eq("uid", tutorUid)
          .eq("role", "tutor")
          .maybeSingle(),
        supabase
          .from("classes")
          .select("lesson_id, student_uid, teacher_uid, time, duration, evaluation_completed, student_wants_to_share, recurring_lesson_id")
          .eq("teacher_uid", tutorUid)
          .or("status.is.null,status.neq.cancelled")
          .order("time", { ascending: false }),
        supabase
          .from("tutor_profiles")
          .select("class_link, meeting_password")
          .eq("uid", tutorUid)
          .maybeSingle(),
      ]);

      if (tutorResult.error || !tutorResult.data || classesResult.error) {
        if (!cancelled) {
          setAccessDenied(true);
          setLoading(false);
        }
        return;
      }

      const tutorClasses = (classesResult.data ?? []) as StudentClassRow[];
      const studentUids = Array.from(new Set(tutorClasses.map((cls) => cls.student_uid)));
      const studentsResult = studentUids.length > 0
        ? await supabase
            .from("profiles")
            .select("uid, role, name, student_wechat_id, parent_wechat_id")
            .in("uid", studentUids)
            .eq("role", "student")
        : { data: [], error: null };

      if (studentsResult.error) {
        if (!cancelled) {
          setError(studentsResult.error.message);
          setLoading(false);
        }
        return;
      }

      const availableStudents = ((studentsResult.data ?? []) as Array<StudentOption & { role: string }>)
        .map(({ uid, name, student_wechat_id, parent_wechat_id }) => ({
          uid,
          name,
          student_wechat_id,
          parent_wechat_id,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      const selected = studentId
        ? availableStudents.find((student) => student.uid === studentId) ?? null
        : null;

      if (studentId && !selected) {
        if (!cancelled) {
          setAccessDenied(true);
          setLoading(false);
        }
        return;
      }

      let assignmentRows: StudentAssignmentRow[] = [];
      if (selected) {
        const assignmentsResult = await supabase
          .from("assignments")
          .select("assignment_id, name, description, due_date, complete")
          .eq("teacher_uid", tutorUid)
          .eq("student_uid", selected.uid)
          .eq("deleted", false)
          .order("due_date", { ascending: false });

        if (assignmentsResult.error) {
          if (!cancelled) {
            setError(assignmentsResult.error.message);
            setLoading(false);
          }
          return;
        }
        assignmentRows = (assignmentsResult.data ?? []) as StudentAssignmentRow[];
      }

      if (!cancelled) {
        setStudents(availableStudents);
        setSelectedStudent(selected);
        setAssignments(assignmentRows);
        setClasses(selected ? tutorClasses.filter((cls) => cls.student_uid === selected.uid) : []);
        setTutorName(tutorResult.data.name);
        setClassLink(tutorDetailsResult.data?.class_link ?? "");
        setMeetingPassword(tutorDetailsResult.data?.meeting_password ?? "");
        setLoading(false);
      }
    }

    void loadStudents();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>;
  }

  if (accessDenied) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-5 text-sm text-destructive">
        {t("viewStudents.cannotView")}
      </div>
    );
  }

  const profilePerson: ProfilePerson | null = selectedStudent
    ? { uid: selectedStudent.uid, role: "student", name: selectedStudent.name }
    : null;
  const now = new Date();
  const studentWechat = selectedStudent?.student_wechat_id?.trim()
    || selectedStudent?.parent_wechat_id?.trim()
    || t("common.none");

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div>
        <h1 className="text-2xl text-foreground">{t("viewStudents.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("viewStudents.help")}</p>
      </div>

      <label className="block max-w-xl rounded-2xl border border-border bg-card p-5">
        <span className="text-sm font-medium text-card-foreground">{t("viewStudents.selectStudent")}</span>
        <select
          value={selectedStudent?.uid ?? ""}
          onChange={(event) => {
            const nextStudentId = event.target.value;
            router.push(nextStudentId ? `/view-students/${nextStudentId}` : "/view-students");
          }}
          className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition focus:border-primary/40"
        >
          <option value="">{t("viewStudents.chooseStudent")}</option>
          {students.map((student) => (
            <option key={student.uid} value={student.uid}>{student.name}</option>
          ))}
        </select>
      </label>

      {error && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-5 text-sm text-destructive">{error}</div>
      )}

      {!selectedStudent && !error && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          {students.length === 0 ? t("viewStudents.noStudents") : t("viewStudents.selectPrompt")}
        </div>
      )}

      {selectedStudent && !error && (
        <>
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg text-card-foreground">{t("viewStudents.profile")}</h2>
            <div className="mt-4">
              <PersonProfileDetails person={profilePerson} />
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <ClipboardList size={18} className="text-primary" />
              <h2 className="text-lg text-card-foreground">{t("viewStudents.assignments")}</h2>
            </div>
            {assignments.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">{t("viewStudents.noAssignments")}</p>
            ) : (
              <div className="mt-4 overflow-x-auto pb-2">
                <div className="flex w-max gap-3">
                  {assignments.map((assignment) => (
                    <article key={assignment.assignment_id} className="w-72 shrink-0 rounded-xl border border-border bg-background p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-sm font-medium text-card-foreground">{assignment.name}</h3>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${
                          assignment.complete ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                        }`}>
                          {t(assignment.complete ? "viewStudents.assignmentCompleted" : "viewStudents.assignmentAssigned")}
                        </span>
                      </div>
                      <p className="mt-3 text-xs font-medium text-muted-foreground">
                        {t("viewStudents.due", { date: formatDueDate(assignment.due_date, lang) })}
                      </p>
                      {assignment.description && (
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{assignment.description}</p>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section>
            <div className="mb-4 flex items-center gap-2">
              <CalendarDays size={18} className="text-primary" />
              <h2 className="text-lg text-card-foreground">{t("viewStudents.classes")}</h2>
            </div>
            {classes.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
                {t("viewStudents.noClasses")}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {classes.map((cls) => {
                  const startsAt = new Date(cls.time);
                  const endsAt = new Date(startsAt.getTime() + cls.duration * 60000);
                  return (
                    <ClassCard
                      key={cls.lesson_id}
                      cls={{
                        id: cls.lesson_id,
                        name: t("dashboard.classWith", { name: selectedStudent.name }),
                        teacher: tutorName,
                        displayPersonUid: selectedStudent.uid,
                        displayPersonRole: "student",
                        displayPersonName: selectedStudent.name,
                        descriptionLines: [
                          t("dashboard.studentNotes", { value: cls.student_wants_to_share?.trim() || t("common.none") }),
                          t("dashboard.studentWechatId", { value: studentWechat }),
                        ],
                        date: formatDate(cls.time, lang),
                        time: formatTime(cls.time, cls.duration, lang),
                        startsAt,
                        recurringLessonId: cls.recurring_lesson_id,
                        evaluationCompleted: cls.evaluation_completed,
                        classLink,
                        meetingPassword,
                      }}
                      completed={endsAt < now}
                      feedbackLabel={t("dashboard.viewEvaluation")}
                      feedbackPendingLabel={t("dashboard.writeEvaluation")}
                      useEvaluationPage
                      attendee="teacher"
                    />
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

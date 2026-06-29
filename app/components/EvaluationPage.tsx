"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Star, Trash2 } from "lucide-react";
import { useLanguage } from "../i18n";
import { supabase } from "../../lib/supabase/client";

const storedUserKey = "tutorflow-user";

type StoredUser = {
  uid: string;
  role: string;
  name: string;
  email: string;
};

type ClassRow = {
  lesson_id: string;
  student_uid: string;
  teacher_uid: string;
  time: string;
  duration: number;
  evaluation_completed: boolean;
  description: string | null;
};

type AssignmentDraft = {
  id?: string;
  name: string;
  description: string;
  dueDate: string;
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
};

type VolunteerRecordRow = {
  task_name: string;
  minutes: number;
};

type EvaluationClass = {
  id: string;
  student: string;
  studentUid: string;
  teacherUid: string;
  date: string;
  time: string;
  minutes: number;
  evaluationCompleted: boolean;
};

function readStoredUser() {
  if (typeof window === "undefined") return null;

  try {
    const stored = sessionStorage.getItem(storedUserKey);
    return stored ? (JSON.parse(stored) as StoredUser) : null;
  } catch {
    return null;
  }
}

function localeForLang(lang: string) {
  return lang === "zh" ? "zh-CN" : "en-US";
}

function formatClassDate(date: Date, lang: string) {
  return date.toLocaleDateString(localeForLang(lang), {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatClassTime(date: Date, lang: string) {
  return date.toLocaleTimeString(localeForLang(lang), {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getClassMinutes(cls: ClassRow) {
  return cls.duration;
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

export function EvaluationPage({ classId }: { classId: string }) {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const [evaluationClass, setEvaluationClass] = useState<EvaluationClass | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [classDescription, setClassDescription] = useState("");
  const [prepMinutes, setPrepMinutes] = useState("");
  const [evaluationMinutes, setEvaluationMinutes] = useState("");
  const [assignments, setAssignments] = useState<AssignmentDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const classMinutes = evaluationClass?.minutes ?? 0;
  const parsedPrepMinutes = Number(prepMinutes);
  const parsedEvaluationMinutes = Number(evaluationMinutes);
  const totalVolunteerMinutes =
    classMinutes +
    (Number.isFinite(parsedPrepMinutes) ? parsedPrepMinutes : 0) +
    (Number.isFinite(parsedEvaluationMinutes) ? parsedEvaluationMinutes : 0);

  useEffect(() => {
    let cancelled = false;

    async function loadEvaluationClass() {
      setLoading(true);
      setLoadError("");

      if (!classId || classId === "undefined") {
        if (!cancelled) {
          setLoadError(t("dashboard.evaluationClassNotFound"));
          setLoading(false);
        }
        return;
      }

      const storedUser = readStoredUser();
      const { data: authData } = await supabase.auth.getUser();
      const tutorUid = storedUser?.uid || authData.user?.id || "";

      if (!tutorUid) {
        if (!cancelled) {
          setLoadError(t("common.noTutorUid"));
          setLoading(false);
        }
        return;
      }

      const { data: classRow, error: classError } = await supabase
        .from("classes")
        .select("lesson_id, student_uid, teacher_uid, time, duration, evaluation_completed, description")
        .eq("lesson_id", classId)
        .eq("teacher_uid", tutorUid)
        .maybeSingle();

      if (classError || !classRow) {
        if (!cancelled) {
          setLoadError(classError?.message || t("dashboard.evaluationClassNotFound"));
          setLoading(false);
        }
        return;
      }

      const cls = classRow as ClassRow;
      const [studentProfileResult, evaluationResult, assignmentsResult, volunteerResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("name")
          .eq("uid", cls.student_uid)
          .maybeSingle(),
        supabase
          .from("evaluations")
          .select("evaluation_id, lesson_id, feedback, stars, created_at")
          .eq("lesson_id", classId)
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("assignments")
          .select("assignment_id, lesson_id, student_uid, teacher_uid, name, description, due_date")
          .eq("lesson_id", classId)
          .order("due_date", { ascending: true }),
        supabase
          .from("volunteer_records")
          .select("task_name, minutes")
          .eq("class_uid", classId)
          .eq("tutor_uid", tutorUid),
      ]);

      if (evaluationResult.error || assignmentsResult.error || volunteerResult.error) {
        if (!cancelled) {
          setLoadError(
            evaluationResult.error?.message ||
            assignmentsResult.error?.message ||
            volunteerResult.error?.message ||
            t("dashboard.evaluationClassNotFound")
          );
          setLoading(false);
        }
        return;
      }

      if (!cancelled) {
        const studentName = studentProfileResult.data?.name || `Unknown student (${cls.student_uid.slice(0, 8)})`;
        const latestEvaluation = ((evaluationResult.data ?? []) as EvaluationRow[])[0];
        const savedAssignments = (assignmentsResult.data ?? []) as AssignmentRow[];
        const savedVolunteerRows = (volunteerResult.data ?? []) as VolunteerRecordRow[];
        const savedPrepMinutes = savedVolunteerRows.find((row) => isPreparationRecord(row.task_name))?.minutes;
        const savedEvaluationMinutes = savedVolunteerRows.find((row) => isEvaluationRecord(row.task_name))?.minutes;
        const startsAt = new Date(cls.time);
        const endsAt = new Date(startsAt.getTime() + cls.duration * 60000);

        setEvaluationClass({
          id: cls.lesson_id,
          student: studentName,
          studentUid: cls.student_uid,
          teacherUid: cls.teacher_uid,
          date: formatClassDate(startsAt, lang),
          time: `${formatClassTime(startsAt, lang)} - ${formatClassTime(endsAt, lang)}`,
          minutes: getClassMinutes(cls),
          evaluationCompleted: cls.evaluation_completed,
        });
        setClassDescription(cls.description ?? "");
        setRating(latestEvaluation?.stars ?? 0);
        setFeedback(latestEvaluation?.feedback ?? "");
        setPrepMinutes(savedPrepMinutes === undefined ? "" : String(savedPrepMinutes));
        setEvaluationMinutes(savedEvaluationMinutes === undefined ? "" : String(savedEvaluationMinutes));
        setAssignments(
          savedAssignments.map((assignment) => ({
            id: assignment.assignment_id,
            name: assignment.name,
            description: assignment.description,
            dueDate: assignment.due_date,
          }))
        );
        setLoading(false);
      }
    }

    void loadEvaluationClass();

    return () => {
      cancelled = true;
    };
  }, [classId, t]);

  function isPreparationRecord(taskName: string) {
    return taskName.includes("Preparation time") || taskName.includes("备课时间");
  }

  function isEvaluationRecord(taskName: string) {
    return taskName.includes("Evaluation time") || taskName.includes("填写评价时间");
  }

  function updateAssignment(index: number, field: keyof AssignmentDraft, value: string) {
    setAssignments((current) =>
      current.map((assignment, assignmentIndex) =>
        assignmentIndex === index ? { ...assignment, [field]: value } : assignment
      )
    );
  }

  function addAssignment() {
    setAssignments((current) =>
      current.length >= 3 ? current : [...current, { name: "", description: "", dueDate: "" }]
    );
  }

  function removeAssignment(index: number) {
    setAssignments((current) => current.filter((_, assignmentIndex) => assignmentIndex !== index));
  }

  async function handleSubmitEvaluation() {
    if (!evaluationClass) return;

    setSubmitError("");
    const classDescriptionValue = classDescription.trim();
    const feedbackValue = feedback.trim();

    if (!classDescriptionValue || !feedbackValue || rating === 0 || prepMinutes === "" || evaluationMinutes === "") {
      setSubmitError(t("dashboard.evaluationRequiredFields"));
      return;
    }

    const hasIncompleteAssignment = assignments.some((assignment) => !assignment.name.trim() || !assignment.dueDate);

    if (hasIncompleteAssignment) {
      setSubmitError(t("dashboard.assignmentIncomplete"));
      return;
    }

    if (
      !Number.isFinite(parsedPrepMinutes) ||
      !Number.isFinite(parsedEvaluationMinutes) ||
      parsedPrepMinutes < 0 ||
      parsedPrepMinutes > 60 ||
      parsedEvaluationMinutes < 0 ||
      parsedEvaluationMinutes > 30
    ) {
      setSubmitError(t("dashboard.volunteerTimeInvalid"));
      return;
    }

    if (totalVolunteerMinutes > 120) {
      setSubmitError(t("dashboard.volunteerTimeTooHigh"));
      return;
    }

    setSubmitting(true);
    const { error: evaluationError } = await supabase.rpc("secure_submit_evaluation", {
      p_lesson_id: evaluationClass.id,
      p_class_description: classDescriptionValue,
      p_feedback: feedbackValue,
      p_stars: rating,
      p_prep_minutes: parsedPrepMinutes,
      p_evaluation_minutes: parsedEvaluationMinutes,
      p_assignments: assignments.map((assignment) => ({
        name: assignment.name.trim(),
        description: assignment.description.trim(),
        due_date: assignment.dueDate,
      })),
    });

    if (evaluationError) {
      setSubmitError(evaluationError.message || t("dashboard.evaluationSubmitError"));
      setSubmitting(false);
      return;
    }

    router.push("/tutor-dashboard");
  }

  if (loading) {
    return (
      <div className="flex min-h-[24rem] items-center justify-center rounded-2xl border border-dashed border-border bg-card text-sm text-muted-foreground">
        {t("common.loading")}
      </div>
    );
  }

  if (loadError || !evaluationClass) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-destructive/20 bg-destructive/10 p-5 text-sm text-destructive">
        <p>{loadError || t("dashboard.evaluationClassNotFound")}</p>
        <Link href="/tutor-dashboard" className="inline-flex w-fit items-center gap-2 rounded-lg bg-card px-3 py-2 text-card-foreground">
          <ArrowLeft size={15} />
          {t("dashboard.backToDashboard")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/tutor-dashboard" className="mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft size={15} />
            {t("dashboard.backToDashboard")}
          </Link>
          <h2 className="text-foreground">
            {evaluationClass.evaluationCompleted ? t("dashboard.myEvaluation") : t("dashboard.completeEvaluation")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {evaluationClass.student} · {evaluationClass.date} · {evaluationClass.time}
          </p>
        </div>
      </div>

      {evaluationClass.evaluationCompleted ? (
        <EvaluationSummary
          classDescription={classDescription}
          rating={rating}
          feedback={feedback}
          assignments={assignments}
          classMinutes={classMinutes}
          prepMinutes={prepMinutes}
          evaluationMinutes={evaluationMinutes}
        />
      ) : (
      <form
        className="grid gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmitEvaluation();
        }}
      >
        <section className="rounded-2xl border border-border bg-card p-5">
          <label className="block">
            <span className="text-sm text-card-foreground">{t("dashboard.classDescription")}</span>
            <textarea
              required
              value={classDescription}
              onChange={(event) => setClassDescription(event.target.value)}
              rows={5}
              placeholder={t("dashboard.classDescriptionPlaceholder")}
              className="mt-2 w-full resize-y rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-card-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/40 focus:bg-card"
            />
          </label>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm text-card-foreground">{t("dashboard.starRating")}</p>
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
                    size={32}
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
          <textarea
            required
            aria-label={t("dashboard.textFeedback")}
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            rows={5}
            placeholder={t("dashboard.feedbackPlaceholder")}
            className="mt-5 w-full resize-y rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-card-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/40 focus:bg-card"
          />
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-card-foreground">{t("dashboard.assignmentSection")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("dashboard.assignmentsOptional")}</p>
            </div>
            <button
              type="button"
              onClick={addAssignment}
              disabled={assignments.length >= 3}
              className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-card-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={14} />
              {t("dashboard.addAssignment")}
            </button>
          </div>

          {assignments.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-muted-foreground">
              {t("dashboard.noEvaluationAssignments")}
            </div>
          ) : (
            <div className="mt-4 grid gap-4">
              {assignments.map((assignment, index) => (
                <div key={index} className="relative rounded-xl border border-border bg-background p-4">
                  <button
                    type="button"
                    onClick={() => removeAssignment(index)}
                    aria-label={t("dashboard.removeAssignment")}
                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-card-foreground"
                  >
                    <Trash2 size={15} />
                  </button>
                  <p className="pr-10 text-sm text-card-foreground">
                    {t("dashboard.assignmentNumber", { number: index + 1 })}
                  </p>
                  <div className="mt-4 grid gap-4 md:grid-cols-[1fr_12rem]">
                    <label className="block">
                      <span className="text-xs text-muted-foreground">{t("dashboard.assignmentTitle")}</span>
                      <input
                        required
                        value={assignment.name}
                        onChange={(event) => updateAssignment(index, "name", event.target.value)}
                        placeholder={t("dashboard.assignmentName", { number: index + 1 })}
                        className="mt-1 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/40"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs text-muted-foreground">{t("dashboard.assignmentDue")}</span>
                      <input
                        required
                        type="date"
                        value={assignment.dueDate}
                        onChange={(event) => updateAssignment(index, "dueDate", event.target.value)}
                        className="mt-1 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary/40"
                      />
                      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                        {assignment.dueDate
                          ? t("dashboard.assignmentDueAoeHelp", { date: formatAoeDeadlineLocal(assignment.dueDate, lang) })
                          : t("dashboard.assignmentDueAoeGeneralHelp")}
                      </span>
                    </label>
                  </div>
                  <label className="mt-4 block">
                    <span className="text-xs text-muted-foreground">{t("dashboard.assignmentDescriptionOptional")}</span>
                    <textarea
                      value={assignment.description}
                      onChange={(event) => updateAssignment(index, "description", event.target.value)}
                      rows={4}
                      placeholder={t("dashboard.assignmentDescription", { number: index + 1 })}
                      className="mt-1 w-full resize-y rounded-xl border border-border bg-card px-3 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/40"
                    />
                  </label>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm text-card-foreground">{t("dashboard.volunteerHours")}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("dashboard.totalVolunteerTime", { minutes: totalVolunteerMinutes })}
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="text-xs text-muted-foreground">{t("dashboard.classTimeLabel")} ({t("dashboard.minutesUnit")})</span>
              <input
                required
                readOnly
                type="number"
                value={classMinutes}
                className="mt-1 h-11 w-full rounded-xl border border-border bg-muted px-3 text-sm text-foreground outline-none"
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">{t("dashboard.preparationTime")} ({t("dashboard.minutesUnit")})</span>
              <input
                required
                min="0"
                max="60"
                type="number"
                value={prepMinutes}
                onChange={(event) => setPrepMinutes(event.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary/40"
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">{t("dashboard.evaluationTime")} ({t("dashboard.minutesUnit")})</span>
              <input
                required
                min="0"
                max="30"
                type="number"
                value={evaluationMinutes}
                onChange={(event) => setEvaluationMinutes(event.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary/40"
              />
            </label>
          </div>
          {totalVolunteerMinutes > 120 && (
            <p className="mt-2 text-xs text-destructive">{t("dashboard.volunteerTimeTooHigh")}</p>
          )}
        </section>

        {submitError && (
          <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
            {submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || totalVolunteerMinutes > 120}
          className="w-full rounded-xl bg-primary px-5 py-3 text-sm text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-fit"
        >
          {submitting ? t("common.saving") : t("dashboard.submitEvaluation")}
        </button>
      </form>
      )}
    </div>
  );
}

function EvaluationSummary({
  classDescription,
  rating,
  feedback,
  assignments,
  classMinutes,
  prepMinutes,
  evaluationMinutes,
}: {
  classDescription: string;
  rating: number;
  feedback: string;
  assignments: AssignmentDraft[];
  classMinutes: number;
  prepMinutes: string;
  evaluationMinutes: string;
}) {
  const { t } = useLanguage();
  const parsedPrepMinutes = Number(prepMinutes || 0);
  const parsedEvaluationMinutes = Number(evaluationMinutes || 0);
  const totalMinutes = classMinutes + parsedPrepMinutes + parsedEvaluationMinutes;

  return (
    <div className="grid gap-5">
      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">{t("dashboard.classDescription")}</p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-card-foreground">{classDescription || t("common.none")}</p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{t("dashboard.starRating")}</p>
            <div className="mt-2 flex gap-1">
              {Array.from({ length: 5 }).map((_, index) => {
                const value = index + 1;
                return (
                  <Star
                    key={value}
                    size={24}
                    className={value <= rating ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"}
                  />
                );
              })}
            </div>
          </div>
          <span className="text-2xl text-card-foreground">{rating}<span className="text-sm text-muted-foreground">/5</span></span>
        </div>
        <div className="mt-5 border-t border-border pt-5">
          <p className="text-sm text-muted-foreground">{t("dashboard.feedback")}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-card-foreground">{feedback || t("common.none")}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">{t("dashboard.assignmentSection")}</p>
        {assignments.length === 0 ? (
          <p className="mt-2 text-sm text-card-foreground">{t("dashboard.noEvaluationAssignments")}</p>
        ) : (
          <div className="mt-3 grid gap-2">
            {assignments.map((assignment) => (
              <div key={`${assignment.name}-${assignment.dueDate}`} className="flex flex-col gap-1 rounded-xl border border-border bg-background px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-card-foreground">{assignment.name}</p>
                <p className="text-xs text-muted-foreground">{assignment.dueDate}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">{t("dashboard.timeSpent")}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          {[
            [t("dashboard.classTimeLabel"), classMinutes],
            [t("dashboard.preparationTime"), parsedPrepMinutes],
            [t("dashboard.evaluationTime"), parsedEvaluationMinutes],
            [t("dashboard.total"), totalMinutes],
          ].map(([label, minutes]) => (
            <div key={String(label)} className="rounded-xl border border-border bg-background px-3 py-2">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-sm text-card-foreground">{minutes} {t("dashboard.minutesUnit")}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

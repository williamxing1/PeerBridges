export const tutorGradeBands = [
  "elementary school",
  "middle school",
  "high school",
] as const;

export function parseGradesToTutor(value: string | null | undefined) {
  const selected = new Set(
    (value ?? "")
      .split(",")
      .map((grade) => grade.trim().toLowerCase())
      .filter(Boolean),
  );

  return tutorGradeBands.filter((grade) => selected.has(grade));
}

export function serializeGradesToTutor(grades: readonly string[]) {
  const selected = new Set(grades.map((grade) => grade.trim().toLowerCase()));
  return tutorGradeBands.filter((grade) => selected.has(grade)).join(",");
}

export function toggleGradeToTutor(value: string, grade: string) {
  const selected = new Set<string>(parseGradesToTutor(value));
  if (selected.has(grade)) {
    selected.delete(grade);
  } else {
    selected.add(grade);
  }
  return serializeGradesToTutor([...selected]);
}

export function matchesGradeToTutor(value: string | null | undefined, grade: string) {
  return parseGradesToTutor(value).some((selectedGrade) => selectedGrade === grade.trim().toLowerCase());
}

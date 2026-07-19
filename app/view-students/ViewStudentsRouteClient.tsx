"use client";

import { AppShell } from "../App";
import { ViewStudentsPage } from "../components/ViewStudentsPage";

export function ViewStudentsRouteClient({ studentId }: { studentId?: string }) {
  return (
    <AppShell
      activePage="viewStudents"
      user={{ name: "", email: "" }}
      dashboardHref="/tutor-dashboard"
      scheduleHref="/tutor-schedule"
      recordHref="/volunteer-record"
      trainingHref="/training-materials"
      volunteerAwardHref="/volunteer-awards"
      communicationsHref="/tutor-communications"
      requiredRole="tutor"
      showAccessDeniedOnRoleMismatch
    >
      {() => <ViewStudentsPage studentId={studentId} />}
    </AppShell>
  );
}

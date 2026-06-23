"use client";

import { AppShell } from "../../App";
import { EvaluationPage } from "../../components/EvaluationPage";

export function EvaluationRouteClient({ classId }: { classId: string }) {
  return (
    <AppShell activePage="dashboard" user={{ name: "", email: "" }} dashboardHref="/tutor-dashboard" scheduleHref="/tutor-schedule" recordHref="/volunteer-record" trainingHref="/training-materials" volunteerAwardHref="/volunteer-awards" requiredRole="tutor">
      {() => <EvaluationPage classId={classId} />}
    </AppShell>
  );
}

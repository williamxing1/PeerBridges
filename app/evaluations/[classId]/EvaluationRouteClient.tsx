"use client";

import { AppShell } from "../../App";
import { EvaluationPage } from "../../components/EvaluationPage";

export function EvaluationRouteClient({ classId }: { classId: string }) {
  return (
    <AppShell activePage="dashboard" user={{ name: "Dr. Sarah Mitchell", email: "sarah@example.com" }} dashboardHref="/tutor-dashboard" scheduleHref="/tutor-schedule" recordHref="/volunteer-record">
      {() => <EvaluationPage classId={classId} />}
    </AppShell>
  );
}

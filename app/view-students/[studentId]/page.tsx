import { ViewStudentsRouteClient } from "../ViewStudentsRouteClient";

export default async function Page({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  return <ViewStudentsRouteClient studentId={studentId} />;
}

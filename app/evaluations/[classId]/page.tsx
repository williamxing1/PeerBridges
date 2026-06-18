import { EvaluationRouteClient } from "./EvaluationRouteClient";

export default async function Page({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  return <EvaluationRouteClient classId={classId} />;
}

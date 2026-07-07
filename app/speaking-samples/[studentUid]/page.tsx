import { SpeakingSamplesViewerPage } from "../../components/SpeakingSamplesPage";

export default async function Page({
  params,
}: {
  params: Promise<{ studentUid: string }>;
}) {
  const { studentUid } = await params;
  return <SpeakingSamplesViewerPage studentUid={studentUid} />;
}

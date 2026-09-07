import ResultsClient from "./results-client";

export default async function DiResultsPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  return <ResultsClient attemptId={attemptId} />;
}

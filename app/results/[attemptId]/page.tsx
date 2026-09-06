import ResultsClient from "./results-client";

// Server wrapper — Next.js passes dynamic route params as a Promise, so
// it's unwrapped here and handed to the client component as a plain prop.
export default async function ResultsPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  return <ResultsClient attemptId={attemptId} />;
}

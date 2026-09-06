import TestClient from "./test-client";

// Server wrapper — Next.js passes dynamic route params as a Promise, so
// it's unwrapped here and handed to the client component as a plain prop.
export default async function TestPage({
  params,
}: {
  params: Promise<{ mode: string }>;
}) {
  const { mode } = await params;
  return <TestClient mode={mode as "topic" | "sectional" | "full-length"} />;
}

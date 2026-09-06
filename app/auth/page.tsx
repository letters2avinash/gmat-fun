import { Suspense } from "react";
import AuthPage from "./auth-client";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AuthPage />
    </Suspense>
  );
}

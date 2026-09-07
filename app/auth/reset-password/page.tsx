import { Suspense } from "react";
import ResetPasswordPage from "./reset-password-client";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordPage />
    </Suspense>
  );
}

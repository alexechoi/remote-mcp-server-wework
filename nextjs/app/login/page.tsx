import { Suspense } from "react";

import { LoginPanel } from "@/components/login-panel";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6">
      <Suspense>
        <LoginPanel />
      </Suspense>
    </main>
  );
}

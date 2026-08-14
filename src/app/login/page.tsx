import React, { Suspense } from "react";
import { requireAnonymous } from "@/src/utils/auth/requireAnonymous";
import { LoginForm } from "./_components/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next: rawNext } = await searchParams;
  // Repeated `next` parameters are ambiguous; use the normal role landing.
  const next = Array.isArray(rawNext) ? null : (rawNext ?? null);
  // If already signed in, send the user to their role-based landing (or the
  // explicit ?next= that originally bounced them here).
  await requireAnonymous(next);

  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center">
          Loading...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

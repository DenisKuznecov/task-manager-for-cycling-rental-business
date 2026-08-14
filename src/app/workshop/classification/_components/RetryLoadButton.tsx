"use client";

import React from "react";
import { useRouter } from "next/navigation";

/**
 * Same-URL <Link> retry is a no-op in the App Router; refresh re-runs the
 * Server Component loader.
 */
export function RetryLoadButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      className="text-body-bold font-body-bold text-brand-700 underline focus:outline-none focus:ring-2 focus:ring-brand-600"
      onClick={() => router.refresh()}
    >
      Retry
    </button>
  );
}

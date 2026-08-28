import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DefaultPageLayout } from "@/ui/layouts/DefaultPageLayout";
import { createClient } from "@/src/utils/supabase/server";

export const metadata: Metadata = {
  title: "Account pending",
};

export default async function PendingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  // No role gate: this page is the destination for signed-in users without a
  // role. Wrapping with DefaultPageLayout keeps Log out reachable in the navbar.
  return <DefaultPageLayout>{children}</DefaultPageLayout>;
}

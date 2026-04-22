import React from "react";
import { redirect } from "next/navigation";
import { DefaultPageLayout } from "@/ui/layouts/DefaultPageLayout";
import { createClient } from "@/src/utils/supabase/server";

export default async function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Use getUser() (not getSession()) on the server: it re-validates the JWT
  // against Supabase Auth so the user identity cannot be spoofed via cookies.
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  // Role gating + PartnerShell rendering happens in the sub-layouts
  // (see partner/(me)/layout.tsx and partner/[slug]/layout.tsx) so each
  // branch can mount the shell with the correct partner context.
  return <DefaultPageLayout>{children}</DefaultPageLayout>;
}

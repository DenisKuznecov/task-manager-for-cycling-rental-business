import React from "react";
import { redirect } from "next/navigation";
import { DefaultPageLayout } from "@/ui/layouts/DefaultPageLayout";
import { PartnerShell } from "./_components/PartnerShell";
import { createClient } from "@/src/utils/supabase/server";

const ALLOWED_ROLES = ["admin", "manager", "partner"] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

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

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, partners(*)")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || !profile.role) {
    // No profile row, no role, or DB error -> send to pending.
    console.error("Partner layout: failed to load profile", profileError);
    redirect("/pending");
  }

  if (!ALLOWED_ROLES.includes(profile.role as AllowedRole)) {
    redirect("/unauthorized");
  }

  // Supabase returns related rows as an array even for to-one relations.
  const partnersRel = profile.partners as
    | { name: string; location: string; promo_code: string; slug: string }
    | { name: string; location: string; promo_code: string; slug: string }[]
    | null;
  const partnerData = Array.isArray(partnersRel)
    ? partnersRel[0] ?? null
    : partnersRel;

  return (
    <DefaultPageLayout>
      <PartnerShell partner={partnerData}>{children}</PartnerShell>
    </DefaultPageLayout>
  );
}

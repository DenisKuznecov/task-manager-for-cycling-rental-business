import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/src/utils/supabase/server";

const ALLOWED_ROLES = ["admin", "manager", "mechanic"] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

export default async function WorkshopLayout({
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

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || !profile.role) {
    console.error("Workshop layout: failed to load profile", profileError);
    redirect("/pending");
  }

  if (!ALLOWED_ROLES.includes(profile.role as AllowedRole)) {
    redirect("/unauthorized");
  }

  return <>{children}</>;
}

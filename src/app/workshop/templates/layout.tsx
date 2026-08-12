import React from "react";
import { redirect } from "next/navigation";
import { getMyProfile } from "@/src/lib/profile";
import { DefaultPageLayout } from "@/ui/layouts/DefaultPageLayout";

const ALLOWED_ROLES = ["admin", "manager"] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

export default async function WorkshopTemplatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role, error } = await getMyProfile();

  if (error) {
    console.error("Workshop templates layout: failed to load profile", error);
    redirect("/pending");
  }

  if (!role) redirect("/login");

  if (!ALLOWED_ROLES.includes(role as AllowedRole)) {
    redirect("/unauthorized");
  }

  return <DefaultPageLayout>{children}</DefaultPageLayout>;
}

import React from "react";
import { redirect } from "next/navigation";
import { getMyProfile } from "@/src/lib/profile";
import { DefaultPageLayout } from "@/ui/layouts/DefaultPageLayout";

const ALLOWED_ROLES = ["admin"] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

export default async function WorkshopClassificationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role, error } = await getMyProfile();

  if (error) {
    console.error("Workshop classification layout: failed to load profile", error);
    redirect("/pending");
  }

  if (!role) redirect("/login");

  if (!ALLOWED_ROLES.includes(role as AllowedRole)) {
    redirect("/unauthorized");
  }

  return <DefaultPageLayout>{children}</DefaultPageLayout>;
}

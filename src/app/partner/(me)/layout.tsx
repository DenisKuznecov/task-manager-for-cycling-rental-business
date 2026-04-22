import React from "react";
import { redirect } from "next/navigation";
import { PartnerShell } from "../_components/PartnerShell";
import { resolveMyPartner } from "../_lib/resolvePartner";

export default async function PartnerMeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role, partner } = await resolveMyPartner();

  if (!role) {
    redirect("/pending");
  }

  if (role === "admin" || role === "manager") {
    redirect("/all-partners");
  }

  if (role !== "partner") {
    redirect("/unauthorized");
  }

  return (
    <PartnerShell partner={partner} basePath="/partner">
      {children}
    </PartnerShell>
  );
}

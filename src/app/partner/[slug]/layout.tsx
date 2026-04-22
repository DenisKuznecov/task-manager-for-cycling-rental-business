import React from "react";
import { notFound, redirect } from "next/navigation";
import { PartnerShell } from "../_components/PartnerShell";
import {
  resolveMyPartner,
  resolvePartnerBySlug,
} from "../_lib/resolvePartner";

export default async function PartnerSlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { role } = await resolveMyPartner();

  if (!role) {
    redirect("/pending");
  }

  if (role !== "admin" && role !== "manager") {
    redirect("/partner/overview");
  }

  const partner = await resolvePartnerBySlug(slug);
  if (!partner) {
    notFound();
  }

  return (
    <PartnerShell partner={partner} basePath={`/partner/${slug}`}>
      {children}
    </PartnerShell>
  );
}

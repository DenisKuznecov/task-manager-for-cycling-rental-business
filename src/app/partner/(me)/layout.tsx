import React from "react";
import { redirect } from "next/navigation";
import { PartnerShell } from "../_components/PartnerShell";
import { PartnerGettingStarted } from "../_components/PartnerGettingStarted";
import { resolveMyPartner } from "../_lib/resolvePartner";

export default async function PartnerMeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role, partner, onboardingCompletedAt } = await resolveMyPartner();

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
    <>
      <PartnerShell partner={partner} basePath="/partner">
        {children}
      </PartnerShell>
      {onboardingCompletedAt === null && (
        <PartnerGettingStarted
          partnerName={partner?.name ?? "Partner"}
          partnerSlug={partner?.slug ?? null}
          promoCode={partner?.promo_code ?? null}
        />
      )}
    </>
  );
}

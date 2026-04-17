import React from "react";
import { redirect } from "next/navigation";
import { DefaultPageLayout } from "@/ui/layouts/DefaultPageLayout";
import { createClient } from "@/src/utils/supabase/server";
import { PartnerShell } from "./_components/PartnerShell";

export default async function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/partner/overview");
  }

  return (
    <DefaultPageLayout>
      <PartnerShell>{children}</PartnerShell>
    </DefaultPageLayout>
  );
}

import React from "react";
import { createClient } from "@/src/utils/supabase/server";
import { Alert } from "@/ui/components/Alert";
import { UtmBuilderForm, type Partner } from "./_components/UtmBuilderForm";

export default async function UtmBuilderPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("partners")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    console.error("UtmBuilderPage: failed to load partners", error);
  }

  const partners: Partner[] = (data as Partner[] | null) ?? [];

  return (
    <div className="container max-w-none flex w-full flex-col items-start gap-8 bg-default-background py-12">
      <div className="flex w-full flex-col items-start gap-2">
        <span className="text-heading-1 font-heading-1 text-default-font">
          UTM Builder
        </span>
        <span className="text-body font-body text-subtext-color">
          Generate trackable UTM links for partners to promote services and
          track commissions.
        </span>
      </div>

      {error ? (
        <Alert
          variant="error"
          title="Couldn't load partners"
          description={error.message}
        />
      ) : null}

      <div className="w-full max-w-2xl mx-auto">
        <UtmBuilderForm partners={partners} />
      </div>
    </div>
  );
}

import React from "react";
import { loadClassificationConfig } from "@/src/lib/booqable/classification-config";
import { classificationUserFacingError } from "@/src/lib/booqable/classification-config";
import { DataLoadError } from "@/src/components/DataLoadError";
import { ClassificationConfigPanel } from "./_components/ClassificationConfigPanel";
import { RetryLoadButton } from "./_components/RetryLoadButton";

export default async function WorkshopClassificationPage() {
  const { config, error } = await loadClassificationConfig();

  return (
    <div className="container max-w-none flex w-full flex-col items-start gap-6 bg-default-background py-12">
      <div className="flex w-full flex-col items-start gap-2">
        <h1 className="text-heading-1 font-heading-1 text-default-font">
          Classification mapping
        </h1>
        <p className="text-body font-body text-subtext-color">
          Approve the ProductGroup UUID allowlist and Setup Category mappings.
          Labels stay display-only. Broad configuration review stays on until
          every category is fixture-proven.
        </p>
      </div>

      {error ? (
        <div className="flex w-full flex-col items-start gap-2">
          <DataLoadError
            title="Couldn't load classification configuration"
            message={classificationUserFacingError(
              error,
              "We couldn't load classification configuration. Please try again.",
            )}
          />
          <RetryLoadButton />
        </div>
      ) : (
        <ClassificationConfigPanel
          source={config.source}
          active={config.active}
          history={config.history}
        />
      )}
    </div>
  );
}

import React from "react";
import { notFound } from "next/navigation";
import { FeatherAlertTriangle } from "@subframe/core";
import { Alert } from "@/ui/components/Alert";
import { workshopData } from "@/src/lib/workshop";
import { WorkshopTask } from "../_components/WorkshopTask";

export default async function WorkshopTaskPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  const { item, error } = await workshopData.loadWorkshopTaskDetail(taskId);

  if (error) {
    return (
      <div className="container max-w-none flex w-full flex-col items-start gap-8 bg-default-background py-12">
        <Alert
          variant="error"
          icon={<FeatherAlertTriangle />}
          title="Couldn't load this task"
          description={error}
        />
      </div>
    );
  }

  if (!item) {
    notFound();
  }

  return (
    <div className="container max-w-none flex w-full flex-col items-start gap-8 bg-default-background py-12">
      <WorkshopTask detail={item} />
    </div>
  );
}

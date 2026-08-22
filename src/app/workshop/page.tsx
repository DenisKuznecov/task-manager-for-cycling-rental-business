import React from "react";
import { DataLoadError } from "@/src/components/DataLoadError";
import { workshopData, workshopDomain } from "@/src/lib/workshop";
import { WorkshopQueue } from "./_components/WorkshopQueue";
import { shouldRenderWorkshopQueue } from "./_components/workshop-ui";

export default async function WorkshopPage({
  searchParams,
}: {
  searchParams: Promise<{
    filter?: string;
    query?: string;
    page?: string;
  }>;
}) {
  const {
    filter: filterParam,
    query: queryParam,
    page: pageParam,
  } = await searchParams;

  const filter = workshopDomain.resolveWorkshopQueueFilter(filterParam);
  const query = queryParam ?? "";
  const parsedPage = Number(pageParam);
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const { tasks, count, error } = await workshopData.loadWorkshopTasks({
    filter,
    query,
    page,
  });
  const { health, error: healthError } =
    await workshopData.loadWorkshopSyncHealth();
  const totalPages = Math.max(
    1,
    Math.ceil(count / workshopData.WORKSHOP_PAGE_SIZE),
  );

  return (
    <div className="container max-w-none flex w-full flex-col items-start gap-8 bg-default-background py-12">
      <div className="flex w-full flex-col items-start gap-2">
        <span className="text-heading-1 font-heading-1 text-default-font">
          Task Management
        </span>
        <span className="text-body font-body text-subtext-color">
          Bike preparation, pickup, return, and storage.
        </span>
      </div>

      {healthError ? (
        <DataLoadError
          title="Couldn't load sync status"
          message={healthError}
        />
      ) : null}

      {shouldRenderWorkshopQueue(error) ? (
        <WorkshopQueue
          tasks={tasks}
          currentPage={page}
          totalPages={totalPages}
          query={query}
          filter={filter}
          health={health}
        />
      ) : (
        <DataLoadError
          title="Couldn't load workshop tasks"
          message={error ?? "Couldn't load workshop tasks"}
        />
      )}
    </div>
  );
}

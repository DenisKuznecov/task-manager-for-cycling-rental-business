import React from "react";
import { DataLoadError } from "@/src/components/DataLoadError";
import { workshopData, workshopDomain } from "@/src/lib/workshop";
import { WorkshopQueue } from "./_components/WorkshopQueue";
import {
  WorkshopPageSubtitle,
  WorkshopTabletModeSwitch,
} from "./_components/WorkshopTabletModeSwitch";
import { shouldRenderWorkshopQueue } from "./_components/workshop-ui";

export default async function WorkshopPage({
  searchParams,
}: {
  searchParams: Promise<{
    filter?: string;
    status?: string;
    query?: string;
    page?: string;
  }>;
}) {
  const {
    filter: filterParam,
    status: statusParam,
    query: queryParam,
    page: pageParam,
  } = await searchParams;

  const filter = workshopDomain.resolveWorkshopQueueFilter(filterParam);
  const status = workshopDomain.resolveWorkshopQueueStatus(statusParam);
  const query = queryParam ?? "";
  const parsedPage = Number(pageParam);
  const requestedPage =
    Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const [tasksResult, countsResult, healthResult] = await Promise.all([
    workshopData.loadWorkshopTasks({
      filter,
      status,
      query,
      page: requestedPage,
    }),
    workshopData.loadWorkshopTaskStatusCounts({ filter, query }),
    workshopData.loadWorkshopSyncHealth(),
  ]);

  const { tasks, count, page, error } = tasksResult;
  const { counts, error: countsError } = countsResult;
  const { health, error: healthError } = healthResult;
  const loadError = error ?? countsError;
  const totalPages = Math.max(
    1,
    Math.ceil(count / workshopData.WORKSHOP_PAGE_SIZE),
  );

  const heading = (
    <div className="flex w-full min-w-0 flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 flex-col items-start gap-2">
        <span className="text-heading-1 font-heading-1 text-default-font">
          Workshop
        </span>
        <WorkshopPageSubtitle />
      </div>
      <WorkshopTabletModeSwitch />
    </div>
  );

  return (
    <div className="container max-w-none flex w-full flex-col items-start gap-6 bg-default-background pt-4 pb-12">
      {healthError ? (
        <DataLoadError
          title="Couldn't load sync status"
          message={healthError}
        />
      ) : null}

      {shouldRenderWorkshopQueue(loadError) ? (
        <WorkshopQueue
          heading={heading}
          tasks={tasks}
          currentPage={page}
          totalPages={totalPages}
          query={query}
          filter={filter}
          status={status}
          statusCounts={counts}
          health={health}
        />
      ) : (
        <>
          {heading}
          <DataLoadError
            title="Couldn't load workshop tasks"
            message={loadError ?? "Couldn't load workshop tasks"}
          />
        </>
      )}
    </div>
  );
}

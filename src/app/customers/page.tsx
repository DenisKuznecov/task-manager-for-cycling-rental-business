import React from "react";
import { DataLoadError } from "@/src/components/DataLoadError";
import {
  CUSTOMERS_LANDING_PAGE_SIZE,
  loadCustomersLandingPage,
} from "@/src/lib/customer-landing/load-status-page";
import { CustomersLandingTable } from "./_components/CustomersLandingTable";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
  }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const { customers, count, error } = await loadCustomersLandingPage(page);
  const totalPages = Math.ceil(count / CUSTOMERS_LANDING_PAGE_SIZE);

  return (
    <div className="container max-w-none flex w-full flex-col items-start gap-8 bg-default-background py-12">
      <div className="flex w-full flex-col items-start gap-2">
        <span className="text-heading-1 font-heading-1 text-default-font">
          Customers
        </span>
        <span className="text-body font-body text-subtext-color">
          Destination landing status for every customer.
        </span>
      </div>

      {error ? (
        <DataLoadError title="Couldn't load customers" message={error} />
      ) : null}

      <CustomersLandingTable
        customers={customers}
        currentPage={page}
        totalPages={totalPages}
      />
    </div>
  );
}

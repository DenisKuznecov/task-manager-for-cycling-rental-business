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
    query?: string;
  }>;
}) {
  const { page: pageParam, query: queryParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const query = typeof queryParam === "string" ? queryParam.trim() : "";
  const { customers, count, error } = await loadCustomersLandingPage(page, query);
  const totalPages = Math.ceil(count / CUSTOMERS_LANDING_PAGE_SIZE);

  return (
    <div className="container max-w-none flex w-full flex-col items-start gap-8 bg-default-background py-12">
      <div className="flex w-full flex-col items-start gap-2">
        <span className="text-heading-1 font-heading-1 text-default-font">
          Customers
        </span>
        <span className="text-body font-body text-subtext-color">
          Customers synchronization status page. When a user is created or updated in Booqable their data is synced into Google Contacts, Holded and Mailchimp.
        </span>
      </div>

      {error ? (
        <DataLoadError title="Couldn't load customers" message={error} />
      ) : null}

      <CustomersLandingTable
        customers={customers}
        currentPage={page}
        totalPages={totalPages}
        query={query}
      />
    </div>
  );
}

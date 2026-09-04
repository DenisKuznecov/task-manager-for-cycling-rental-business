import React from "react";
import { redirect } from "next/navigation";
import { DataLoadError } from "@/src/components/DataLoadError";
import {
  CUSTOMERS_DIRECTORY_PAGE_SIZE,
  loadCustomerDirectoryPage,
} from "@/src/lib/customers";
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
  const requestedPage = Number(pageParam);
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const query = typeof queryParam === "string" ? queryParam.trim() : "";
  const { customers, count, error } = await loadCustomerDirectoryPage(page, query);
  const totalPages = Math.ceil(count / CUSTOMERS_DIRECTORY_PAGE_SIZE);

  if (!error && totalPages > 0 && page > totalPages) {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    params.set("page", String(totalPages));
    redirect(`/customers?${params.toString()}`);
  }

  return (
    <div className="container max-w-none flex w-full flex-col items-start gap-8 bg-default-background py-12">
      <div className="flex w-full flex-col items-start gap-2">
        <span className="text-heading-1 font-heading-1 text-default-font">
          Customers
        </span>
        <span className="text-body font-body text-subtext-color">
          Find a customer and view their contact, address, orders, bike fits, sync status, and partner history.
        </span>
      </div>

      {error ? (
        <DataLoadError
          title="Couldn't load customers"
          message={
            process.env.NODE_ENV === "development"
              ? error
              : "We couldn't load the customer directory. Please try again."
          }
        />
      ) : (
        <CustomersLandingTable
          customers={customers}
          currentPage={page}
          totalPages={totalPages}
          query={query}
        />
      )}
    </div>
  );
}

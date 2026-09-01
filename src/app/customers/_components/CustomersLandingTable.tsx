"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Badge } from "@/ui/components/Badge";
import { Table } from "@/ui/components/Table";
import { TextField } from "@/ui/components/TextField";
import { TablePagination } from "@/src/components/TablePagination";
import type {
  CustomerLandingListRow,
  DestCell,
} from "@/src/lib/customer-landing/status-rows";

interface CustomersLandingTableProps {
  customers: CustomerLandingListRow[];
  currentPage: number;
  totalPages: number;
  query: string;
}

const SEARCH_DEBOUNCE_MS = 300;

function DestStatusCell({ cell }: { cell: DestCell }) {
  if (cell.status === "green") {
    return <Badge variant="success">Landed</Badge>;
  }
  if (cell.status === "red") {
    return (
      <div className="flex flex-col items-start gap-1 py-2">
        <Badge variant="error">Failed</Badge>
        {cell.error ? (
          <span className="text-caption font-caption text-error-700">
            {cell.error}
          </span>
        ) : null}
      </div>
    );
  }
  return <Badge variant="neutral">Not landed</Badge>;
}

export function CustomersLandingTable({
  customers,
  currentPage,
  totalPages,
  query,
}: CustomersLandingTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(query);

  useEffect(() => {
    setSearch(query);
  }, [query]);

  const buildHref = (nextQuery: string, nextPage: number) => {
    const params = new URLSearchParams();
    const trimmed = nextQuery.trim();
    if (trimmed) params.set("query", trimmed);
    if (nextPage !== 1) params.set("page", String(nextPage));
    const queryString = params.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
  };

  useEffect(() => {
    if (search === query) return;

    const handle = setTimeout(() => {
      router.push(buildHref(search, 1));
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, query, pathname, router]);

  return (
    <div className="flex w-full flex-col items-start gap-6">
      <div className="flex w-full items-center justify-end gap-2">
        <TextField label="" helpText="">
          <TextField.Input
            placeholder="Search by name"
            value={search}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setSearch(event.target.value)
            }
          />
        </TextField>
      </div>
      <div className="flex w-full flex-col items-start gap-6 overflow-hidden overflow-x-auto mobile:overflow-auto mobile:max-w-full">
        {customers.length === 0 ? (
          <div className="flex w-full flex-col items-center justify-center gap-2 rounded-md border border-solid border-neutral-border bg-default-background py-12">
            <span className="text-body-bold font-body-bold text-default-font text-center">
              No customers found
            </span>
            <span className="text-body font-body text-subtext-color text-center">
              {query.trim()
                ? "Try adjusting your search."
                : "This is not a full customer directory. Customers appear here after they land."}
            </span>
          </div>
        ) : (
          <Table
            header={
              <Table.HeaderRow>
                <Table.HeaderCell>Name</Table.HeaderCell>
                <Table.HeaderCell>Email</Table.HeaderCell>
                <Table.HeaderCell>Phone</Table.HeaderCell>
                <Table.HeaderCell>Birthday</Table.HeaderCell>
                <Table.HeaderCell>Address</Table.HeaderCell>
                <Table.HeaderCell>Google</Table.HeaderCell>
                <Table.HeaderCell>Holded</Table.HeaderCell>
                <Table.HeaderCell>Mailchimp</Table.HeaderCell>
              </Table.HeaderRow>
            }
          >
            {customers.map((customer) => (
              <Table.Row key={customer.id}>
                <Table.Cell>
                  <span className="whitespace-nowrap text-body-bold font-body-bold text-default-font">
                    {customer.name}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <span className="whitespace-nowrap text-body font-body text-neutral-500">
                    {customer.email}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <span className="whitespace-nowrap text-body font-body text-neutral-500">
                    {customer.phone}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <span className="whitespace-nowrap text-body font-body text-neutral-500">
                    {customer.birthday}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <span className="whitespace-nowrap text-body font-body text-neutral-500">
                    {customer.address}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <DestStatusCell cell={customer.google} />
                </Table.Cell>
                <Table.Cell>
                  <DestStatusCell cell={customer.holded} />
                </Table.Cell>
                <Table.Cell>
                  <DestStatusCell cell={customer.mailchimp} />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table>
        )}
      </div>
      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(page) => {
          router.push(buildHref(query, page));
        }}
      />
    </div>
  );
}

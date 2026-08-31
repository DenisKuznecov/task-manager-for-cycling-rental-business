"use client";

import React, { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FeatherAlertTriangle } from "@subframe/core";
import { Alert } from "@/ui/components/Alert";
import { Badge } from "@/ui/components/Badge";
import { Button } from "@/ui/components/Button";
import { Table } from "@/ui/components/Table";
import { TablePagination } from "@/src/components/TablePagination";
import { landLocalCustomerAction } from "@/src/lib/customer-landing/land-local-customer-action";
import type {
  CustomerLandingListRow,
  DestCell,
} from "@/src/lib/customer-landing/status-rows";

interface CustomersLandingTableProps {
  customers: CustomerLandingListRow[];
  currentPage: number;
  totalPages: number;
}

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
}: CustomersLandingTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [isUploading, startUploading] = useTransition();

  const handleUpload = (customerId: string) => {
    if (isUploading) return;
    setUploadError(null);
    setUploadingId(customerId);
    startUploading(async () => {
      try {
        const result = await landLocalCustomerAction(customerId);
        if (!result.ok) {
          setUploadError(result.error);
          return;
        }
        router.refresh();
      } catch (error) {
        setUploadError(
          error instanceof Error ? error.message : "Could not upload customer.",
        );
      } finally {
        setUploadingId(null);
      }
    });
  };

  return (
    <div className="flex w-full flex-col items-start gap-6">
      {uploadError ? (
        <Alert
          variant="error"
          icon={<FeatherAlertTriangle />}
          title="Couldn't upload customer"
          description={uploadError}
        />
      ) : null}
      <div className="flex w-full flex-col items-start gap-6 overflow-hidden overflow-x-auto mobile:overflow-auto mobile:max-w-full">
        {customers.length === 0 ? (
          <div className="flex w-full flex-col items-center justify-center gap-2 rounded-md border border-solid border-neutral-border bg-default-background py-12">
            <span className="text-body-bold font-body-bold text-default-font text-center">
              No customers found
            </span>
          </div>
        ) : (
          <Table
            header={
              <Table.HeaderRow>
                <Table.HeaderCell>Name</Table.HeaderCell>
                <Table.HeaderCell>Google</Table.HeaderCell>
                <Table.HeaderCell>Holded</Table.HeaderCell>
                <Table.HeaderCell>Mailchimp</Table.HeaderCell>
                <Table.HeaderCell />
              </Table.HeaderRow>
            }
          >
            {customers.map((customer) => (
              <Table.Row key={customer.id}>
                <Table.Cell>
                  <div className="flex items-center gap-2">
                    <span className="whitespace-nowrap text-body-bold font-body-bold text-default-font">
                      {customer.name}
                    </span>
                    {customer.isLocalOnly ? (
                      <Badge variant="neutral">Not from Booqable</Badge>
                    ) : null}
                  </div>
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
                <Table.Cell>
                  {customer.isLocalOnly ? (
                    <Button
                      size="small"
                      variant="neutral-secondary"
                      loading={isUploading && uploadingId === customer.id}
                      disabled={isUploading}
                      onClick={() => handleUpload(customer.id)}
                    >
                      Upload
                    </Button>
                  ) : null}
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
          const params = new URLSearchParams();
          if (page !== 1) params.set("page", String(page));
          const queryString = params.toString();
          router.push(queryString ? `${pathname}?${queryString}` : pathname);
        }}
      />
    </div>
  );
}

import React from "react";
import { SkeletonText } from "@/ui/components/SkeletonText";
import { Table } from "@/ui/components/Table";

const ROW_COUNT = 8;

export function CustomersLandingTableSkeleton() {
  return (
    <Table
      header={
        <Table.HeaderRow>
          <Table.HeaderCell>Name</Table.HeaderCell>
          <Table.HeaderCell>Email</Table.HeaderCell>
          <Table.HeaderCell>Phone</Table.HeaderCell>
          <Table.HeaderCell>Birthday</Table.HeaderCell>
        </Table.HeaderRow>
      }
    >
      {Array.from({ length: ROW_COUNT }).map((_, index) => (
        <Table.Row key={index}>
          {Array.from({ length: 4 }).map((__, cellIndex) => (
            <Table.Cell key={cellIndex}>
              <SkeletonText
                size="default"
                className={cellIndex === 0 ? "max-w-32" : "max-w-40"}
              />
            </Table.Cell>
          ))}
        </Table.Row>
      ))}
    </Table>
  );
}

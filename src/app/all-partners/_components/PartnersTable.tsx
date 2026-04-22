"use client";

import React from "react";
import Link from "next/link";
import { Table } from "@/ui/components/Table";
import { FeatherArrowRight } from "@subframe/core";

export type PartnerListRow = {
  id: string;
  name: string | null;
  slug: string | null;
  location: string | null;
};

interface PartnersTableProps {
  rows: PartnerListRow[];
}

export function PartnersTable({ rows }: PartnersTableProps) {
  if (rows.length === 0) {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-2 rounded-md border border-solid border-neutral-border bg-default-background py-24">
        <span className="text-heading-2 font-heading-2 text-default-font text-center">
          No partners yet
        </span>
        <span className="text-body font-body text-subtext-color text-center">
          Partners you create will appear here.
        </span>
      </div>
    );
  }

  return (
    <Table
      header={
        <Table.HeaderRow>
          <Table.HeaderCell>Name</Table.HeaderCell>
          <Table.HeaderCell>Location</Table.HeaderCell>
          <Table.HeaderCell>Slug</Table.HeaderCell>
          <Table.HeaderCell />
        </Table.HeaderRow>
      }
    >
      {rows.map((partner) => {
        // Slugs are stored in the DB with a leading slash; strip it for URL segments.
        const segment = (partner.slug ?? "").replace(/^\//, "");
        const href = segment ? `/partner/${segment}/overview` : null;
        return (
          <Table.Row key={partner.id}>
            <Table.Cell>
              <span className="whitespace-nowrap text-body-bold font-body-bold text-default-font">
                {partner.name ?? "Untitled partner"}
              </span>
            </Table.Cell>
            <Table.Cell>
              <span className="text-body font-body text-neutral-500">
                {partner.location ?? "—"}
              </span>
            </Table.Cell>
            <Table.Cell>
              <span className="text-body font-body text-neutral-500">
                {partner.slug ?? "—"}
              </span>
            </Table.Cell>
            <Table.Cell>
              <div className="flex grow shrink-0 basis-0 items-center justify-end">
                {href ? (
                  <Link
                    href={href}
                    className="inline-flex items-center gap-1 text-body-bold font-body-bold text-brand-primary hover:underline"
                  >
                    Open
                    <FeatherArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <span className="text-body font-body text-subtext-color">
                    No slug
                  </span>
                )}
              </div>
            </Table.Cell>
          </Table.Row>
        );
      })}
    </Table>
  );
}

"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Tabs } from "@/ui/components/Tabs";

const TABS = [
  { label: "Overview", segment: "overview" },
  { label: "Bookings", segment: "bookings" },
  { label: "Customers", segment: "customers" },
] as const;

interface PartnerTabsProps {
  basePath?: string;
}

export function PartnerTabs({ basePath = "/partner" }: PartnerTabsProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <Tabs>
      {TABS.map((tab) => {
        const href = `${basePath}/${tab.segment}`;
        const active =
          pathname === href || pathname?.startsWith(`${href}/`);
        return (
          <Tabs.Item
            key={href}
            active={active}
            onClick={() => router.push(href)}
          >
            {tab.label}
          </Tabs.Item>
        );
      })}
    </Tabs>
  );
}

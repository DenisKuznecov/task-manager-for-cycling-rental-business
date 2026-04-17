"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Tabs } from "@/ui/components/Tabs";

const TABS = [
  { label: "Overview", href: "/partner/overview" },
  { label: "Bookings", href: "/partner/bookings" },
  { label: "Customers", href: "/partner/customers" },
] as const;

export function PartnerTabs() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <Tabs>
      {TABS.map((tab) => {
        const active =
          pathname === tab.href || pathname?.startsWith(`${tab.href}/`);
        return (
          <Tabs.Item
            key={tab.href}
            active={active}
            onClick={() => router.push(tab.href)}
          >
            {tab.label}
          </Tabs.Item>
        );
      })}
    </Tabs>
  );
}

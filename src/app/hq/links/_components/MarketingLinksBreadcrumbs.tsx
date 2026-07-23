"use client";

import React from "react";
import Link from "next/link";
import { Breadcrumbs } from "@/ui/components/Breadcrumbs";

export function MarketingLinksBreadcrumbs() {
  return (
    <Breadcrumbs>
      <Link href="/hq">
        <Breadcrumbs.Item>Headquarters</Breadcrumbs.Item>
      </Link>
      <Breadcrumbs.Divider />
      <Breadcrumbs.Item active={true}>Marketing Links</Breadcrumbs.Item>
    </Breadcrumbs>
  );
}

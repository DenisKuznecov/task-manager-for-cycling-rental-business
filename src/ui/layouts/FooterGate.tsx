"use client";

import { usePathname } from "next/navigation";
import { isPublicRoute } from "@/src/utils/auth/public-routes";
import { AppFooter } from "./AppFooter";

export function FooterGate() {
  const pathname = usePathname();
  if (isPublicRoute(pathname)) return null;
  return <AppFooter />;
}

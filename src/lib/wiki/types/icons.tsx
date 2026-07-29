"use client";

import type { ComponentType } from "react";
import {
  FeatherBarChart,
  FeatherBike,
  FeatherBook,
  FeatherBookOpen,
  FeatherBox,
  FeatherCalendar,
  FeatherCheckCircle,
  FeatherClipboard,
  FeatherCog,
  FeatherCreditCard,
  FeatherDollarSign,
  FeatherFileText,
  FeatherFolder,
  FeatherFolderOpen,
  FeatherGlobe,
  FeatherHelpCircle,
  FeatherImage,
  FeatherLifeBuoy,
  FeatherLink,
  FeatherList,
  FeatherMail,
  FeatherPackage,
  FeatherPrinter,
  FeatherSettings,
  FeatherShield,
  FeatherSmartphone,
  FeatherTag,
  FeatherTool,
  FeatherUsers,
  FeatherWrench,
} from "@subframe/core";
import {
  DEFAULT_WIKI_CATEGORY_ICON,
  UNCATEGORIZED_CATEGORY_ICON,
  type WikiCategoryIcon,
} from "@/src/lib/wiki/types/records";

/** Subframe Feather icons render as span wrappers, not raw SVGs. */
type FeatherIcon = ComponentType<{ className?: string }>;

/**
 * Named imports only — keeps the allowlist explicit and avoids pulling the
 * entire Feather catalog into the bundle via dynamic lookup.
 */
export const WIKI_CATEGORY_ICON_MAP: Record<WikiCategoryIcon, FeatherIcon> = {
  FeatherBarChart,
  FeatherBike,
  FeatherBook,
  FeatherBookOpen,
  FeatherBox,
  FeatherCalendar,
  FeatherCheckCircle,
  FeatherClipboard,
  FeatherCog,
  FeatherCreditCard,
  FeatherDollarSign,
  FeatherFileText,
  FeatherFolder,
  FeatherFolderOpen,
  FeatherGlobe,
  FeatherHelpCircle,
  FeatherImage,
  FeatherLifeBuoy,
  FeatherLink,
  FeatherList,
  FeatherMail,
  FeatherPackage,
  FeatherPrinter,
  FeatherSettings,
  FeatherShield,
  FeatherSmartphone,
  FeatherTag,
  FeatherTool,
  FeatherUsers,
  FeatherWrench,
};

export function getWikiCategoryIconComponent(
  icon: WikiCategoryIcon | null | undefined,
): FeatherIcon {
  if (icon && icon in WIKI_CATEGORY_ICON_MAP) {
    return WIKI_CATEGORY_ICON_MAP[icon];
  }
  return WIKI_CATEGORY_ICON_MAP[DEFAULT_WIKI_CATEGORY_ICON];
}

export function getUncategorizedIconComponent(): FeatherIcon {
  return WIKI_CATEGORY_ICON_MAP[UNCATEGORIZED_CATEGORY_ICON];
}

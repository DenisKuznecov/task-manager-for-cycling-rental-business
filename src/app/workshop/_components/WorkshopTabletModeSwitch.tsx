"use client";

import React from "react";
import { Switch } from "@/ui/components/Switch";
import { useWorkshopTabletMode } from "./WorkshopTabletModeProvider";

export function WorkshopPageSubtitle() {
  const { tabletMode } = useWorkshopTabletMode();
  return (
    <span
      className={
        tabletMode
          ? "text-heading-3 font-heading-3 text-subtext-color"
          : "text-body font-body text-subtext-color"
      }
    >
      Bike preparation, pickup, return, and storage.
    </span>
  );
}

export function WorkshopTabletModeSwitch() {
  const { tabletMode, setTabletMode } = useWorkshopTabletMode();

  return (
    <div className="flex shrink-0 items-center gap-3">
      <span className="text-caption-bold font-caption-bold text-default-font">
        Tablet mode
      </span>
      <Switch checked={tabletMode} onCheckedChange={setTabletMode} />
    </div>
  );
}

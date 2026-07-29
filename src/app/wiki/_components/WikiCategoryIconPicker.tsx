"use client";

import React from "react";
import { IconWithBackground } from "@/ui/components/IconWithBackground";
import {
  WIKI_CATEGORY_ICONS,
  type WikiCategoryIcon,
} from "@/src/lib/wiki/types/records";
import { getWikiCategoryIconComponent } from "@/src/lib/wiki/types/icons";

interface WikiCategoryIconPickerProps {
  value: WikiCategoryIcon;
  onChange: (icon: WikiCategoryIcon) => void;
  disabled?: boolean;
}

export function WikiCategoryIconPicker({
  value,
  onChange,
  disabled = false,
}: WikiCategoryIconPickerProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-caption-bold font-caption-bold text-default-font">
        Icon
      </span>
      <div className="grid max-h-48 grid-cols-6 gap-2 overflow-y-auto rounded-md border border-solid border-neutral-border p-2">
        {WIKI_CATEGORY_ICONS.map((iconName) => {
          const Icon = getWikiCategoryIconComponent(iconName);
          const selected = value === iconName;
          return (
            <button
              key={iconName}
              type="button"
              disabled={disabled}
              aria-label={iconName.replace(/^Feather/, "")}
              aria-pressed={selected}
              onClick={() => onChange(iconName)}
              className={`flex items-center justify-center rounded-md p-1.5 transition-colors ${
                selected
                  ? "ring-2 ring-brand-600 bg-brand-50"
                  : "hover:bg-neutral-50"
              } disabled:opacity-50`}
            >
              <IconWithBackground
                variant="neutral"
                size="small"
                square
                icon={<Icon />}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

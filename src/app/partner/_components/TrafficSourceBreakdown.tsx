"use client";

import React, { useMemo, useState } from "react";
import { Accordion } from "@/ui/components/Accordion";
import { Badge } from "@/ui/components/Badge";
import { Progress } from "@/ui/components/Progress";
import { ToggleGroup } from "@/ui/components/ToggleGroup";
import type { PartnerUtmBreakdown, PartnerUtmBreakdownRow } from "./types";

const MAX_NAMED_ROWS = 6;

type BreakdownDimension = "source" | "medium";

/** "telegram_public" -> "Telegram public" */
function prettifyLabel(label: string): string {
  const spaced = label.replace(/[_-]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

interface DisplayRow {
  key: string;
  label: string;
  views: number;
  pct: number;
  muted: boolean;
}

/**
 * Turns raw breakdown rows (sorted by views desc, null label = no UTM) into
 * display rows: top N named values, an "Other" rollup for the rest, and a
 * muted "Direct / other" row for UTM-less traffic at the bottom.
 */
function buildDisplayRows(rows: PartnerUtmBreakdownRow[]): DisplayRow[] {
  const named = rows.filter((row) => row.label !== null && row.views > 0);
  const directViews = rows
    .filter((row) => row.label === null)
    .reduce((sum, row) => sum + row.views, 0);
  const totalViews =
    named.reduce((sum, row) => sum + row.views, 0) + directViews;
  if (totalViews === 0) return [];

  const pctOf = (views: number) => Math.round((views / totalViews) * 100);

  const display: DisplayRow[] = named
    .slice(0, MAX_NAMED_ROWS)
    .map((row) => ({
      key: `utm:${row.label}`,
      label: prettifyLabel(row.label as string),
      views: row.views,
      pct: pctOf(row.views),
      muted: false,
    }));

  const otherViews = named
    .slice(MAX_NAMED_ROWS)
    .reduce((sum, row) => sum + row.views, 0);
  if (otherViews > 0) {
    display.push({
      key: "other",
      label: "Other",
      views: otherViews,
      pct: pctOf(otherViews),
      muted: false,
    });
  }

  if (directViews > 0) {
    display.push({
      key: "direct",
      label: "Direct / other",
      views: directViews,
      pct: pctOf(directViews),
      muted: true,
    });
  }

  return display;
}

interface TrafficSourceBreakdownProps {
  breakdown: PartnerUtmBreakdown;
}

/**
 * Collapsible "Views by source" block: splits the promo page's views by
 * utm_source / utm_medium (toggleable) with per-value share bars. Collapsed
 * by default with a "Top: <value>" teaser badge in the header.
 */
export function TrafficSourceBreakdown({
  breakdown,
}: TrafficSourceBreakdownProps) {
  const [dimension, setDimension] = useState<BreakdownDimension>("source");

  const rows = useMemo(
    () => buildDisplayRows(breakdown[dimension]),
    [breakdown, dimension],
  );
  const topNamed = rows.find((row) => !row.muted && row.key !== "other") ?? null;

  return (
    <Accordion
      className="w-full rounded-md border border-solid border-neutral-border bg-default-background"
      trigger={
        <div className="flex w-full items-center gap-3 px-5 py-4">
          <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
            <span className="text-body-bold font-body-bold text-default-font">
              Views by source
            </span>
            <span className="text-caption font-caption text-subtext-color">
              Where your promo page visitors come from
            </span>
          </div>
          {topNamed ? (
            <Badge variant="neutral" className="mobile:hidden">
              Top: {topNamed.label}
            </Badge>
          ) : null}
          <Accordion.Chevron />
        </div>
      }
    >
      <div className="flex w-full flex-col items-start gap-4 border-t border-solid border-neutral-border px-5 py-5">
        <ToggleGroup
          value={dimension}
          onValueChange={(value) => {
            // Radix emits "" when the user clicks the already-selected item;
            // ignore that so one option is always active.
            if (!value) return;
            setDimension(value as BreakdownDimension);
          }}
        >
          <ToggleGroup.Item value="source" icon={null}>
            Source
          </ToggleGroup.Item>
          <ToggleGroup.Item value="medium" icon={null}>
            Medium
          </ToggleGroup.Item>
        </ToggleGroup>

        {rows.length === 0 ? (
          <span className="text-body font-body text-subtext-color">
            No page views in this period yet.
          </span>
        ) : (
          <div className="flex w-full flex-col gap-3">
            {rows.map((row) => (
              <div key={row.key} className="flex w-full items-center gap-3">
                <span
                  className={`w-36 truncate text-caption-bold font-caption-bold mobile:w-24 ${
                    row.muted ? "text-subtext-color" : "text-default-font"
                  }`}
                  title={row.label}
                >
                  {row.label}
                </span>
                <Progress className="flex-1" value={row.pct} />
                <span
                  className={`w-24 whitespace-nowrap text-right text-caption font-caption mobile:w-20 ${
                    row.muted ? "text-subtext-color" : "text-default-font"
                  }`}
                >
                  {row.views.toLocaleString("en-IE")} · {row.pct}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Accordion>
  );
}

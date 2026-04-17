"use client";

import React from "react";
import { AreaChart } from "@/ui/components/AreaChart";
import { Button } from "@/ui/components/Button";
import { DropdownMenu } from "@/ui/components/DropdownMenu";
import { FeatherChevronDown } from "@subframe/core";
import * as SubframeCore from "@subframe/core";

const SALES_DATA = [
  { Year: "2015", "Your Commission": 120, Orders: 110, "Total Order Value": 100 },
  { Year: "2016", "Your Commission": 130, Orders: 95, "Total Order Value": 105 },
  { Year: "2017", "Your Commission": 115, Orders: 105, "Total Order Value": 110 },
  { Year: "2018", "Your Commission": 125, Orders: 120, "Total Order Value": 90 },
  { Year: "2019", "Your Commission": 110, Orders: 130, "Total Order Value": 85 },
  { Year: "2020", "Your Commission": 135, Orders: 100, "Total Order Value": 95 },
  { Year: "2021", "Your Commission": 105, Orders: 115, "Total Order Value": 120 },
  { Year: "2022", "Your Commission": 140, Orders: 125, "Total Order Value": 130 },
];

export function SalesTrends() {
  return (
    <div className="flex w-full flex-col items-start gap-6">
      <div className="flex w-full items-center gap-2">
        <span className="grow shrink-0 basis-0 text-heading-3 font-heading-3 text-default-font">
          Sales Trends
        </span>
        <SubframeCore.DropdownMenu.Root>
          <SubframeCore.DropdownMenu.Trigger asChild={true}>
            <Button
              variant="neutral-secondary"
              iconRight={<FeatherChevronDown />}
              onClick={() => {}}
            >
              Past month
            </Button>
          </SubframeCore.DropdownMenu.Trigger>
          <SubframeCore.DropdownMenu.Portal>
            <SubframeCore.DropdownMenu.Content
              side="bottom"
              align="end"
              sideOffset={4}
              asChild={true}
            >
              <DropdownMenu>
                <DropdownMenu.DropdownItem icon={null}>
                  Past week
                </DropdownMenu.DropdownItem>
                <DropdownMenu.DropdownItem icon={null}>
                  Past month
                </DropdownMenu.DropdownItem>
                <DropdownMenu.DropdownItem icon={null}>
                  All-time
                </DropdownMenu.DropdownItem>
              </DropdownMenu>
            </SubframeCore.DropdownMenu.Content>
          </SubframeCore.DropdownMenu.Portal>
        </SubframeCore.DropdownMenu.Root>
      </div>
      <AreaChart
        categories={["Total Order Value", "Orders", "Your Commission"]}
        data={SALES_DATA}
        index={"Year"}
      />
    </div>
  );
}

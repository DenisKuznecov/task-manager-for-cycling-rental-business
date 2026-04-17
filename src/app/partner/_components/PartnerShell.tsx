"use client";

import React from "react";
import { Button } from "@/ui/components/Button";
import { PartnerTabs } from "./PartnerTabs";

interface PartnerShellProps {
  children: React.ReactNode;
}

export function PartnerShell({ children }: PartnerShellProps) {
  return (
    <div className="container max-w-none flex h-full w-full flex-col items-start gap-8 bg-default-background py-12">
      <div className="flex w-full flex-col items-start justify-end relative">
        <div className="flex flex-col items-start gap-4 rounded-lg bg-default-background pl-6 pr-4 py-4 shadow-lg absolute left-6 -bottom-6 z-10">
          <span className="text-heading-2 font-heading-2 text-default-font m-0">
            Hotel Valdemossa
          </span>
          <span className="font-['Geist'] text-[13px] font-[400] leading-[17px] text-brand-primary m-0">
            Partner Network
          </span>
        </div>
        <div className="flex h-96 w-full flex-none flex-col items-start gap-2 overflow-hidden rounded-md relative">
          <img
            className="min-h-[0px] w-full grow shrink-0 basis-0 object-cover"
            src="https://res.cloudinary.com/subframe/image/upload/v1776354243/uploads/36440/pbzs0xrxp7yk5szwwej2.jpg"
            alt="Hotel Valdemossa"
          />
          <div className="flex items-start absolute inset-0 bg-gradient-to-b from-[rgba(0,47,80,0.3)] to-[rgba(28,70,106,0.8)]" />
        </div>
      </div>
      <div className="flex w-full flex-col items-start gap-6">
        <div className="flex w-full flex-wrap items-center gap-2 mobile:flex-col mobile:flex-nowrap mobile:items-start mobile:justify-start mobile:gap-2">
          <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
            <span className="w-full text-heading-2 font-heading-2 text-default-font">
              Sales Report
            </span>
            <span className="text-body font-body text-subtext-color">
              Overview of your bike rental performance and customers
            </span>
          </div>
          <Button
            className="mobile:h-8 mobile:w-full mobile:flex-none"
            variant="neutral-secondary"
            onClick={() => {}}
          >
            Download
          </Button>
        </div>
        <PartnerTabs />
      </div>
      {children}
    </div>
  );
}

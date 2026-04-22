"use client";
/*
 * Documentation:
 * Badge — https://app.subframe.com/ee500777c863/library?component=Badge_97bdb082-1124-4dd7-a335-b14b822d0157
 */

import React from "react";
import * as SubframeCore from "@subframe/core";
import * as SubframeUtils from "../utils";

interface BadgeRootProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "draft"
    | "new"
    | "canceled"
    | "reserved"
    | "started"
    | "stopped"
    | "archived";
  icon?: React.ReactNode;
  children?: React.ReactNode;
  iconRight?: React.ReactNode;
  className?: string;
}

const BadgeRoot = React.forwardRef<HTMLDivElement, BadgeRootProps>(
  function BadgeRoot(
    {
      variant = "draft",
      icon = null,
      children,
      iconRight = null,
      className,
      ...otherProps
    }: BadgeRootProps,
    ref
  ) {
    return (
      <div
        className={SubframeUtils.twClassNames(
          "group/97bdb082 flex h-6 items-center gap-1 rounded-md border border-solid border-brand-100 bg-brand-100 px-2",
          {
            "border border-solid border-success-50 bg-success-50":
              variant === "archived",
            "border border-solid border-brand-800 bg-brand-800":
              variant === "stopped",
            "border border-solid border-success-700 bg-success-700":
              variant === "started",
            "border border-solid border-success-100 bg-success-100":
              variant === "reserved",
            "border border-solid border-error-100 bg-error-100":
              variant === "canceled",
            "border border-solid border-neutral-100 bg-neutral-200":
              variant === "new",
          },
          className
        )}
        ref={ref}
        {...otherProps}
      >
        {icon ? (
          <SubframeCore.IconWrapper
            className={SubframeUtils.twClassNames(
              "text-caption font-caption text-brand-700",
              {
                "text-success-700": variant === "archived",
                "text-brand-200": variant === "stopped",
                "text-success-100": variant === "started",
                "text-success-800": variant === "reserved",
                "text-error-700": variant === "canceled",
                "text-neutral-700": variant === "new",
              }
            )}
          >
            {icon}
          </SubframeCore.IconWrapper>
        ) : null}
        {children ? (
          <span
            className={SubframeUtils.twClassNames(
              "whitespace-nowrap text-caption font-caption text-brand-800",
              {
                "text-success-700": variant === "archived",
                "text-brand-200": variant === "stopped",
                "text-success-100": variant === "started",
                "text-success-800": variant === "reserved",
                "text-error-800": variant === "canceled",
                "text-neutral-700": variant === "new",
              }
            )}
          >
            {children}
          </span>
        ) : null}
        {iconRight ? (
          <SubframeCore.IconWrapper
            className={SubframeUtils.twClassNames(
              "text-caption font-caption text-brand-700",
              {
                "text-success-700": variant === "archived",
                "text-brand-200": variant === "stopped",
                "text-success-100": variant === "started",
                "text-success-800": variant === "reserved",
                "text-error-700": variant === "canceled",
                "text-neutral-700": variant === "new",
              }
            )}
          >
            {iconRight}
          </SubframeCore.IconWrapper>
        ) : null}
      </div>
    );
  }
);

export const Badge = BadgeRoot;

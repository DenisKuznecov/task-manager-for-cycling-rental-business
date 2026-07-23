"use client";

import React, { useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import {
  FeatherAlertTriangle,
  FeatherCheckCircle,
  FeatherLink,
} from "@subframe/core";
import { Badge } from "@/ui/components/Badge";
import { Button } from "@/ui/components/Button";
import { CopyToClipboardButton } from "@/ui/components/CopyToClipboardButton";
import { LinkButton } from "@/ui/components/LinkButton";
import { Select } from "@/ui/components/Select";
import { TextField } from "@/ui/components/TextField";
import { Toast } from "@/ui/components/Toast";
import { ToggleGroup } from "@/ui/components/ToggleGroup";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const utmFormSchema = z
  .object({
    title: z.string().min(1, "Title is required"),
    assignment: z.enum(["internal", "partner"]),
    partnerId: z.string().optional(),
    websiteUrl: z.string().url(
      "Please enter a valid URL (e.g., https://www.echeloncyclinghub.com)"
    ),
    campaignSource: z.string().min(1, "Campaign Source is required"),
    campaignMedium: z.string().min(1, "Campaign Medium is required"),
    campaignName: z.string().min(1, "Campaign Name is required"),
    campaignId: z.string().optional(),
    campaignTerm: z.string().optional(),
    campaignContent: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.assignment === "partner" && !data.partnerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please select a partner",
        path: ["partnerId"],
      });
    }
  });

type UtmFormValues = z.infer<typeof utmFormSchema>;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Partner {
  id: string;
  name: string;
}

interface UtmBuilderFormProps {
  partners: Partner[];
}

interface SuccessState {
  shortUrl: string;
  isExisting: boolean;
  message: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UtmBuilderForm({ partners }: UtmBuilderFormProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UtmFormValues>({
    resolver: zodResolver(utmFormSchema),
    mode: "onBlur",
    defaultValues: {
      title: "",
      assignment: "internal",
      partnerId: "",
      websiteUrl: "",
      campaignSource: "",
      campaignMedium: "",
      campaignName: "",
      campaignId: "",
      campaignTerm: "",
      campaignContent: "",
    },
  });

  const [successState, setSuccessState] = useState<SuccessState | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [
    assignment,
    websiteUrl,
    campaignSource,
    campaignMedium,
    campaignName,
    campaignId,
    campaignTerm,
    campaignContent,
  ] = watch([
    "assignment",
    "websiteUrl",
    "campaignSource",
    "campaignMedium",
    "campaignName",
    "campaignId",
    "campaignTerm",
    "campaignContent",
  ]);

  // Build the long URL reactively — null while the base URL is invalid.
  const longUrl = useMemo(() => {
    try {
      const url = new URL(websiteUrl);
      if (campaignSource) url.searchParams.set("utm_source", campaignSource);
      if (campaignMedium) url.searchParams.set("utm_medium", campaignMedium);
      if (campaignName) url.searchParams.set("utm_campaign", campaignName);
      if (campaignId) url.searchParams.set("utm_id", campaignId);
      if (campaignTerm) url.searchParams.set("utm_term", campaignTerm);
      if (campaignContent) url.searchParams.set("utm_content", campaignContent);
      return url.toString();
    } catch {
      return null;
    }
  }, [
    websiteUrl,
    campaignSource,
    campaignMedium,
    campaignName,
    campaignId,
    campaignTerm,
    campaignContent,
  ]);

  const onSubmit = handleSubmit(async (values) => {
    // Clear previous feedback on each attempt.
    setSubmitError(null);
    setSuccessState(null);

    const resolvedPartnerId =
      values.assignment === "partner" ? (values.partnerId ?? null) : null;

    let response: Response;
    try {
      response = await fetch("/api/links/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          longUrl,
          title: values.title,
          partnerId: resolvedPartnerId,
          assignment: values.assignment,
        }),
      });
    } catch {
      setSubmitError(
        "Network error — please check your connection and try again."
      );
      return;
    }

    const data = await response.json();

    if (!response.ok) {
      setSubmitError(data.error ?? "An unexpected error occurred.");
      return;
    }

    setSuccessState({
      shortUrl: data.shortUrl,
      isExisting: data.isExisting,
      message: data.message,
    });
  });

  const handleCreateAnother = () => {
    reset();
    setSuccessState(null);
    setSubmitError(null);
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      {/* ------------------------------------------------------------------ */}
      {/* Link details                                                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col gap-4 rounded-md border border-solid border-neutral-border bg-default-background p-6">
        <span className="text-heading-3 font-heading-3 text-default-font">
          Link details
        </span>

        {/* Title */}
        <TextField
          className="w-full"
          label="Title *"
          error={Boolean(errors.title)}
          helpText={errors.title?.message ?? "A descriptive name for this link, used for display on the links page."}
        >
          <TextField.Input
            placeholder="Spring Sale – Google Ads"
            {...register("title")}
          />
        </TextField>

        {/* Assignment toggle */}
        <div className="flex flex-col gap-1.5">
          <span className="text-caption-bold font-caption-bold text-default-font">
            Link Assignment
          </span>
          <Controller
            control={control}
            name="assignment"
            render={({ field }) => (
              <ToggleGroup
                value={field.value}
                onValueChange={(val) => {
                  // Radix emits "" when the user clicks the already-selected item;
                  // ignore that so one option is always active.
                  if (!val) return;
                  field.onChange(val);
                  if (val === "internal") {
                    setValue("partnerId", "", { shouldValidate: false });
                  }
                }}
              >
                <ToggleGroup.Item value="internal" icon={null}>
                  Internal Use
                </ToggleGroup.Item>
                <ToggleGroup.Item value="partner" icon={null}>
                  Assign to a Partner
                </ToggleGroup.Item>
              </ToggleGroup>
            )}
          />
          <span className="text-caption font-caption text-subtext-color">
            Select whether this link is for internal Echelon Cycling campaigns
            or assigned to a specific partner.
          </span>
        </div>

        {/* Partner select — shown only when "partner" is selected */}
        {assignment === "partner" && (
          <Controller
            control={control}
            name="partnerId"
            render={({ field }) => (
              <Select
                className="w-full"
                label="Partner *"
                placeholder="Select a partner…"
                error={Boolean(errors.partnerId)}
                helpText={errors.partnerId?.message ?? ""}
                value={field.value ?? ""}
                onValueChange={field.onChange}
              >
                {partners.map((partner) => (
                  <Select.Item key={partner.id} value={partner.id}>
                    {partner.name}
                  </Select.Item>
                ))}
              </Select>
            )}
          />
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* UTM parameters                                                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col gap-4 rounded-md border border-solid border-neutral-border bg-default-background p-6">
        <span className="text-heading-3 font-heading-3 text-default-font">
          UTM Parameters
        </span>

        {/* Website URL */}
        <TextField
          className="w-full"
          label="Website URL *"
          error={Boolean(errors.websiteUrl)}
          helpText={
            errors.websiteUrl?.message ??
            "The full website URL (e.g., https://www.echeloncyclinghub.com)"
          }
        >
          <TextField.Input
            type="url"
            placeholder="https://www.echeloncyclinghub.com"
            {...register("websiteUrl")}
          />
        </TextField>

        {/* Campaign ID */}
        <TextField
          className="w-full"
          label="Campaign ID"
          helpText={errors.campaignId?.message ?? "The ads campaign id."}
        >
          <TextField.Input
            placeholder="abc.123"
            {...register("campaignId")}
          />
        </TextField>

        {/* Campaign Source */}
        <TextField
          className="w-full"
          label="Campaign Source *"
          error={Boolean(errors.campaignSource)}
          helpText={
            errors.campaignSource?.message ??
            "The referrer (e.g., google, newsletter)"
          }
        >
          <TextField.Input
            placeholder="google"
            {...register("campaignSource")}
          />
        </TextField>

        {/* Campaign Medium */}
        <TextField
          className="w-full"
          label="Campaign Medium *"
          error={Boolean(errors.campaignMedium)}
          helpText={
            errors.campaignMedium?.message ??
            "Marketing medium (e.g., cpc, banner, email)"
          }
        >
          <TextField.Input
            placeholder="cpc"
            {...register("campaignMedium")}
          />
        </TextField>

        {/* Campaign Name */}
        <TextField
          className="w-full"
          label="Campaign Name *"
          error={Boolean(errors.campaignName)}
          helpText={
            errors.campaignName?.message ??
            "Product, promo code, or slogan (e.g., spring_sale)"
          }
        >
          <TextField.Input
            placeholder="spring_sale"
            {...register("campaignName")}
          />
        </TextField>

        {/* Campaign Term */}
        <TextField
          className="w-full"
          label="Campaign Term"
          helpText={errors.campaignTerm?.message ?? "Identify the paid keywords."}
        >
          <TextField.Input
            placeholder="running+shoes"
            {...register("campaignTerm")}
          />
        </TextField>

        {/* Campaign Content */}
        <TextField
          className="w-full"
          label="Campaign Content"
          helpText={
            errors.campaignContent?.message ?? "Use to differentiate ads."
          }
        >
          <TextField.Input
            placeholder="logolink"
            {...register("campaignContent")}
          />
        </TextField>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Output                                                               */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col gap-4 rounded-md border border-solid border-neutral-border bg-default-background p-6">
        <span className="text-heading-3 font-heading-3 text-default-font">
          Share the generated campaign URL
        </span>

        {/* Long URL display */}
        <div className="flex items-end gap-2">
          <TextField
            className="w-full"
            label="Long URL"
            helpText="Fill in the required fields above to generate your campaign URL."
          >
            <TextField.Input
              readOnly
              placeholder="Your campaign URL will appear here…"
              value={longUrl ?? ""}
              className="cursor-default select-all"
            />
          </TextField>
          <CopyToClipboardButton
            clipboardText={longUrl ?? ""}
            tooltipText="Copy long URL"
          />
        </div>

        {/* ----- Success card ----- */}
        {successState ? (
          <div className="flex flex-col gap-4 rounded-md border border-solid border-neutral-border bg-neutral-50 p-5">
            <div className="flex items-center gap-2">
              <Badge
                variant={successState.isExisting ? "warning" : "success"}
              >
                {successState.isExisting ? "Existing Link Found" : "Link Created"}
              </Badge>
              <span className="text-body font-body text-subtext-color">
                {successState.message}
              </span>
            </div>

            <div className="flex items-end gap-2">
              <TextField className="w-full" label="Short URL">
                <TextField.Input
                  readOnly
                  value={successState.shortUrl}
                  className="cursor-default select-all font-mono"
                />
              </TextField>
              <CopyToClipboardButton
                clipboardText={successState.shortUrl}
                tooltipText="Copy short URL"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="brand-primary"
                size="medium"
                icon={<FeatherLink />}
                onClick={handleCreateAnother}
              >
                Create Another Link
              </Button>
              <LinkButton
                variant="brand"
                onClick={() => router.push("/hq/links")}
              >
                View All Links
              </LinkButton>
            </div>
          </div>
        ) : (
          /* ----- Submit button + inline error ----- */
          <div className="flex flex-col gap-3">
            <Button
              type="submit"
              variant="brand-primary"
              size="large"
              className="self-start"
              loading={isSubmitting}
              disabled={isSubmitting}
              icon={<FeatherCheckCircle />}
            >
              Generate Short Link
            </Button>

            {submitError ? (
              <Toast
                variant="error"
                icon={<FeatherAlertTriangle />}
                title="Could not generate link"
                description={submitError}
              />
            ) : null}
          </div>
        )}
      </div>
    </form>
  );
}

"use client";

import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FeatherCheckCircle } from "@subframe/core";
import { Button } from "@/ui/components/Button";
import { Checkbox } from "@/ui/components/Checkbox";
import { Select } from "@/ui/components/Select";
import { TextArea } from "@/ui/components/TextArea";
import { TextField } from "@/ui/components/TextField";
import { useUser } from "@/src/context/UserContext";
import {
  contactFormSchema,
  INQUIRY_TOPICS,
  type ContactFormValues,
} from "@/src/lib/contact-schema";
import { sendContactRequest } from "@/src/lib/contact";
import { PRIVACY_POLICY_URL } from "@/ui/layouts/brand-assets";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+()\d][\d\s()+\-.\/]{4,}\d$/;

export function ContactForm() {
  const { user } = useUser();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      surname: "",
      organization: "",
      email: user?.email ?? "",
      phone: "",
      topic: undefined,
      message: "",
      consent: false as unknown as true,
    },
  });

  const consent = watch("consent");

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    setSubmitting(true);
    const result = await sendContactRequest(values);
    setSubmitting(false);

    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }

    setSubmitted(true);
  });

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <FeatherCheckCircle className="h-12 w-12 text-success-600" />
        <span className="text-heading-3 font-heading-3 text-default-font">
          Message sent!
        </span>
        <span className="max-w-sm text-body font-body text-subtext-color">
          Thank you for reaching out. We&apos;ll get back to you within 1
          business day.
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {/* Name + Surname row */}
      <div className="flex gap-4">
        <TextField
          className="flex-1"
          label="Name"
          error={Boolean(errors.name)}
          helpText={errors.name?.message ?? ""}
        >
          <TextField.Input
            placeholder="Jane"
            {...register("name", { setValueAs: (v: string) => v.trim() })}
          />
        </TextField>

        <TextField
          className="flex-1"
          label="Surname"
          error={Boolean(errors.surname)}
          helpText={errors.surname?.message ?? ""}
        >
          <TextField.Input
            placeholder="Doe"
            {...register("surname", { setValueAs: (v: string) => v.trim() })}
          />
        </TextField>
      </div>

      <TextField
        className="w-full"
        label="Organization"
        helpText={errors.organization?.message ?? "Optional"}
      >
        <TextField.Input
          placeholder="Cycling Club Mallorca"
          {...register("organization", {
            setValueAs: (v: string) => v.trim(),
          })}
        />
      </TextField>

      <div className="flex gap-4">
        <TextField
          className="flex-1"
          label="Email"
          error={Boolean(errors.email)}
          helpText={errors.email?.message ?? ""}
        >
          <TextField.Input
            type="email"
            placeholder="jane@example.com"
            {...register("email")}
          />
        </TextField>

        <TextField
          className="flex-1"
          label="Phone"
          helpText={errors.phone?.message ?? "Optional"}
          error={Boolean(errors.phone)}
        >
          <TextField.Input
            type="tel"
            placeholder="+34 600 000 000"
            {...register("phone")}
          />
        </TextField>
      </div>

      {/* Inquiry topic */}
      <Controller
        control={control}
        name="topic"
        render={({ field }) => (
          <Select
            className="w-full"
            label="Inquiry topic"
            placeholder="Select a topic…"
            error={Boolean(errors.topic)}
            helpText={errors.topic?.message ?? ""}
            value={field.value ?? ""}
            onValueChange={field.onChange}
          >
            {INQUIRY_TOPICS.map((topic) => (
              <Select.Item key={topic} value={topic}>
                {topic}
              </Select.Item>
            ))}
          </Select>
        )}
      />

      <TextArea
        className="w-full"
        label="Message"
        error={Boolean(errors.message)}
        helpText={errors.message?.message ?? ""}
      >
        <TextArea.Input
          className="min-h-[120px]"
          placeholder="Tell us about your inquiry…"
          {...register("message")}
        />
      </TextArea>

      {/* GDPR consent */}
      <Controller
        control={control}
        name="consent"
        render={({ field }) => (
          <div className="flex flex-col gap-1">
            <Checkbox
              checked={field.value === true}
              onCheckedChange={(checked) => field.onChange(checked)}
              label={
                <span className="text-body font-body text-default-font">
                  I agree to the processing of my personal data as described in
                  the{" "}
                  <a
                    href={PRIVACY_POLICY_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-700 underline hover:text-brand-800"
                  >
                    Privacy Policy
                  </a>
                </span>
              }
            />
            {errors.consent ? (
              <span className="text-caption font-caption text-error-700">
                {errors.consent.message}
              </span>
            ) : null}
          </div>
        )}
      />

      {submitError ? (
        <span className="text-caption font-caption text-error-700">
          {submitError}
        </span>
      ) : null}

      <Button
        type="submit"
        variant="brand-primary"
        size="large"
        className="w-full"
        loading={submitting}
        disabled={submitting || !consent}
      >
        Send message
      </Button>
    </form>
  );
}

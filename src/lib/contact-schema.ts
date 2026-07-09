import { z } from "zod";
import {
  validateSafeText,
  SAFE_TEXT_VALIDATION_MESSAGE,
} from "@/src/utils/validation";

export const INQUIRY_TOPICS = [
  "Partnership",
  "Bike Reservation",
  "Bike Service",
  "Report a Bug",
  "Other",
] as const;

export type InquiryTopic = (typeof INQUIRY_TOPICS)[number];

const safeText = z
  .string()
  .refine(validateSafeText, { message: SAFE_TEXT_VALIDATION_MESSAGE });

export const contactFormSchema = z.object({
  name: safeText.min(1, "Name is required").max(100),
  surname: safeText.min(1, "Surname is required").max(100),
  organization: safeText.max(150).optional().or(z.literal("")),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  phone: z
    .string()
    .max(30)
    .regex(/^[+()\d][\d\s()+\-.\/]{4,}\d$/, {
      message: "Enter a valid phone number",
    })
    .optional()
    .or(z.literal("")),
  topic: z.enum(INQUIRY_TOPICS, { message: "Please select an inquiry topic" }),
  message: safeText
    .min(10, "Message must be at least 10 characters")
    .max(3000),
  consent: z.literal(true, {
    message: "You must agree to data processing to submit",
  }),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

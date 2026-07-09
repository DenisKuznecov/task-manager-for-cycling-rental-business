import {
  Html,
  Tailwind,
  Text,
  Container,
  Heading,
  Img,
  Section,
  Row,
  Column,
  Hr,
} from "@react-email/components";
import * as React from "react";
import type { InquiryTopic } from "../src/lib/contact-schema";

interface ContactRequestEmailProps {
  name: string;
  surname: string;
  organization?: string;
  email: string;
  phone?: string;
  topic: InquiryTopic;
  message: string;
  consentAt: string;
  submittingUserEmail: string;
}

export function ContactRequestEmail({
  name,
  surname,
  organization,
  email,
  phone,
  topic,
  message,
  consentAt,
  submittingUserEmail,
}: ContactRequestEmailProps) {
  const fullName = `${name} ${surname}`;
  const consentDate = new Date(consentAt).toLocaleString("en-GB", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Madrid",
  });

  return (
    <Tailwind>
      <Html>
        <Container className="mx-auto mt-10 max-w-xl rounded-lg border border-solid border-gray-200 bg-white p-8 font-sans shadow-sm">
          {/* Logo */}
          <Section className="mb-8 mt-4 text-center">
            <Img
              src="https://iwawhxfptzimluqyebiq.supabase.co/storage/v1/object/sign/echelon-assets/logo%20dots%20orange.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV85NDY1OGQzYy00MzM4LTQ2NWYtODk0Yy0zNTZkYjgzYTQ2ZTYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJlY2hlbG9uLWFzc2V0cy9sb2dvIGRvdHMgb3JhbmdlLnBuZyIsImlhdCI6MTc3OTE5NjM0MiwiZXhwIjoxODEwNzMyMzQyfQ.xv2xWfI0zvAWudTvzoxC2PLsc74TtGtHMpRH69Pxc5I"
              width="180"
              height="auto"
              alt="Echelon Cycling Hub"
              className="mx-auto"
            />
          </Section>

          {/* Topic badge */}
          <Section className="mb-2 text-center">
            <span
              style={{
                display: "inline-block",
                backgroundColor: "#f97316",
                color: "#fff",
                padding: "4px 14px",
                borderRadius: "9999px",
                fontSize: "13px",
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {topic}
            </span>
          </Section>

          <Heading className="mb-1 text-center text-2xl font-bold text-gray-900">
            New Contact Request
          </Heading>
          <Text className="mb-6 text-center text-sm text-gray-500">
            Reply directly to this email to reach the sender.
          </Text>

          <Hr className="mb-6 border-gray-200" />

          {/* Contact details */}
          <Section className="mb-4">
            <Heading className="mb-3 text-base font-semibold text-gray-800">
              Contact Details
            </Heading>
            <Row>
              <Column className="w-1/3 pr-2">
                <Text className="m-0 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Name
                </Text>
                <Text className="m-0 text-sm text-gray-900">{fullName}</Text>
              </Column>
              <Column className="w-1/3 px-2">
                <Text className="m-0 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Email
                </Text>
                <Text className="m-0 text-sm text-gray-900">{email}</Text>
              </Column>
              <Column className="w-1/3 pl-2">
                <Text className="m-0 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Phone
                </Text>
                <Text className="m-0 text-sm text-gray-900">
                  {phone || "—"}
                </Text>
              </Column>
            </Row>
            {organization ? (
              <Row className="mt-3">
                <Column>
                  <Text className="m-0 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Organization
                  </Text>
                  <Text className="m-0 text-sm text-gray-900">
                    {organization}
                  </Text>
                </Column>
              </Row>
            ) : null}
          </Section>

          <Hr className="mb-4 border-gray-200" />

          {/* Message */}
          <Section className="mb-4">
            <Heading className="mb-2 text-base font-semibold text-gray-800">
              Message
            </Heading>
            <div
              style={{
                backgroundColor: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "16px",
              }}
            >
              <Text className="m-0 whitespace-pre-wrap text-sm text-gray-800">
                {message}
              </Text>
            </div>
          </Section>

          <Hr className="mb-4 border-gray-200" />

          {/* Metadata */}
          <Section>
            <Text className="m-0 text-xs text-gray-400">
              Submitted by account: {submittingUserEmail}
            </Text>
            <Text className="m-0 text-xs text-gray-400">
              Consent to data processing given at {consentDate} (CET)
            </Text>
          </Section>
        </Container>
      </Html>
    </Tailwind>
  );
}

export default ContactRequestEmail;

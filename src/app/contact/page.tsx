import React from "react";
import {
  FeatherMail,
  FeatherMapPin,
  FeatherPhone,
  FeatherClock,
  FeatherMessageCircle,
  FeatherSend,
} from "@subframe/core";
import {
  BUSINESS_ADDRESS,
  MAPS_URL,
  PHONE,
  PHONE_HREF,
  CONTACT_EMAIL,
  MAPS_EMBED_URL,
  OPENING_HOURS,
  SOCIAL_LINKS,
} from "@/ui/layouts/brand-assets";
import { ContactForm } from "./_components/ContactForm";

const WHATSAPP = SOCIAL_LINKS.find((s) => s.label === "WhatsApp");
const TELEGRAM = SOCIAL_LINKS.find((s) => s.label === "Telegram");

export default function ContactPage() {
  return (
    <div className="container max-w-none flex w-full flex-col items-start gap-12 bg-default-background py-12">
      {/* Page header */}
      <div className="flex w-full flex-col items-start gap-2">
        <span className="text-heading-1 font-heading-1 text-default-font">
          Contact Us
        </span>
        <span className="text-body font-body text-subtext-color">
          Get in touch with our team for partnerships, reservations, or any
          other inquiry.
        </span>
      </div>

      {/* Two-column layout: info + map | form */}
      <div className="flex w-full flex-col gap-10 lg:flex-row">
        {/* Left column — info + map */}
        <div className="flex flex-1 flex-col gap-8">
          {/* Contact details */}
          <div className="flex flex-col gap-5 rounded-lg border border-solid border-neutral-border bg-default-background p-6 shadow-sm">
            <span className="text-heading-3 font-heading-3 text-default-font">
              Our Details
            </span>

            <div className="flex flex-col gap-4">
              <a
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 no-underline group"
              >
                <FeatherMapPin className="mt-0.5 h-5 w-5 flex-none text-brand-600" />
                <span className="text-body font-body text-default-font group-hover:text-brand-700 transition-colors">
                  {BUSINESS_ADDRESS}
                </span>
              </a>

              <a
                href={PHONE_HREF}
                className="flex items-center gap-3 no-underline group"
              >
                <FeatherPhone className="h-5 w-5 flex-none text-brand-600" />
                <span className="text-body font-body text-default-font group-hover:text-brand-700 transition-colors">
                  {PHONE}
                </span>
              </a>

              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="flex items-center gap-3 no-underline group"
              >
                <FeatherMail className="h-5 w-5 flex-none text-brand-600" />
                <span className="text-body font-body text-default-font group-hover:text-brand-700 transition-colors">
                  {CONTACT_EMAIL}
                </span>
              </a>
            </div>

            <p className="m-0 text-caption font-caption text-subtext-color">
              We reply within 1 business day.
            </p>
          </div>

          {/* Opening hours */}
          <div className="flex flex-col gap-4 rounded-lg border border-solid border-neutral-border bg-default-background p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <FeatherClock className="h-5 w-5 text-brand-600" />
              <span className="text-heading-3 font-heading-3 text-default-font">
                Opening Hours
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {OPENING_HOURS.map((entry) => (
                <div
                  key={entry.days}
                  className="flex items-center justify-between gap-4"
                >
                  <span className="text-body font-body text-subtext-color">
                    {entry.days}
                  </span>
                  <span className="text-body-bold font-body-bold text-default-font">
                    {entry.hours}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Direct-chat shortcuts */}
          <div className="flex flex-col gap-4 rounded-lg border border-solid border-neutral-border bg-default-background p-6 shadow-sm">
            <span className="text-heading-3 font-heading-3 text-default-font">
              Chat with Us
            </span>
            <p className="m-0 text-body font-body text-subtext-color">
              Prefer messaging? Reach us directly on WhatsApp or Telegram.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              {WHATSAPP ? (
                <a
                  href={WHATSAPP.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-md border border-solid border-neutral-border bg-default-background px-4 py-3 no-underline transition-colors hover:bg-neutral-50"
                >
                  <FeatherMessageCircle className="h-5 w-5 text-[#25D366]" />
                  <span className="text-body-bold font-body-bold text-default-font">
                    WhatsApp
                  </span>
                </a>
              ) : null}

              {TELEGRAM ? (
                <a
                  href={TELEGRAM.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-md border border-solid border-neutral-border bg-default-background px-4 py-3 no-underline transition-colors hover:bg-neutral-50"
                >
                  <FeatherSend className="h-5 w-5 text-[#229ED9]" />
                  <span className="text-body-bold font-body-bold text-default-font">
                    Telegram
                  </span>
                </a>
              ) : null}
            </div>
          </div>

          {/* Google Maps embed */}
          <div className="overflow-hidden rounded-lg border border-solid border-neutral-border shadow-sm">
            <iframe
              src={MAPS_EMBED_URL}
              width="100%"
              height="300"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Echelon Cycling Hub location"
              className="block border-none"
            />
          </div>
        </div>

        {/* Right column — form */}
        <div className="flex-1 lg:max-w-[520px]">
          <div className="rounded-lg border border-solid border-neutral-border bg-default-background p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-1">
              <span className="text-heading-3 font-heading-3 text-default-font">
                Send a Message
              </span>
              <span className="text-body font-body text-subtext-color">
                Fill in the form and we&apos;ll get back to you soon.
              </span>
            </div>
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
}

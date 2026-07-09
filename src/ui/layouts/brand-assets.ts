export const ECHELON_LOGO_SRC =
  "https://iwawhxfptzimluqyebiq.supabase.co/storage/v1/object/public/echelon-assets/echeloncycling_logo.svg";

export const DOTS_PATTERN_SRC =
  "https://iwawhxfptzimluqyebiq.supabase.co/storage/v1/object/public/echelon-assets/dots_pattern.svg";

export const BUSINESS_ADDRESS = "Carrer del Cardenal Rossell 35, Palma";
export const MAPS_URL = "https://maps.app.goo.gl/7ApGsrYVadMUYBaY8";
export const PHONE = "+34623156763";
export const PHONE_HREF = "tel:+34623156763";

export const CONTACT_EMAIL = "info@echeloncyclinghub.com";

export const PRIVACY_POLICY_URL =
  "https://www.echeloncyclinghub.com/privacy-policy";

export const MAPS_EMBED_URL =
  "https://www.google.com/maps?q=Carrer+del+Cardenal+Rossell+35,+Palma&output=embed";

export type OpeningHoursEntry = { days: string; hours: string };

export const OPENING_HOURS: OpeningHoursEntry[] = [
  { days: "Monday – Saturday", hours: "10:00 – 17:00" },
  { days: "Sunday", hours: "10:00 – 14:00" },
];

export const SOCIAL_LINKS = [
  { label: "Facebook", href: "https://www.facebook.com/echeloncyclinghub" },
  { label: "WhatsApp", href: "https://wa.me/34623156763" },
  { label: "Telegram", href: "https://t.me/echeloncyclinghub" },
  { label: "Instagram", href: "https://www.instagram.com/echeloncyclinghub/" },
  { label: "TikTok", href: "https://www.tiktok.com/@echeloncyclinghub" },
] as const;

export type PartnerOrder = {
  id: string;
  starts_at: string;
  stops_at: string;
  amount_in_cents: number | null;
  customers: {
    name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
};

export type PartnerRow = {
  id: string;
  name: string;
  location: string;
  promo_code: string;
  slug: string;
};

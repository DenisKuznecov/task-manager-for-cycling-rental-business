export interface CustomerOption {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export interface CreateCustomerInput {
  name: string;
  email: string | null;
  phone: string | null;
  /** ISO YYYY-MM-DD, or null. */
  birthday: string | null;
  sex: "male" | "female" | null;
}

export type CreateCustomerResult =
  | { ok: true; customer: CustomerOption }
  | { ok: false; error: string };

export interface SearchCustomersResult {
  customers: CustomerOption[];
  error: string | null;
}

export type DestinationStatus = {
  status: "green" | "red" | null;
  error: string | null;
};

export type CustomerDirectoryRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  birthday: string;
};

export type CustomerOrderSummary = {
  id: string;
  order_number: number | null;
  status: string | null;
  created_at: string | null;
};

export type CustomerBikeFitSummary = {
  id: string;
  fit_number: number;
  fit_label: string;
  date_of_fit: string;
};

export type CustomerPartnerSummary = { id: string; name: string };

export type CustomerAddressPart = { label: string; value: string };

export type CustomerDetails = {
  id: string;
  name: string;
  email: string;
  phone: string;
  birthday: string | null;
  address: CustomerAddressPart[];
  google: DestinationStatus;
  holded: DestinationStatus;
  mailchimp: DestinationStatus;
  orders: CustomerOrderSummary[];
  bikeFits: CustomerBikeFitSummary[];
  partners: CustomerPartnerSummary[];
};

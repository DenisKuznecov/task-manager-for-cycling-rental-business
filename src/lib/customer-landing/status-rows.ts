import { isoDateToDdMmYyyy } from "../../utils/date-format.ts";

export type DestCellStatus = "green" | "red" | null;

export type DestCell = {
  status: DestCellStatus;
  error: string | null;
};

export type CustomerLandingListRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  birthday: string;
  address: string;
  isLocalOnly: boolean;
  google: DestCell;
  holded: DestCell;
  mailchimp: DestCell;
};

export type CustomerLandingDbRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  birthday: string | null;
  address_street: string | null;
  address_city: string | null;
  address_region: string | null;
  address_zip: string | null;
  address_country: string | null;
  booqable_customer_id: string | null;
  google_status: string | null;
  google_error: string | null;
  holded_status: string | null;
  holded_error: string | null;
  mailchimp_status: string | null;
  mailchimp_error: string | null;
};

function destCell(status: string | null, error: string | null): DestCell {
  if (status === "green") return { status: "green", error: null };
  if (status === "red") return { status: "red", error };
  return { status: null, error: null };
}

function contactCell(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

function birthdayCell(value: string | null | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) return "—";
  return isoDateToDdMmYyyy(trimmed) || "—";
}

function addressCell(row: CustomerLandingDbRow): string {
  const parts = [
    row.address_street,
    row.address_city,
    row.address_region,
    row.address_zip,
    row.address_country,
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(", ") : "—";
}

export function toLandingListRow(
  row: CustomerLandingDbRow,
): CustomerLandingListRow {
  const name = row.name?.trim() ? row.name.trim() : "Unknown";
  const booqableId = row.booqable_customer_id?.trim() ?? "";
  return {
    id: row.id,
    name,
    email: contactCell(row.email),
    phone: contactCell(row.phone),
    birthday: birthdayCell(row.birthday),
    address: addressCell(row),
    isLocalOnly: booqableId === "",
    google: destCell(row.google_status, row.google_error),
    holded: destCell(row.holded_status, row.holded_error),
    mailchimp: destCell(row.mailchimp_status, row.mailchimp_error),
  };
}

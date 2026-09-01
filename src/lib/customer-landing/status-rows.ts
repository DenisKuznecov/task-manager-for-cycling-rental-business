export type DestCellStatus = "green" | "red" | null;

export type DestCell = {
  status: DestCellStatus;
  error: string | null;
};

export type CustomerLandingListRow = {
  id: string;
  name: string;
  isLocalOnly: boolean;
  google: DestCell;
  holded: DestCell;
  mailchimp: DestCell;
};

export type CustomerLandingDbRow = {
  id: string;
  name: string | null;
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

export function toLandingListRow(
  row: CustomerLandingDbRow,
): CustomerLandingListRow {
  const name = row.name?.trim() ? row.name.trim() : "Unknown";
  const booqableId = row.booqable_customer_id?.trim() ?? "";
  return {
    id: row.id,
    name,
    isLocalOnly: booqableId === "",
    google: destCell(row.google_status, row.google_error),
    holded: destCell(row.holded_status, row.holded_error),
    mailchimp: destCell(row.mailchimp_status, row.mailchimp_error),
  };
}

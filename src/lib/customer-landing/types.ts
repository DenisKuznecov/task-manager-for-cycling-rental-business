import type {
  CustomerPassport,
  PassportAddress,
} from "../booqable/parse-landing-customer.ts";

export type { CustomerPassport, PassportAddress };

export type DestName = "google" | "holded" | "mailchimp";

export type DestStatus = "green" | "red";

export type DestWriteResult =
  | { ok: true; destId: string }
  | { ok: false; error: string; destId?: string | null };

export type DestWriter = {
  name: DestName;
  write(input: {
    passport: CustomerPassport;
    storedId: string | null;
  }): Promise<DestWriteResult>;
};

export type DestIds = {
  google: string | null;
  holded: string | null;
  mailchimp: string | null;
};

export type DestStatusRow = {
  id: string | null;
  status: DestStatus;
  error: string | null;
};

export type LandingStatuses = {
  google: DestStatusRow;
  holded: DestStatusRow;
  mailchimp: DestStatusRow;
};

export type LandingStore = {
  upsertIdentity(passport: CustomerPassport): Promise<{ storedIds: DestIds }>;
  saveStatuses(
    booqableCustomerId: string,
    statuses: LandingStatuses,
  ): Promise<void>;
};

export type LandResult =
  | { ok: true; ignored: true }
  | { ok: true; ignored: false; statuses: LandingStatuses }
  | { ok: false; error: string };

export type EnvMap = Record<string, string | undefined>;

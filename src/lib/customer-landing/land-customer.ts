import { fetchLandingCustomerDocument } from "../booqable/fetch-source-snapshot.ts";
import {
  InvalidLandingCustomerError,
  parseLandingCustomer,
} from "../booqable/parse-landing-customer.ts";
import { workshopSyncAllowed } from "../workshop/application/sync-env.ts";
import { destNextAction, destToolName } from "./dest-error.ts";
import { writeGoogleContact } from "./google.ts";
import { writeHoldedContact } from "./holded.ts";
import { writeMailchimpMember } from "./mailchimp.ts";
import type {
  CustomerPassport,
  DestIds,
  DestName,
  DestStatusRow,
  DestWriteResult,
  DestWriter,
  EnvMap,
  LandingStatuses,
  LandingStore,
  LandResult,
} from "./types.ts";

export function defaultDestWriters(
  env: EnvMap = process.env,
  fetchImpl: typeof fetch = fetch,
): DestWriter[] {
  return [
    {
      name: "google",
      write: (input) => writeGoogleContact(input, env, fetchImpl),
    },
    {
      name: "holded",
      write: (input) => writeHoldedContact(input, env, fetchImpl),
    },
    {
      name: "mailchimp",
      write: (input) => writeMailchimpMember(input, env, fetchImpl),
    },
  ];
}

function statusFromWrite(
  storedId: string | null,
  result: DestWriteResult,
): DestStatusRow {
  if (result.ok) {
    return { id: result.destId, status: "green", error: null };
  }
  return {
    id: result.destId ?? storedId,
    status: "red",
    error: result.error,
  };
}

function storedIdFor(name: DestName, ids: DestIds): string | null {
  return ids[name];
}

async function collectLandingStatuses(
  writers: DestWriter[],
  passport: CustomerPassport,
  storedIds: DestIds,
): Promise<LandingStatuses> {
  const writes = await Promise.all(
    writers.map(async (writer) => {
      const storedId = storedIdFor(writer.name, storedIds);
      let result: DestWriteResult;
      try {
        result = await writer.write({ passport, storedId });
      } catch (error) {
        console.error(`[customer-landing/${writer.name}]`, error);
        result = {
          ok: false,
          destId: storedId,
          error: destNextAction(destToolName(writer.name), "write threw."),
        };
      }
      return { name: writer.name, storedId, result };
    }),
  );

  const byName = new Map(writes.map((write) => [write.name, write]));
  const missing = (tool: string): DestWriteResult => ({
    ok: false,
    error: destNextAction(tool, "was not attempted."),
  });

  return {
    google: statusFromWrite(
      storedIds.google,
      byName.get("google")?.result ?? missing("Google Contacts"),
    ),
    holded: statusFromWrite(
      storedIds.holded,
      byName.get("holded")?.result ?? missing("Holded"),
    ),
    mailchimp: statusFromWrite(
      storedIds.mailchimp,
      byName.get("mailchimp")?.result ?? missing("Mailchimp"),
    ),
  };
}

export async function landBooqableCustomer(
  booqableCustomerId: string,
  options: {
    env?: EnvMap;
    store?: LandingStore;
    writers?: DestWriter[];
    fetchCustomer?: (id: string) => Promise<unknown>;
  } = {},
): Promise<LandResult> {
  const env = options.env ?? process.env;
  if (!workshopSyncAllowed(env)) {
    return { ok: true, ignored: true };
  }

  const fetchCustomer = options.fetchCustomer ?? fetchLandingCustomerDocument;
  const store =
    options.store ??
    (await import("./landing-store.ts")).createSupabaseLandingStore();
  const writers = options.writers ?? defaultDestWriters(env);

  let document: unknown;
  try {
    document = await fetchCustomer(booqableCustomerId);
  } catch (error) {
    console.error("[customer-landing] GET customer:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Booqable customer GET failed.",
    };
  }

  let passport;
  try {
    passport = parseLandingCustomer(document);
  } catch (error) {
    console.error("[customer-landing] parse customer:", error);
    return {
      ok: false,
      error:
        error instanceof InvalidLandingCustomerError
          ? error.message
          : "Booqable customer document was invalid.",
    };
  }

  if (passport.booqableCustomerId !== booqableCustomerId) {
    console.error(
      "[customer-landing] GET customer id mismatch:",
      passport.booqableCustomerId,
    );
    return { ok: false, error: "Booqable customer id did not match the webhook signal." };
  }

  let storedIds: DestIds;
  try {
    ({ storedIds } = await store.upsertIdentity(passport));
  } catch (error) {
    console.error("[customer-landing] upsertIdentity:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not upsert customer row.",
    };
  }

  const statuses = await collectLandingStatuses(writers, passport, storedIds);

  try {
    await store.saveStatuses(booqableCustomerId, statuses);
  } catch (error) {
    console.error("[customer-landing] saveStatuses:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not store landing statuses.",
    };
  }

  return { ok: true, ignored: false, statuses };
}

import type { CustomerPassport, PassportAddress } from "./types.ts";
import type { DestWriteResult, EnvMap } from "./types.ts";
import { destNextAction, isRecord, omitEmpty, presentString } from "./dest-error.ts";

const LOG_PREFIX = "[customer-landing/holded]";
const CONTACTS_URL = "https://api.holded.com/api/v2/contacts";

type FetchLike = typeof fetch;

function holdedAddress(
  address: PassportAddress | null,
): Record<string, string> | undefined {
  if (!address) return undefined;
  const body = omitEmpty({
    address: presentString(address.street),
    city: presentString(address.city),
    postal_code: presentString(address.zip),
    province: presentString(address.region),
    country: presentString(address.country),
  });
  return Object.keys(body).length > 0 ? (body as Record<string, string>) : undefined;
}

export function holdedContactBody(passport: CustomerPassport): Record<string, unknown> {
  const body: Record<string, unknown> = {
    type: "client",
  };
  const booqableId = presentString(passport.booqableCustomerId);
  if (booqableId) body.custom_id = `booqable:${booqableId}`;
  const name = presentString(passport.name);
  if (name) body.name = name;
  const email = presentString(passport.email);
  if (email) body.email = email;
  const phone = presentString(passport.phone);
  if (phone) {
    body.phone = phone;
    body.mobile = phone;
  }
  const billAddress = holdedAddress(passport.address);
  if (billAddress) body.bill_address = billAddress;
  return body;
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (text.trim() === "") return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text };
  }
}

function idFromRecord(payload: Record<string, unknown>): string | null {
  if (typeof payload.id === "string" && payload.id.trim() !== "") return payload.id;
  if (typeof payload.id === "number" && Number.isFinite(payload.id)) {
    return String(payload.id);
  }
  return null;
}

function contactId(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  const direct = idFromRecord(payload);
  if (direct) return direct;
  if (isRecord(payload.item)) return idFromRecord(payload.item);
  if (isRecord(payload.data)) return idFromRecord(payload.data);
  return null;
}

function asContactList(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }
  if (!isRecord(payload)) return [];
  for (const key of ["items", "value", "data"] as const) {
    const nested = payload[key];
    if (Array.isArray(nested)) return nested.filter(isRecord);
  }
  return [];
}

async function holdedRequest(
  url: string,
  apiKey: string,
  fetchImpl: FetchLike,
  init: RequestInit = {},
): Promise<{ res: Response; payload: unknown }> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (init.body != null) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetchImpl(url, {
    ...init,
    headers,
  });
  return { res, payload: await readJson(res) };
}

type EmailLookup =
  | { ok: true; id: string | null }
  | { ok: false; error: string };

async function findByEmail(
  apiKey: string,
  email: string,
  fetchImpl: FetchLike,
): Promise<EmailLookup> {
  try {
    const query = new URLSearchParams({
      email,
      limit: "100",
    });
    const { res, payload } = await holdedRequest(
      `${CONTACTS_URL}?${query.toString()}`,
      apiKey,
      fetchImpl,
    );
    if (!res.ok) {
      console.error(LOG_PREFIX, res.status, payload);
      return {
        ok: false,
        error: destNextAction("Holded", `list contacts failed (${res.status}).`),
      };
    }
    const wanted = email.trim().toLowerCase();
    for (const row of asContactList(payload)) {
      if (typeof row.email === "string" && row.email.trim().toLowerCase() === wanted) {
        return { ok: true, id: contactId(row) };
      }
    }
    return { ok: true, id: null };
  } catch (error) {
    console.error(LOG_PREFIX, error);
    return {
      ok: false,
      error: destNextAction("Holded", "list contacts request failed."),
    };
  }
}

async function createContact(
  apiKey: string,
  body: Record<string, unknown>,
  fetchImpl: FetchLike,
): Promise<DestWriteResult> {
  try {
    const { res, payload } = await holdedRequest(CONTACTS_URL, apiKey, fetchImpl, {
      method: "POST",
      body: JSON.stringify(body),
    });
    const destId = contactId(payload);
    if (res.ok && destId) return { ok: true, destId };
    console.error(LOG_PREFIX, res.status, payload);
    return {
      ok: false,
      error: destNextAction("Holded", `create contact failed (${res.status}).`),
    };
  } catch (error) {
    console.error(LOG_PREFIX, error);
    return {
      ok: false,
      error: destNextAction("Holded", "create contact request failed."),
    };
  }
}

async function updateContact(
  apiKey: string,
  id: string,
  body: Record<string, unknown>,
  fetchImpl: FetchLike,
): Promise<DestWriteResult> {
  try {
    const { res, payload } = await holdedRequest(
      `${CONTACTS_URL}/${encodeURIComponent(id)}`,
      apiKey,
      fetchImpl,
      { method: "PUT", body: JSON.stringify(body) },
    );
    if (res.status === 404) {
      return createContact(apiKey, body, fetchImpl);
    }
    if (res.ok) return { ok: true, destId: contactId(payload) ?? id };
    console.error(LOG_PREFIX, res.status, payload);
    return {
      ok: false,
      destId: id,
      error: destNextAction("Holded", `update contact failed (${res.status}).`),
    };
  } catch (error) {
    console.error(LOG_PREFIX, error);
    return {
      ok: false,
      destId: id,
      error: destNextAction("Holded", "update contact request failed."),
    };
  }
}

export async function writeHoldedContact(
  input: { passport: CustomerPassport; storedId: string | null },
  env: EnvMap = process.env,
  fetchImpl: FetchLike = fetch,
): Promise<DestWriteResult> {
  const apiKey = presentString(env.HOLDED_API_KEY);
  if (!apiKey) {
    const error = destNextAction("Holded", "HOLDED_API_KEY is unset.");
    console.error(LOG_PREFIX, error);
    return { ok: false, error, destId: input.storedId };
  }

  if (!presentString(input.passport.name)) {
    return {
      ok: false,
      destId: input.storedId,
      error: destNextAction("Holded", "a name is required."),
    };
  }

  const body = holdedContactBody(input.passport);
  if (input.storedId) {
    return updateContact(apiKey, input.storedId, body, fetchImpl);
  }

  const email = presentString(input.passport.email);
  if (email) {
    const found = await findByEmail(apiKey, email, fetchImpl);
    if (!found.ok) {
      return { ok: false, error: found.error, destId: input.storedId };
    }
    if (found.id) {
      return updateContact(apiKey, found.id, body, fetchImpl);
    }
  }

  return createContact(apiKey, body, fetchImpl);
}

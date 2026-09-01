import { createHash } from "node:crypto";
import type { CustomerPassport, PassportAddress } from "./types.ts";
import type { DestWriteResult, EnvMap } from "./types.ts";
import { destNextAction, isRecord, omitEmpty, presentString } from "./dest-error.ts";

const LOG_PREFIX = "[customer-landing/mailchimp]";

type FetchLike = typeof fetch;

export function mailchimpSubscriberHash(email: string): string {
  return createHash("md5").update(email.trim().toLowerCase()).digest("hex");
}

export function mailchimpDataCenter(apiKey: string): string | null {
  const suffix = apiKey.split("-").pop();
  if (!suffix || suffix.trim() === "" || suffix === apiKey) return null;
  return suffix;
}

function mailchimpAddress(
  address: PassportAddress | null,
): Record<string, string> | undefined {
  if (!address) return undefined;
  const body = omitEmpty({
    addr1: presentString(address.street),
    city: presentString(address.city),
    state: presentString(address.region),
    zip: presentString(address.zip),
    country: presentString(address.country),
  });
  return Object.keys(body).length > 0 ? (body as Record<string, string>) : undefined;
}

function mailchimpBirthday(birthday: string | null): string | undefined {
  if (!birthday) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthday);
  if (!match) return undefined;
  return `${match[2]}/${match[3]}`;
}

export function mailchimpMemberBody(
  passport: CustomerPassport,
  includeAddress: boolean,
): Record<string, unknown> {
  const merge: Record<string, unknown> = {};
  const name = presentString(passport.name);
  if (name) {
    const parts = name.split(/\s+/);
    merge.FNAME = parts[0];
    if (parts.length > 1) merge.LNAME = parts.slice(1).join(" ");
  }
  const phone = presentString(passport.phone);
  if (phone) merge.PHONE = phone;
  const birthday = mailchimpBirthday(passport.birthday);
  if (birthday) merge.BIRTHDAY = birthday;
  if (includeAddress) {
    const address = mailchimpAddress(passport.address);
    if (address) merge.ADDRESS = address;
  }

  const body: Record<string, unknown> = {
    email_address: presentString(passport.email),
    status_if_new: "subscribed",
  };
  if (Object.keys(merge).length > 0) body.merge_fields = merge;
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

function memberId(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  if (typeof payload.id === "string" && payload.id.trim() !== "") return payload.id;
  return null;
}

function memberUrl(dc: string, audienceId: string, memberHash: string): string {
  return `https://${dc}.api.mailchimp.com/3.0/lists/${encodeURIComponent(
    audienceId,
  )}/members/${memberHash}`;
}

async function putMember(
  url: string,
  apiKey: string,
  body: Record<string, unknown>,
  fetchImpl: FetchLike,
): Promise<{ res: Response; payload: unknown }> {
  const res = await fetchImpl(url, {
    method: "PUT",
    headers: {
      Authorization: `Basic ${Buffer.from(`anystring:${apiKey}`).toString("base64")}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return { res, payload: await readJson(res) };
}

async function putMemberResolving(
  url: string,
  apiKey: string,
  passport: CustomerPassport,
  memberHash: string,
  fetchImpl: FetchLike,
): Promise<
  | { ok: true; destId: string }
  | { ok: false; status: number; error: string }
> {
  const bodyWithAddress = mailchimpMemberBody(passport, true);
  const sentAddress = Boolean(
    isRecord(bodyWithAddress.merge_fields) && bodyWithAddress.merge_fields.ADDRESS,
  );
  const withAddress = await putMember(url, apiKey, bodyWithAddress, fetchImpl);
  if (withAddress.res.ok) {
    return { ok: true, destId: memberId(withAddress.payload) ?? memberHash };
  }
  if (withAddress.res.status === 404) {
    return {
      ok: false,
      status: 404,
      error: destNextAction("Mailchimp", "audience rejected the member (404)."),
    };
  }
  if (withAddress.res.status >= 400 && withAddress.res.status < 500 && sentAddress) {
    const withoutAddress = await putMember(
      url,
      apiKey,
      mailchimpMemberBody(passport, false),
      fetchImpl,
    );
    if (withoutAddress.res.ok) {
      return { ok: true, destId: memberId(withoutAddress.payload) ?? memberHash };
    }
    console.error(LOG_PREFIX, withoutAddress.res.status, withoutAddress.payload);
    return {
      ok: false,
      status: withoutAddress.res.status,
      error: destNextAction(
        "Mailchimp",
        `audience rejected the member (${withoutAddress.res.status}).`,
      ),
    };
  }
  console.error(LOG_PREFIX, withAddress.res.status, withAddress.payload);
  return {
    ok: false,
    status: withAddress.res.status,
    error: destNextAction(
      "Mailchimp",
      `audience rejected the member (${withAddress.res.status}).`,
    ),
  };
}

export async function writeMailchimpMember(
  input: { passport: CustomerPassport; storedId: string | null },
  env: EnvMap = process.env,
  fetchImpl: FetchLike = fetch,
): Promise<DestWriteResult> {
  const apiKey = presentString(env.MAILCHIMP_API_KEY);
  const audienceId = presentString(env.MAILCHIMP_AUDIENCE_ID);
  if (!apiKey || !audienceId) {
    const error = destNextAction(
      "Mailchimp",
      "MAILCHIMP_API_KEY or MAILCHIMP_AUDIENCE_ID is unset.",
    );
    console.error(LOG_PREFIX, error);
    return { ok: false, error, destId: input.storedId };
  }

  const email = presentString(input.passport.email);
  if (!email) {
    return {
      ok: false,
      destId: input.storedId,
      error: destNextAction("Mailchimp", "an email is required."),
    };
  }

  const dc = mailchimpDataCenter(apiKey);
  if (!dc) {
    const error = destNextAction(
      "Mailchimp",
      "MAILCHIMP_API_KEY is missing a data-center suffix.",
    );
    console.error(LOG_PREFIX, error);
    return { ok: false, error, destId: input.storedId };
  }

  const emailHash = mailchimpSubscriberHash(email);
  const firstHash = input.storedId ?? emailHash;

  try {
    const first = await putMemberResolving(
      memberUrl(dc, audienceId, firstHash),
      apiKey,
      input.passport,
      firstHash,
      fetchImpl,
    );
    if (first.ok) return first;
    if (first.status === 404 && input.storedId) {
      const recreated = await putMemberResolving(
        memberUrl(dc, audienceId, emailHash),
        apiKey,
        input.passport,
        emailHash,
        fetchImpl,
      );
      if (recreated.ok) return recreated;
      return {
        ok: false,
        destId: input.storedId,
        error: recreated.error,
      };
    }
    return {
      ok: false,
      destId: input.storedId,
      error: first.error,
    };
  } catch (error) {
    console.error(LOG_PREFIX, error);
    return {
      ok: false,
      destId: input.storedId,
      error: destNextAction("Mailchimp", "member request failed."),
    };
  }
}

export const REVIEW_REQUEST_TAG = "review-request";
const REVIEW_REQUEST_LOG = "[review-request/mailchimp]";

function mailchimpBasicAuth(apiKey: string): string {
  return `Basic ${Buffer.from(`anystring:${apiKey}`).toString("base64")}`;
}

function resolveReviewRequestAudience(
  env: EnvMap,
): { apiKey: string; audienceId: string; dc: string } | null {
  const apiKey = presentString(env.MAILCHIMP_API_KEY);
  const audienceId = presentString(env.MAILCHIMP_AUDIENCE_ID);
  if (!apiKey || !audienceId) {
    console.error(
      REVIEW_REQUEST_LOG,
      "MAILCHIMP_API_KEY or MAILCHIMP_AUDIENCE_ID is unset.",
    );
    return null;
  }
  const dc = mailchimpDataCenter(apiKey);
  if (!dc) {
    console.error(
      REVIEW_REQUEST_LOG,
      "MAILCHIMP_API_KEY is missing a data-center suffix.",
    );
    return null;
  }
  return { apiKey, audienceId, dc };
}

async function mailchimpRequest(
  url: string,
  apiKey: string,
  fetchImpl: FetchLike,
  init: { method: string; body?: unknown },
): Promise<{ res: Response; payload: unknown }> {
  const headers: Record<string, string> = {
    Authorization: mailchimpBasicAuth(apiKey),
    Accept: "application/json",
  };
  if (init.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetchImpl(url, {
    method: init.method,
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  return { res, payload: await readJson(res) };
}

function tagSearchHasExactName(payload: unknown, name: string): boolean {
  if (!isRecord(payload) || !Array.isArray(payload.tags)) return false;
  return payload.tags.some((tag) => isRecord(tag) && tag.name === name);
}

function memberHasTag(payload: unknown, name: string): boolean {
  if (!isRecord(payload) || !Array.isArray(payload.tags)) return false;
  return payload.tags.some((tag) => isRecord(tag) && tag.name === name);
}

function tagSearchUrl(dc: string, audienceId: string): string {
  return `https://${dc}.api.mailchimp.com/3.0/lists/${encodeURIComponent(
    audienceId,
  )}/tag-search?name=${encodeURIComponent(REVIEW_REQUEST_TAG)}`;
}

function segmentsUrl(dc: string, audienceId: string): string {
  return `https://${dc}.api.mailchimp.com/3.0/lists/${encodeURIComponent(
    audienceId,
  )}/segments`;
}

export async function findOrCreateReviewRequestTag(
  env: EnvMap = process.env,
  fetchImpl: FetchLike = fetch,
): Promise<boolean> {
  const cfg = resolveReviewRequestAudience(env);
  if (!cfg) return false;
  try {
    const search = await mailchimpRequest(
      tagSearchUrl(cfg.dc, cfg.audienceId),
      cfg.apiKey,
      fetchImpl,
      { method: "GET" },
    );
    if (!search.res.ok) {
      console.error(REVIEW_REQUEST_LOG, search.res.status, search.payload);
      return false;
    }
    if (tagSearchHasExactName(search.payload, REVIEW_REQUEST_TAG)) {
      return true;
    }
    const created = await mailchimpRequest(
      segmentsUrl(cfg.dc, cfg.audienceId),
      cfg.apiKey,
      fetchImpl,
      {
        method: "POST",
        body: { name: REVIEW_REQUEST_TAG, static_segment: [] },
      },
    );
    if (created.res.ok) return true;
    if (created.res.status === 400) {
      const retry = await mailchimpRequest(
        tagSearchUrl(cfg.dc, cfg.audienceId),
        cfg.apiKey,
        fetchImpl,
        { method: "GET" },
      );
      if (retry.res.ok && tagSearchHasExactName(retry.payload, REVIEW_REQUEST_TAG)) {
        return true;
      }
    }
    console.error(REVIEW_REQUEST_LOG, created.res.status, created.payload);
    return false;
  } catch (error) {
    console.error(REVIEW_REQUEST_LOG, error);
    return false;
  }
}

export async function getMailchimpMemberForReviewRequest(
  email: string,
  env: EnvMap = process.env,
  fetchImpl: FetchLike = fetch,
): Promise<{ found: true; alreadyTagged: boolean } | { found: false } | null> {
  const cfg = resolveReviewRequestAudience(env);
  if (!cfg) return null;
  const hash = mailchimpSubscriberHash(email);
  try {
    const got = await mailchimpRequest(
      memberUrl(cfg.dc, cfg.audienceId, hash),
      cfg.apiKey,
      fetchImpl,
      { method: "GET" },
    );
    if (got.res.status === 404) {
      console.error(REVIEW_REQUEST_LOG, "subscriber missing", hash);
      return { found: false };
    }
    if (!got.res.ok) {
      console.error(REVIEW_REQUEST_LOG, got.res.status, got.payload);
      return null;
    }
    return {
      found: true,
      alreadyTagged: memberHasTag(got.payload, REVIEW_REQUEST_TAG),
    };
  } catch (error) {
    console.error(REVIEW_REQUEST_LOG, error);
    return null;
  }
}

export async function addReviewRequestTagToMember(
  email: string,
  env: EnvMap = process.env,
  fetchImpl: FetchLike = fetch,
): Promise<boolean> {
  const cfg = resolveReviewRequestAudience(env);
  if (!cfg) return false;
  const hash = mailchimpSubscriberHash(email);
  try {
    const added = await mailchimpRequest(
      `${memberUrl(cfg.dc, cfg.audienceId, hash)}/tags`,
      cfg.apiKey,
      fetchImpl,
      {
        method: "POST",
        body: { tags: [{ name: REVIEW_REQUEST_TAG, status: "active" }] },
      },
    );
    if (added.res.ok) return true;
    console.error(REVIEW_REQUEST_LOG, added.res.status, added.payload);
    return false;
  } catch (error) {
    console.error(REVIEW_REQUEST_LOG, error);
    return false;
  }
}

/** Find-or-create `review-request`, GET member by hash, add tag. Never upserts a member. */
export async function tagMailchimpReviewRequest(
  email: string,
  env: EnvMap = process.env,
  fetchImpl: FetchLike = fetch,
): Promise<void> {
  const trimmed = presentString(email);
  if (!trimmed) {
    console.error(REVIEW_REQUEST_LOG, "no customer email");
    return;
  }
  try {
    const tagReady = await findOrCreateReviewRequestTag(env, fetchImpl);
    if (!tagReady) return;
    const member = await getMailchimpMemberForReviewRequest(
      trimmed,
      env,
      fetchImpl,
    );
    if (!member || !member.found) return;
    if (member.alreadyTagged) {
      console.error(REVIEW_REQUEST_LOG, "already tagged");
      return;
    }
    await addReviewRequestTagToMember(trimmed, env, fetchImpl);
  } catch (error) {
    console.error(REVIEW_REQUEST_LOG, error);
  }
}

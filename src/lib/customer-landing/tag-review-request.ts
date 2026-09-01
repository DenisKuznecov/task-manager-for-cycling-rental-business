import { fetchSourceOrderDocument } from "../booqable/fetch-source-snapshot.ts";
import { isRecord, presentString } from "./dest-error.ts";
import { tagMailchimpReviewRequest } from "./mailchimp.ts";
import type { EnvMap } from "./types.ts";

const LOG_PREFIX = "[review-request/mailchimp]";

function customerRef(
  document: unknown,
): { id: string; type: string } | null {
  if (!isRecord(document) || !isRecord(document.data)) return null;
  const relationships = isRecord(document.data.relationships)
    ? document.data.relationships
    : null;
  const customer = relationships && isRecord(relationships.customer)
    ? relationships.customer
    : null;
  const data = customer && isRecord(customer.data) ? customer.data : null;
  if (!data || typeof data.id !== "string" || typeof data.type !== "string") {
    return null;
  }
  return { id: data.id, type: data.type };
}

/** Order JSON:API customer `attributes.email`. No workshop apply / snapshot type. */
export function orderCustomerEmail(document: unknown): string | null {
  const ref = customerRef(document);
  if (!ref || !isRecord(document) || !Array.isArray(document.included)) {
    return null;
  }
  for (const entry of document.included) {
    if (!isRecord(entry) || entry.id !== ref.id || entry.type !== ref.type) {
      continue;
    }
    const attrs = isRecord(entry.attributes) ? entry.attributes : {};
    return typeof attrs.email === "string"
      ? (presentString(attrs.email) ?? null)
      : null;
  }
  return null;
}

export async function tagReviewRequestForOrder(
  orderId: string,
  options: {
    env?: EnvMap;
    fetchOrder?: (id: string) => Promise<unknown>;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<void> {
  const env = options.env ?? process.env;
  const fetchOrder = options.fetchOrder ?? fetchSourceOrderDocument;
  try {
    const document = await fetchOrder(orderId);
    const email = orderCustomerEmail(document);
    if (!email) {
      console.error(LOG_PREFIX, "no customer email", orderId);
      return;
    }
    await tagMailchimpReviewRequest(email, env, options.fetchImpl ?? fetch);
  } catch (error) {
    console.error(LOG_PREFIX, error);
  }
}

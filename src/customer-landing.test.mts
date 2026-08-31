import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  InvalidLandingCustomerError,
  parseLandingCustomer,
  type CustomerPassport,
} from "./lib/booqable/parse-landing-customer.ts";
import { destNextAction } from "./lib/customer-landing/dest-error.ts";
import { googleContactPerson, writeGoogleContact } from "./lib/customer-landing/google.ts";
import { holdedContactBody, writeHoldedContact } from "./lib/customer-landing/holded.ts";
import { landBooqableCustomer } from "./lib/customer-landing/land-customer.ts";
import {
  mailchimpDataCenter,
  mailchimpMemberBody,
  mailchimpSubscriberHash,
  writeMailchimpMember,
} from "./lib/customer-landing/mailchimp.ts";
import type {
  DestIds,
  DestName,
  DestWriter,
  LandingStatuses,
  LandingStore,
} from "./lib/customer-landing/types.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = join(root, "src");

function readSrc(relativePath: string): string {
  return readFileSync(join(srcRoot, relativePath), "utf8");
}

function collectTsFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTsFiles(path));
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      files.push(path);
    }
  }
  return files;
}

function loadLandingFixture(): unknown {
  return JSON.parse(
    readFileSync(
      join(srcRoot, "lib/booqable/fixtures/landing-customer.json"),
      "utf8",
    ),
  );
}

function passport(overrides: Partial<CustomerPassport> = {}): CustomerPassport {
  return {
    booqableCustomerId: "cust-land-1",
    name: "Landing Rider",
    email: "landing@example.test",
    phone: "+34000000000",
    birthday: "1990-05-17",
    address: {
      street: "Carrer de Mallorca 1",
      city: "Barcelona",
      region: "Catalonia",
      zip: "08001",
      country: "Spain",
    },
    ...overrides,
  };
}

function memoryStore(initial: DestIds = { google: null, holded: null, mailchimp: null }): LandingStore & {
  identities: CustomerPassport[];
  saved: LandingStatuses[];
} {
  const identities: CustomerPassport[] = [];
  const saved: LandingStatuses[] = [];
  let storedIds = { ...initial };
  return {
    identities,
    saved,
    async upsertIdentity(next) {
      identities.push(next);
      return { storedIds: { ...storedIds } };
    },
    async saveStatuses(_id, statuses) {
      saved.push(statuses);
      storedIds = {
        google: statuses.google.id,
        holded: statuses.holded.id,
        mailchimp: statuses.mailchimp.id,
      };
    },
    async saveStatusesByCustomerId(_id, statuses) {
      saved.push(statuses);
      storedIds = {
        google: statuses.google.id,
        holded: statuses.holded.id,
        mailchimp: statuses.mailchimp.id,
      };
    },
  };
}

function writersFromResults(
  results: Record<DestName, { ok: true; destId: string } | { ok: false; error: string }>,
  seen: Array<{ name: DestName; storedId: string | null }>,
): DestWriter[] {
  return (["google", "holded", "mailchimp"] as const).map((name) => ({
    name,
    async write({ storedId }) {
      seen.push({ name, storedId });
      return results[name];
    },
  }));
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("landing parser maps GET passport including address and ignores form-only fields", () => {
  const parsed = parseLandingCustomer(loadLandingFixture());
  assert.equal(parsed.booqableCustomerId, "cust-land-1");
  assert.equal(parsed.name, "Landing Rider");
  assert.equal(parsed.email, "landing@example.test");
  assert.equal(parsed.phone, "+34000000000");
  assert.equal(parsed.birthday, "1990-05-17");
  assert.deepEqual(parsed.address, {
    street: "Carrer de Mallorca 1",
    city: "Barcelona",
    region: "Catalonia",
    zip: "08001",
    country: "Spain",
  });

  assert.throws(() => parseLandingCustomer({ event: "customer.created", "data[name]": "Form Name" }), InvalidLandingCustomerError);
  assert.throws(() => parseLandingCustomer({ data: { id: "x", type: "orders" } }), InvalidLandingCustomerError);
});

test("company records parse like people", () => {
  const doc = loadLandingFixture() as {
    data: { attributes: Record<string, unknown> };
  };
  doc.data.attributes.legal_type = "commercial";
  doc.data.attributes.name = "Echelon SL";
  const parsed = parseLandingCustomer(doc);
  assert.equal(parsed.name, "Echelon SL");
  assert.equal(parsed.email, "landing@example.test");
  assert.ok(parsed.address);
});

test("land uses GET by webhook id, not the form body", async () => {
  const store = memoryStore();
  const seen: Array<{ name: DestName; storedId: string | null }> = [];
  let fetchedId: string | null = null;
  const result = await landBooqableCustomer("cust-land-1", {
    store,
    fetchCustomer: async (id) => {
      fetchedId = id;
      return loadLandingFixture();
    },
    writers: writersFromResults(
      {
        google: { ok: true, destId: "people/c-1" },
        holded: { ok: true, destId: "holded-1" },
        mailchimp: { ok: true, destId: "mc-1" },
      },
      seen,
    ),
  });
  assert.equal(fetchedId, "cust-land-1");
  assert.equal(result.ok, true);
  if (!result.ok || result.ignored) throw new Error("expected landed statuses");
  assert.equal(store.identities[0]?.name, "Landing Rider");
  assert.equal(store.identities[0]?.address?.street, "Carrer de Mallorca 1");
  assert.equal(result.statuses.google.status, "green");
  assert.equal(result.statuses.holded.status, "green");
  assert.equal(result.statuses.mailchimp.status, "green");
});

test("second land reuses stored dest ids", async () => {
  const store = memoryStore({
    google: "people/c-1",
    holded: "holded-1",
    mailchimp: "mc-1",
  });
  const seen: Array<{ name: DestName; storedId: string | null }> = [];
  const result = await landBooqableCustomer("cust-land-1", {
    store,
    fetchCustomer: async () => loadLandingFixture(),
    writers: writersFromResults(
      {
        google: { ok: true, destId: "people/c-1" },
        holded: { ok: true, destId: "holded-1" },
        mailchimp: { ok: true, destId: "mc-1" },
      },
      seen,
    ),
  });
  assert.equal(result.ok, true);
  assert.deepEqual(
    seen.map((row) => row.storedId),
    ["people/c-1", "holded-1", "mc-1"],
  );
});

test("Mailchimp failure leaves the other dests green", async () => {
  const store = memoryStore();
  const result = await landBooqableCustomer("cust-land-1", {
    store,
    fetchCustomer: async () => loadLandingFixture(),
    writers: writersFromResults(
      {
        google: { ok: true, destId: "people/c-1" },
        holded: { ok: true, destId: "holded-1" },
        mailchimp: {
          ok: false,
          error: destNextAction("Mailchimp", "audience rejected the member (400)."),
        },
      },
      [],
    ),
  });
  assert.equal(result.ok, true);
  if (!result.ok || result.ignored) throw new Error("expected landed statuses");
  assert.equal(result.statuses.google.status, "green");
  assert.equal(result.statuses.holded.status, "green");
  assert.equal(result.statuses.mailchimp.status, "red");
  assert.match(result.statuses.mailchimp.error ?? "", /Mailchimp/);
  assert.match(result.statuses.mailchimp.error ?? "", /Save the customer in Booqable again/);
});

test("preview env writes nothing", async () => {
  let fetched = false;
  let wrote = false;
  const result = await landBooqableCustomer("cust-land-1", {
    env: { VERCEL_ENV: "preview" },
    fetchCustomer: async () => {
      fetched = true;
      return loadLandingFixture();
    },
    writers: [
      {
        name: "google",
        async write() {
          wrote = true;
          return { ok: true, destId: "x" };
        },
      },
    ],
    store: memoryStore(),
  });
  assert.deepEqual(result, { ok: true, ignored: true });
  assert.equal(fetched, false);
  assert.equal(wrote, false);
});

test("missing dest env marks that dest red and still runs the others", async () => {
  const env = {
    HOLDED_API_KEY: "holded-test",
    MAILCHIMP_API_KEY: "key-us21",
    MAILCHIMP_AUDIENCE_ID: "audience-test",
  };
  const store = memoryStore();
  const seen: DestName[] = [];
  const result = await landBooqableCustomer("cust-land-1", {
    store,
    fetchCustomer: async () => loadLandingFixture(),
    writers: [
      {
        name: "google",
        write: async (input) => {
          seen.push("google");
          return writeGoogleContact(input, env, async () => {
            throw new Error("google fetch must not run without env");
          });
        },
      },
      {
        name: "holded",
        write: async (input) => {
          seen.push("holded");
          return writeHoldedContact(input, env, async () =>
            jsonResponse(200, { id: "holded-1" }),
          );
        },
      },
      {
        name: "mailchimp",
        write: async (input) => {
          seen.push("mailchimp");
          return writeMailchimpMember(input, env, async () =>
            jsonResponse(200, { id: "mc-1" }),
          );
        },
      },
    ],
  });
  assert.equal(result.ok, true);
  if (!result.ok || result.ignored) throw new Error("expected landed statuses");
  assert.deepEqual(seen, ["google", "holded", "mailchimp"]);
  assert.equal(result.statuses.google.status, "red");
  assert.match(result.statuses.google.error ?? "", /GOOGLE_CONTACTS/);
  assert.equal(result.statuses.holded.status, "green");
  assert.equal(result.statuses.mailchimp.status, "green");
});

test("dest payloads omit absent passport fields and do not invent them", () => {
  const sparse = passport({
    phone: null,
    birthday: null,
    address: null,
  });
  const google = googleContactPerson(sparse);
  assert.equal("phoneNumbers" in google, false);
  assert.equal("addresses" in google, false);
  assert.equal("birthdays" in google, false);
  assert.ok(google.names);
  assert.ok(google.emailAddresses);

  const holded = holdedContactBody(sparse);
  assert.equal("phone" in holded, false);
  assert.equal("billAddress" in holded, false);
  assert.equal(holded.customId, "booqable:cust-land-1");

  const mailchimp = mailchimpMemberBody(sparse, true);
  const merge = mailchimp.merge_fields as Record<string, unknown>;
  assert.equal("PHONE" in merge, false);
  assert.equal("ADDRESS" in merge, false);
  assert.equal("BIRTHDAY" in merge, false);
  assert.equal(mailchimp.email_address, "landing@example.test");
});

test("Mailchimp 200 is green even when ADDRESS is omitted from the response", async () => {
  const result = await writeMailchimpMember(
    { passport: passport(), storedId: null },
    {
      MAILCHIMP_API_KEY: "key-us21",
      MAILCHIMP_AUDIENCE_ID: "audience-test",
    },
    async () => jsonResponse(200, { id: "mc-1", merge_fields: { FNAME: "Landing" } }),
  );
  assert.deepEqual(result, { ok: true, destId: "mc-1" });
  assert.equal(mailchimpDataCenter("key-us21"), "us21");
  assert.equal(
    mailchimpSubscriberHash("landing@example.test"),
    mailchimpSubscriberHash("Landing@Example.test"),
  );
});

test("Mailchimp 4xx is red with a next action; stored id is reused on update", async () => {
  const urls: string[] = [];
  const failed = await writeMailchimpMember(
    { passport: passport({ address: null }), storedId: null },
    {
      MAILCHIMP_API_KEY: "key-us21",
      MAILCHIMP_AUDIENCE_ID: "audience-test",
    },
    async (url) => {
      urls.push(String(url));
      return jsonResponse(400, { title: "Invalid Resource" });
    },
  );
  assert.equal(failed.ok, false);
  if (failed.ok) throw new Error("expected red");
  assert.match(failed.error, /Mailchimp/);
  assert.match(failed.error, /Save the customer in Booqable again/);

  const updated = await writeMailchimpMember(
    { passport: passport({ address: null }), storedId: "stored-hash" },
    {
      MAILCHIMP_API_KEY: "key-us21",
      MAILCHIMP_AUDIENCE_ID: "audience-test",
    },
    async (url) => {
      urls.push(String(url));
      return jsonResponse(200, { id: "stored-hash" });
    },
  );
  assert.equal(updated.ok, true);
  assert.match(urls.at(-1) ?? "", /members\/stored-hash$/);
});

test("Google and Holded update the stored id instead of creating a second contact", async () => {
  const googleCalls: string[] = [];
  const google = await writeGoogleContact(
    { passport: passport(), storedId: "people/c-stored" },
    {
      GOOGLE_CONTACTS_CLIENT_ID: "id",
      GOOGLE_CONTACTS_CLIENT_SECRET: "secret",
      GOOGLE_CONTACTS_REFRESH_TOKEN: "refresh",
    },
    async (url, init) => {
      googleCalls.push(`${init?.method ?? "GET"} ${String(url)}`);
      if (String(url).includes("oauth2.googleapis.com/token")) {
        return jsonResponse(200, { access_token: "token" });
      }
      if (String(url).includes("people/c-stored") && !String(url).includes("updateContact")) {
        return jsonResponse(200, { resourceName: "people/c-stored", etag: "etag-1" });
      }
      if (String(url).includes("updateContact")) {
        return jsonResponse(200, { resourceName: "people/c-stored" });
      }
      throw new Error(`unexpected Google URL ${String(url)}`);
    },
  );
  assert.deepEqual(google, { ok: true, destId: "people/c-stored" });
  assert.equal(
    googleCalls.some((call) => call.includes("people:createContact")),
    false,
  );

  const holdedCalls: string[] = [];
  const holded = await writeHoldedContact(
    { passport: passport(), storedId: "holded-stored" },
    { HOLDED_API_KEY: "holded-test" },
    async (url, init) => {
      holdedCalls.push(`${init?.method ?? "GET"} ${String(url)}`);
      return jsonResponse(200, { id: "holded-stored" });
    },
  );
  assert.deepEqual(holded, { ok: true, destId: "holded-stored" });
  assert.equal(
    holdedCalls.some((call) => call.startsWith("POST ")),
    false,
  );
  assert.equal(
    holdedCalls.some((call) => call.startsWith("PUT ") && call.includes("holded-stored")),
    true,
  );
});

function googleEnv() {
  return {
    GOOGLE_CONTACTS_CLIENT_ID: "id",
    GOOGLE_CONTACTS_CLIENT_SECRET: "secret",
    GOOGLE_CONTACTS_REFRESH_TOKEN: "refresh",
  };
}

test("first Google land creates when search finds nothing and updates a search hit", async () => {
  const created: string[] = [];
  const createdWhenEmpty = await writeGoogleContact(
    { passport: passport(), storedId: null },
    googleEnv(),
    async (url, init) => {
      const href = String(url);
      if (href.includes("oauth2.googleapis.com/token")) {
        return jsonResponse(200, { access_token: "token" });
      }
      if (href.includes("people:searchContacts")) {
        return jsonResponse(200, { results: [] });
      }
      if (href.includes("people:createContact")) {
        created.push(href);
        return jsonResponse(200, { resourceName: "people/c-new" });
      }
      throw new Error(`unexpected Google URL ${href} ${init?.method}`);
    },
  );
  assert.deepEqual(createdWhenEmpty, { ok: true, destId: "people/c-new" });
  assert.equal(created.length, 1);

  const updatedCalls: string[] = [];
  const searchHit = await writeGoogleContact(
    { passport: passport(), storedId: null },
    googleEnv(),
    async (url, init) => {
      const href = String(url);
      updatedCalls.push(`${init?.method ?? "GET"} ${href}`);
      if (href.includes("oauth2.googleapis.com/token")) {
        return jsonResponse(200, { access_token: "token" });
      }
      if (href.includes("people:searchContacts")) {
        return jsonResponse(200, {
          results: [
            {
              person: {
                resourceName: "people/c-found",
                emailAddresses: [{ value: "landing@example.test" }],
              },
            },
          ],
        });
      }
      if (href.includes("people/c-found") && !href.includes("updateContact")) {
        return jsonResponse(200, { resourceName: "people/c-found", etag: "etag-1" });
      }
      if (href.includes("updateContact")) {
        return jsonResponse(200, { resourceName: "people/c-found" });
      }
      throw new Error(`unexpected Google URL ${href}`);
    },
  );
  assert.deepEqual(searchHit, { ok: true, destId: "people/c-found" });
  assert.equal(
    updatedCalls.some((call) => call.includes("people:createContact")),
    false,
  );
});

test("Google search failure is red and does not create", async () => {
  const created: string[] = [];
  const failed = await writeGoogleContact(
    { passport: passport(), storedId: null },
    googleEnv(),
    async (url) => {
      const href = String(url);
      if (href.includes("oauth2.googleapis.com/token")) {
        return jsonResponse(200, { access_token: "token" });
      }
      if (href.includes("people:searchContacts")) {
        return jsonResponse(500, { error: "unavailable" });
      }
      if (href.includes("people:createContact")) {
        created.push(href);
        return jsonResponse(200, { resourceName: "people/c-dup" });
      }
      throw new Error(`unexpected Google URL ${href}`);
    },
  );
  assert.equal(failed.ok, false);
  if (failed.ok) throw new Error("expected red");
  assert.match(failed.error, /Google Contacts/);
  assert.match(failed.error, /searchContacts failed/);
  assert.deepEqual(created, []);
});

test("first Holded land creates when list misses and updates a list hit", async () => {
  const methods: string[] = [];
  const created = await writeHoldedContact(
    { passport: passport(), storedId: null },
    { HOLDED_API_KEY: "holded-test" },
    async (url, init) => {
      methods.push(`${init?.method ?? "GET"} ${String(url)}`);
      if ((init?.method ?? "GET") === "GET") {
        return jsonResponse(200, []);
      }
      return jsonResponse(200, { id: 7788 });
    },
  );
  assert.deepEqual(created, { ok: true, destId: "7788" });
  assert.equal(methods.some((call) => call.startsWith("POST ")), true);

  const hitMethods: string[] = [];
  const hit = await writeHoldedContact(
    { passport: passport(), storedId: null },
    { HOLDED_API_KEY: "holded-test" },
    async (url, init) => {
      hitMethods.push(`${init?.method ?? "GET"} ${String(url)}`);
      if ((init?.method ?? "GET") === "GET") {
        return jsonResponse(200, [
          { id: 99, email: "landing@example.test" },
        ]);
      }
      return jsonResponse(200, { id: 99 });
    },
  );
  assert.deepEqual(hit, { ok: true, destId: "99" });
  assert.equal(hitMethods.some((call) => call.startsWith("POST ")), false);
  assert.equal(
    hitMethods.some((call) => call.startsWith("PUT ") && call.includes("/99")),
    true,
  );
});

test("Holded list failure is red and does not create", async () => {
  const methods: string[] = [];
  const failed = await writeHoldedContact(
    { passport: passport(), storedId: null },
    { HOLDED_API_KEY: "holded-test" },
    async (url, init) => {
      methods.push(`${init?.method ?? "GET"} ${String(url)}`);
      return jsonResponse(503, { error: "down" });
    },
  );
  assert.equal(failed.ok, false);
  if (failed.ok) throw new Error("expected red");
  assert.match(failed.error, /Holded/);
  assert.match(failed.error, /list contacts failed/);
  assert.equal(methods.some((call) => call.startsWith("POST ")), false);
});

test("two lands on one unseeded store reuse first saveStatuses dest ids", async () => {
  const store = memoryStore();
  const seen: Array<{ name: DestName; storedId: string | null }> = [];
  const writers = writersFromResults(
    {
      google: { ok: true, destId: "people/c-1" },
      holded: { ok: true, destId: "holded-1" },
      mailchimp: { ok: true, destId: "mc-1" },
    },
    seen,
  );
  const first = await landBooqableCustomer("cust-land-1", {
    store,
    fetchCustomer: async () => loadLandingFixture(),
    writers,
  });
  const second = await landBooqableCustomer("cust-land-1", {
    store,
    fetchCustomer: async () => loadLandingFixture(),
    writers,
  });
  assert.equal(first.ok && !first.ignored, true);
  assert.equal(second.ok && !second.ignored, true);
  if (!first.ok || first.ignored) throw new Error("expected first land");
  assert.deepEqual(seen.slice(0, 3).map((row) => row.storedId), [null, null, null]);
  assert.deepEqual(seen.slice(3).map((row) => row.storedId), [
    first.statuses.google.id,
    first.statuses.holded.id,
    first.statuses.mailchimp.id,
  ]);
  assert.deepEqual(store.saved[0], first.statuses);
});

test("empty Google person is red and a writer throw still saves other dests", async () => {
  const empty = await writeGoogleContact({
    passport: passport({
      name: null,
      email: null,
      phone: null,
      birthday: null,
      address: null,
    }),
    storedId: null,
  });
  assert.equal(empty.ok, false);
  if (empty.ok) throw new Error("expected red");
  assert.match(empty.error, /no writable fields/);

  const store = memoryStore();
  const result = await landBooqableCustomer("cust-land-1", {
    store,
    fetchCustomer: async () => loadLandingFixture(),
    writers: [
      {
        name: "google",
        async write() {
          throw new Error("boom");
        },
      },
      {
        name: "holded",
        async write() {
          return { ok: true, destId: "holded-1" };
        },
      },
      {
        name: "mailchimp",
        async write() {
          return { ok: true, destId: "mc-1" };
        },
      },
    ],
  });
  assert.equal(result.ok, true);
  if (!result.ok || result.ignored) throw new Error("expected landed statuses");
  assert.equal(result.statuses.google.status, "red");
  assert.match(result.statuses.google.error ?? "", /write threw/);
  assert.equal(result.statuses.holded.status, "green");
  assert.equal(result.statuses.mailchimp.status, "green");
  assert.equal(store.saved.length, 1);
  assert.equal(store.saved[0]?.holded.id, "holded-1");
});

test("Holded numeric id is persisted as a string", async () => {
  const result = await writeHoldedContact(
    { passport: passport(), storedId: null },
    { HOLDED_API_KEY: "holded-test" },
    async (_url, init) => {
      if ((init?.method ?? "GET") === "GET") return jsonResponse(200, []);
      return jsonResponse(200, { id: 12345 });
    },
  );
  assert.deepEqual(result, { ok: true, destId: "12345" });
});

test("Mailchimp stored-id 404 recreates via email hash", async () => {
  const urls: string[] = [];
  const emailHash = mailchimpSubscriberHash("landing@example.test");
  const result = await writeMailchimpMember(
    { passport: passport({ address: null }), storedId: "old-hash" },
    {
      MAILCHIMP_API_KEY: "key-us21",
      MAILCHIMP_AUDIENCE_ID: "audience-test",
    },
    async (url) => {
      urls.push(String(url));
      if (String(url).endsWith("/old-hash")) {
        return jsonResponse(404, { title: "Resource Not Found" });
      }
      return jsonResponse(200, { id: emailHash });
    },
  );
  assert.deepEqual(result, { ok: true, destId: emailHash });
  assert.match(urls[0] ?? "", /members\/old-hash$/);
  assert.match(urls.at(-1) ?? "", new RegExp(`members/${emailHash}$`));
});

test("address identifier address parses; whitespace and ISO birthday do not land", () => {
  const doc = loadLandingFixture() as {
    data: { attributes: { properties: Record<string, unknown> } };
    included: Array<{ attributes: Record<string, unknown> }>;
  };
  delete doc.included[0].attributes.property_type;
  doc.included[0].attributes.identifier = "address";
  const byIdentifier = parseLandingCustomer(doc);
  assert.equal(byIdentifier.address?.street, "Carrer de Mallorca 1");

  const whitespace = loadLandingFixture() as {
    data: { attributes: { properties: Record<string, unknown>; name?: unknown } };
  };
  whitespace.data.attributes.properties.birthday_date = "   ";
  whitespace.data.attributes.name = "   ";
  const parsedWhitespace = parseLandingCustomer(whitespace);
  assert.equal(parsedWhitespace.birthday, null);
  assert.equal(parsedWhitespace.name, null);

  const iso = loadLandingFixture() as {
    data: { attributes: { properties: Record<string, unknown> } };
  };
  iso.data.attributes.properties.birthday_date = "1990-05-17T00:00:00Z";
  assert.equal(parseLandingCustomer(iso).birthday, null);
});

test("audience id is read from env and not hardcoded", () => {
  const mailchimp = readSrc("lib/customer-landing/mailchimp.ts");
  const land = readSrc("lib/customer-landing/land-customer.ts");
  assert.doesNotMatch(mailchimp, /74fcbaad78/);
  assert.doesNotMatch(land, /74fcbaad78/);
  assert.match(mailchimp, /MAILCHIMP_AUDIENCE_ID/);
});

test("only src/lib/booqable calls Booqable and landing stays off client surfaces", () => {
  const fetchSource = readSrc("lib/booqable/fetch-source-snapshot.ts");
  assert.match(fetchSource, /\/api\/4\/customers\//);
  assert.match(fetchSource, /include=properties/);

  for (const file of collectTsFiles(srcRoot)) {
    const relative = file.slice(srcRoot.length + 1);
    const source = readFileSync(file, "utf8");
    if (relative !== "lib/booqable/fetch-source-snapshot.ts") {
      assert.doesNotMatch(
        source,
        /\/api\/4\/customers\//,
        `${relative} must not call Booqable`,
      );
    }
    if (
      relative.startsWith("app/") &&
      !relative.startsWith("app/api/webhooks/booqable/") &&
      !relative.startsWith("app/customers/")
    ) {
      assert.doesNotMatch(
        source,
        /from\s+["']@\/src\/lib\/customer-landing/,
        `${relative} must not import customer-landing`,
      );
    }
  }

  const nav = readSrc("ui/layouts/nav-config.ts");
  assert.match(nav, /label: "Customers"/);
  assert.match(nav, /href: "\/customers"/);
});

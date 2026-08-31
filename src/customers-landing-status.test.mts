import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { destNextAction } from "./lib/customer-landing/dest-error.ts";
import { holdedContactBody } from "./lib/customer-landing/holded.ts";
import { landLocalCustomer } from "./lib/customer-landing/land-customer.ts";
import {
  toLandingListRow,
  type CustomerLandingDbRow,
} from "./lib/customer-landing/status-rows.ts";
import { writeMailchimpMember } from "./lib/customer-landing/mailchimp.ts";
import type {
  CustomerPassport,
  DestWriter,
  LandingStatuses,
  LandingStore,
  LocalCustomerRow,
} from "./lib/customer-landing/types.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = join(root, "src");

function readSrc(relativePath: string): string {
  return readFileSync(join(srcRoot, relativePath), "utf8");
}

function localRow(
  overrides: Partial<LocalCustomerRow> = {},
): LocalCustomerRow {
  return {
    id: "local-1",
    booqableCustomerId: null,
    name: "Bike Fit Rider",
    email: null,
    phone: null,
    birthday: null,
    storedIds: { google: null, holded: null, mailchimp: null },
    ...overrides,
  };
}

function memoryStore(): LandingStore & {
  savedById: string[];
  saved: LandingStatuses[];
} {
  const savedById: string[] = [];
  const saved: LandingStatuses[] = [];
  return {
    savedById,
    saved,
    async upsertIdentity() {
      return { storedIds: { google: null, holded: null, mailchimp: null } };
    },
    async saveStatuses() {},
    async saveStatusesByCustomerId(id, statuses) {
      savedById.push(id);
      saved.push(statuses);
    },
  };
}

function dbRow(
  overrides: Partial<CustomerLandingDbRow> = {},
): CustomerLandingDbRow {
  return {
    id: "cust-1",
    name: "Ada",
    booqable_customer_id: "bq-1",
    landing_google_status: "green",
    landing_google_error: null,
    landing_holded_status: "green",
    landing_holded_error: null,
    landing_mailchimp_status: "red",
    landing_mailchimp_error: destNextAction(
      "Mailchimp",
      "an email is required.",
    ),
    ...overrides,
  };
}

test("Customers nav opens /customers", () => {
  const nav = readSrc("ui/layouts/nav-config.ts");
  assert.match(nav, /label: "Customers"/);
  assert.match(nav, /href: "\/customers"/);
  assert.match(nav, /roles: \["admin", "manager"\]/);
});

test("list mapper includes local-only rows and never-landed is not red", () => {
  const local = toLandingListRow(
    dbRow({
      id: "local-1",
      name: "   ",
      booqable_customer_id: null,
      landing_google_status: null,
      landing_google_error: null,
      landing_holded_status: null,
      landing_holded_error: null,
      landing_mailchimp_status: null,
      landing_mailchimp_error: null,
    }),
  );
  assert.equal(local.name, "Unknown");
  assert.equal(local.isLocalOnly, true);
  assert.equal(local.google.status, null);
  assert.equal(local.holded.status, null);
  assert.equal(local.mailchimp.status, null);

  const mixed = toLandingListRow(dbRow());
  assert.equal(mixed.isLocalOnly, false);
  assert.equal(mixed.google.status, "green");
  assert.equal(mixed.holded.status, "green");
  assert.equal(mixed.mailchimp.status, "red");
  assert.match(mixed.mailchimp.error ?? "", /Mailchimp/);
});

test("loader lists every customer and page uses DataLoadError plus pager", () => {
  const loader = readSrc("lib/customer-landing/load-status-page.ts");
  assert.match(loader, /from\("customers"\)/);
  assert.doesNotMatch(loader, /\.not\(\s*["']booqable_customer_id/);
  assert.doesNotMatch(loader, /\.neq\(\s*["']booqable_customer_id/);
  assert.match(loader, /createClient\(/);
  assert.match(loader, /withAuth/);
  assert.match(loader, /workshopSyncAllowed/);
  assert.match(loader, /get_user_role/);
  assert.match(loader, /role !== "admin"/);
  assert.match(loader, /role !== "manager"/);
  assert.match(loader, /landLocalCustomer:/);
  assert.match(loader, /loadCustomersLandingPage:/);
  assert.match(loader, /customers: \[\]/);
  assert.match(loader, /error\.message/);

  const page = readSrc("app/customers/page.tsx");
  assert.match(page, /DataLoadError/);
  assert.match(page, /loadCustomersLandingPage/);
  assert.match(page, /page\?: string/);

  const layout = readSrc("app/customers/layout.tsx");
  assert.match(layout, /redirect\("\/login"\)/);
  assert.match(layout, /redirect\("\/pending"\)/);
  assert.match(layout, /redirect\("\/partner\/overview"\)/);
  assert.match(layout, /redirect\("\/unauthorized"\)/);
});

test("table shows local badge and upload only on local-only rows", () => {
  const table = readSrc("app/customers/_components/CustomersLandingTable.tsx");
  assert.match(table, /Not from Booqable/);
  assert.match(table, /isLocalOnly/);
  assert.match(table, />\s*Upload\s*</);
  assert.match(table, /variant="success"/);
  assert.match(table, /variant="error"/);
  assert.match(table, /variant="neutral"/);
  assert.match(table, /landLocalCustomerAction/);
});

test("local upload with no email reds Mailchimp and keeps a local next action", async () => {
  const store = memoryStore();
  let mailchimpFetch = 0;
  const result = await landLocalCustomer("local-1", {
    store,
    loadRow: async () => localRow(),
    writers: [
      {
        name: "google",
        async write() {
          return { ok: true, destId: "people/local-1" };
        },
      },
      {
        name: "holded",
        async write() {
          return { ok: true, destId: "holded-local-1" };
        },
      },
      {
        name: "mailchimp",
        write: (input) =>
          writeMailchimpMember(
            input,
            {
              MAILCHIMP_API_KEY: "key-us21",
              MAILCHIMP_AUDIENCE_ID: "audience-test",
            },
            async () => {
              mailchimpFetch += 1;
              throw new Error("Mailchimp fetch must not run without email");
            },
          ),
      },
    ],
  });

  assert.equal(result.ok, true);
  if (!result.ok || result.ignored) throw new Error("expected landed statuses");
  assert.equal(result.statuses.google.status, "green");
  assert.equal(result.statuses.holded.status, "green");
  assert.equal(result.statuses.mailchimp.status, "red");
  assert.match(result.statuses.mailchimp.error ?? "", /Mailchimp/);
  assert.match(result.statuses.mailchimp.error ?? "", /email is required/);
  assert.match(result.statuses.mailchimp.error ?? "", /Upload again after fixing this/);
  assert.doesNotMatch(
    result.statuses.mailchimp.error ?? "",
    /Save the customer in Booqable/,
  );
  assert.equal(mailchimpFetch, 0);
  assert.deepEqual(store.savedById, ["local-1"]);
  assert.deepEqual(store.saved, [result.statuses]);
});

test("local dest 4xx reds that dest, keeps other greens, and persists all three", async () => {
  const store = memoryStore();
  const result = await landLocalCustomer("local-1", {
    store,
    loadRow: async () => localRow({ email: "a@b.test" }),
    writers: [
      {
        name: "google",
        async write() {
          return { ok: true, destId: "people/local-1" };
        },
      },
      {
        name: "holded",
        async write() {
          return { ok: true, destId: "holded-local-1" };
        },
      },
      {
        name: "mailchimp",
        write: (input) =>
          writeMailchimpMember(
            input,
            {
              MAILCHIMP_API_KEY: "key-us21",
              MAILCHIMP_AUDIENCE_ID: "audience-test",
            },
            async () =>
              new Response(JSON.stringify({ title: "Invalid Resource" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
              }),
          ),
      },
    ],
  });

  assert.equal(result.ok, true);
  if (!result.ok || result.ignored) throw new Error("expected landed statuses");
  assert.equal(result.statuses.google.status, "green");
  assert.equal(result.statuses.holded.status, "green");
  assert.equal(result.statuses.mailchimp.status, "red");
  assert.match(result.statuses.mailchimp.error ?? "", /Mailchimp/);
  assert.match(
    result.statuses.mailchimp.error ?? "",
    /Upload again after fixing this/,
  );
  assert.doesNotMatch(
    result.statuses.mailchimp.error ?? "",
    /Save the customer in Booqable/,
  );
  assert.deepEqual(store.savedById, ["local-1"]);
  assert.deepEqual(store.saved, [result.statuses]);
});

test("Booqable-keyed landLocalCustomer does not write dests", async () => {
  let wrote = false;
  const store = memoryStore();
  const result = await landLocalCustomer("bq-row", {
    store,
    loadRow: async () => localRow({ booqableCustomerId: "cust-land-1" }),
    writers: [
      {
        name: "google",
        async write() {
          wrote = true;
          return { ok: true, destId: "x" };
        },
      },
      {
        name: "holded",
        async write() {
          wrote = true;
          return { ok: true, destId: "y" };
        },
      },
      {
        name: "mailchimp",
        async write() {
          wrote = true;
          return { ok: true, destId: "z" };
        },
      },
    ],
  });
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("expected refusal");
  assert.equal(wrote, false);
  assert.deepEqual(store.saved, []);
  assert.deepEqual(store.savedById, []);
});

test("preview env writes nothing for local upload", async () => {
  let loaded = false;
  let wrote = false;
  let saved = false;
  const result = await landLocalCustomer("local-1", {
    env: { VERCEL_ENV: "preview" },
    loadRow: async () => {
      loaded = true;
      return localRow();
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
    store: {
      async saveStatusesByCustomerId() {
        saved = true;
      },
    },
  });
  assert.deepEqual(result, { ok: true, ignored: true });
  assert.equal(loaded, false);
  assert.equal(wrote, false);
  assert.equal(saved, false);
});

test("local land does not GET Booqable or invent address", async () => {
  const seen: CustomerPassport[] = [];
  const result = await landLocalCustomer("local-1", {
    store: memoryStore(),
    loadRow: async () => localRow({ name: "Local", email: "a@b.test" }),
    writers: (["google", "holded", "mailchimp"] as const).map((name) => ({
      name,
      async write({ passport }) {
        seen.push(passport);
        return { ok: true, destId: name };
      },
    })) as DestWriter[],
  });
  assert.equal(result.ok, true);
  assert.equal(seen[0]?.address, null);
  assert.equal(seen[0]?.booqableCustomerId, "");
  const holded = holdedContactBody({
    booqableCustomerId: "",
    name: "Local",
    email: "a@b.test",
    phone: null,
    birthday: null,
    address: null,
  });
  assert.equal("customId" in holded, false);
});

test("page and action do not use the service role", () => {
  const files = [
    "lib/customer-landing/load-status-page.ts",
    "app/customers/page.tsx",
    "app/customers/layout.tsx",
    "app/customers/_components/CustomersLandingTable.tsx",
    "lib/customers.ts",
  ];
  for (const file of files) {
    const source = readSrc(file);
    assert.doesNotMatch(
      source,
      /createServiceRoleClient|SUPABASE_SERVICE_ROLE_KEY/,
      `${file} must not use the service role`,
    );
  }

  const customersLib = readSrc("lib/customers.ts");
  assert.doesNotMatch(customersLib, /loadCustomersLandingPage/);
  assert.doesNotMatch(customersLib, /landing_google_status/);

  const partner = readSrc("app/partner/(me)/customers/page.tsx");
  assert.doesNotMatch(partner, /loadCustomersLandingPage/);
  assert.doesNotMatch(partner, /landLocalCustomer/);

  const migration = readFileSync(
    join(root, "supabase/migrations/20260831140000_customers_landing_staff_update.sql"),
    "utf8",
  );
  assert.match(migration, /Staff can update customer landing status/);
  assert.match(migration, /FOR UPDATE/);
  assert.match(migration, /REVOKE UPDATE ON TABLE public.customers FROM authenticated;/);
  assert.match(
    migration,
    /GRANT UPDATE \(\s*landing_google_id,\s*landing_google_status,\s*landing_google_error,\s*landing_holded_id,\s*landing_holded_status,\s*landing_holded_error,\s*landing_mailchimp_id,\s*landing_mailchimp_status,\s*landing_mailchimp_error\s*\) ON TABLE public.customers TO authenticated;/,
  );
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { destNextAction } from "./lib/customer-landing/dest-error.ts";
import {
  toLandingListRow,
  type CustomerLandingDbRow,
} from "./lib/customer-landing/status-rows.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = join(root, "src");

function readSrc(relativePath: string): string {
  return readFileSync(join(srcRoot, relativePath), "utf8");
}

function dbRow(
  overrides: Partial<CustomerLandingDbRow> = {},
): CustomerLandingDbRow {
  return {
    id: "cust-1",
    name: "Ada",
    email: null,
    phone: null,
    birthday: null,
    address_street: null,
    address_city: null,
    address_region: null,
    address_zip: null,
    address_country: null,
    booqable_customer_id: "bq-1",
    google_status: "green",
    google_error: null,
    holded_status: "green",
    holded_error: null,
    mailchimp_status: "red",
    mailchimp_error: destNextAction("Mailchimp", "an email is required."),
    ...overrides,
  };
}

test("Customers nav opens /customers", () => {
  const nav = readSrc("ui/layouts/nav-config.ts");
  assert.match(nav, /label: "Customers"/);
  assert.match(nav, /href: "\/customers"/);
  assert.match(nav, /roles: \["admin", "manager"\]/);
});

test("list mapper treats empty name as Unknown and never-landed is not red", () => {
  const unnamed = toLandingListRow(
    dbRow({
      id: "cust-2",
      name: "   ",
      google_status: null,
      google_error: null,
      holded_status: null,
      holded_error: null,
      mailchimp_status: null,
      mailchimp_error: null,
    }),
  );
  assert.equal(unnamed.name, "Unknown");
  assert.equal(unnamed.google.status, null);
  assert.equal(unnamed.holded.status, null);
  assert.equal(unnamed.mailchimp.status, null);

  const mixed = toLandingListRow(dbRow());
  assert.equal(mixed.google.status, "green");
  assert.equal(mixed.holded.status, "green");
  assert.equal(mixed.mailchimp.status, "red");
  assert.match(mixed.mailchimp.error ?? "", /Mailchimp/);
});

test("list mapper formats contact fields and dashes missing ones", () => {
  const full = toLandingListRow(
    dbRow({
      email: "ada@example.test",
      phone: "+34000000000",
      birthday: "1990-05-17",
      address_street: "Carrer de Mallorca 1",
      address_city: "Barcelona",
      address_region: "Catalonia",
      address_zip: "08001",
      address_country: "Spain",
    }),
  );
  assert.equal(full.email, "ada@example.test");
  assert.equal(full.phone, "+34000000000");
  assert.equal(full.birthday, "17/05/1990");
  assert.equal(
    full.address,
    "Carrer de Mallorca 1, Barcelona, Catalonia, 08001, Spain",
  );

  const cityOnly = toLandingListRow(dbRow({ address_city: "Barcelona" }));
  assert.equal(cityOnly.address, "Barcelona");

  const streetAndCity = toLandingListRow(
    dbRow({
      address_street: "Carrer de Mallorca 1",
      address_city: "Barcelona",
    }),
  );
  assert.equal(streetAndCity.address, "Carrer de Mallorca 1, Barcelona");

  const missing = toLandingListRow(dbRow());
  assert.equal(missing.email, "—");
  assert.equal(missing.phone, "—");
  assert.equal(missing.birthday, "—");
  assert.equal(missing.address, "—");

  const unnamed = toLandingListRow(dbRow({ name: "   " }));
  assert.equal(unnamed.name, "Unknown");
  assert.equal(unnamed.email, "—");
});

test("loader lists customer_sync_list newest first and page uses DataLoadError plus query", () => {
  const loader = readSrc("lib/customer-landing/load-status-page.ts");
  assert.match(loader, /from\("customer_sync_list"\)/);
  assert.match(
    loader,
    /id, name, email, phone, birthday, address_street, address_city, address_region, address_zip, address_country, booqable_customer_id/,
  );
  assert.match(loader, /\.order\(\s*["']synced_at["'],\s*\{\s*ascending:\s*false/);
  assert.match(loader, /\.order\(\s*["']id["'],\s*\{\s*ascending:\s*false/);
  assert.match(loader, /\.ilike\(\s*["']name["']/);
  assert.doesNotMatch(loader, /\.ilike\(\s*["']email["']/);
  assert.match(loader, /replace\(\/\[,\(\)\]\/g/);
  assert.match(loader, /if \(escaped\)/);
  assert.doesNotMatch(loader, /\.order\(\s*["']name["']/);
  assert.doesNotMatch(loader, /\.order\(\s*["']updated_at["']/);
  assert.doesNotMatch(loader, /landing_at/);
  assert.doesNotMatch(loader, /createServiceRoleClient|SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(loader, /createClient\(/);
  assert.match(loader, /loadCustomersLandingPage:/);
  assert.match(loader, /customers: \[\]/);
  assert.match(loader, /error\.message/);

  const page = readSrc("app/customers/page.tsx");
  assert.match(page, /DataLoadError/);
  assert.match(page, /loadCustomersLandingPage/);
  assert.match(page, /page\?: string/);
  assert.match(page, /query\?: string/);
  assert.match(page, /typeof queryParam === "string"/);
  assert.match(page, /queryParam\.trim\(\)/);
  assert.match(page, /loadCustomersLandingPage\(page, query\)/);

  const layout = readSrc("app/customers/layout.tsx");
  assert.match(layout, /redirect\("\/login"\)/);
  assert.match(layout, /redirect\("\/pending"\)/);
  assert.match(layout, /redirect\("\/partner\/overview"\)/);
  assert.match(layout, /redirect\("\/unauthorized"\)/);
});

test("landing store upserts customer_sync and stamps synced_at", () => {
  const store = readSrc("lib/customer-landing/landing-store.ts");
  assert.match(store, /function syncStatusPatch/);
  assert.match(store, /identityUpsertRow\(passport\)/);
  assert.match(store, /if \(passport\.address\)/);
  assert.match(store, /address_street/);
  assert.match(store, /synced_at:\s*new Date\(\)\.toISOString\(\)/);
  assert.match(store, /from\("customer_sync"\)/);
  assert.match(store, /\.upsert\(/);
  assert.match(store, /onConflict:\s*["']customer_id["']/);
  assert.doesNotMatch(store, /saveStatusesByCustomerId/);
  assert.doesNotMatch(store, /\.update\(/);
});

test("table searches by name and has no upload control", () => {
  const table = readSrc("app/customers/_components/CustomersLandingTable.tsx");
  assert.doesNotMatch(table, /Upload/);
  assert.doesNotMatch(table, /landLocalCustomer/);
  assert.doesNotMatch(table, /Not from Booqable/);
  assert.doesNotMatch(table, /Search by name or email/);
  assert.match(
    table,
    /HeaderCell>Name<\/Table.HeaderCell>\s*<Table.HeaderCell>Email<\/Table.HeaderCell>\s*<Table.HeaderCell>Phone<\/Table.HeaderCell>\s*<Table.HeaderCell>Birthday<\/Table.HeaderCell>\s*<Table.HeaderCell>Address<\/Table.HeaderCell>\s*<Table.HeaderCell>Google<\/Table.HeaderCell>\s*<Table.HeaderCell>Holded<\/Table.HeaderCell>\s*<Table.HeaderCell>Mailchimp<\/Table.HeaderCell>/,
  );
  assert.match(table, /variant="success"/);
  assert.match(table, /variant="error"/);
  assert.match(table, /variant="neutral"/);
  assert.match(table, /TextField/);
  assert.match(table, /SEARCH_DEBOUNCE_MS = 300/);
  assert.match(table, /function buildHref|const buildHref/);
  assert.match(table, /params\.set\("query"/);
  assert.match(table, /router\.push\(buildHref\(search, 1\)\)/);
  assert.match(table, /router\.push\(buildHref\(query, page\)\)/);
  assert.match(table, /query\.trim\(\)/);
  assert.match(
    table,
    /query\.trim\(\)\s*\?\s*"Try adjusting your search\."\s*:\s*"This is not a full customer directory/,
  );
});

test("page does not use the service role and upload is gone", () => {
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
  assert.doesNotMatch(customersLib, /customer_sync/);

  const partner = readSrc("app/partner/(me)/customers/page.tsx");
  assert.doesNotMatch(partner, /loadCustomersLandingPage/);
  assert.doesNotMatch(partner, /landLocalCustomer/);

  const land = readSrc("lib/customer-landing/land-customer.ts");
  assert.doesNotMatch(land, /landLocalCustomer/);
  assert.doesNotMatch(land, /destLocalNextAction/);

  const migration = readFileSync(
    join(root, "supabase/migrations/20260901120000_customer_sync.sql"),
    "utf8",
  );
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.customer_sync/);
  assert.match(migration, /CREATE OR REPLACE VIEW public\.customer_sync_list/);
  assert.match(migration, /CREATE INDEX IF NOT EXISTS customer_sync_synced_at_id_desc_idx/);
  assert.match(migration, /Staff can read customer sync/);
  assert.match(
    migration,
    /DROP POLICY IF EXISTS "Staff can update customer landing status"/,
  );
  assert.doesNotMatch(migration, /CREATE POLICY "Staff can update customer landing status"/);
  assert.doesNotMatch(migration, /landing_at = updated_at/);
  assert.doesNotMatch(migration, /GRANT UPDATE \(\s*landing_/);

  const addressMigration = readFileSync(
    join(root, "supabase/migrations/20260901140000_customers_landing_address.sql"),
    "utf8",
  );
  assert.match(addressMigration, /ADD COLUMN IF NOT EXISTS address_street text/);
  assert.match(addressMigration, /ADD COLUMN IF NOT EXISTS address_city text/);
  assert.match(addressMigration, /ADD COLUMN IF NOT EXISTS address_region text/);
  assert.match(addressMigration, /ADD COLUMN IF NOT EXISTS address_zip text/);
  assert.match(addressMigration, /ADD COLUMN IF NOT EXISTS address_country text/);
  assert.match(addressMigration, /c\.email/);
  assert.match(addressMigration, /c\.phone/);
  assert.match(addressMigration, /c\.birthday/);
  assert.match(addressMigration, /c\.address_street/);
  assert.match(addressMigration, /c\.address_city/);
  assert.match(addressMigration, /c\.address_region/);
  assert.match(addressMigration, /c\.address_zip/);
  assert.match(addressMigration, /c\.address_country/);
  assert.match(addressMigration, /DROP VIEW IF EXISTS public\.customer_sync_list/);
  assert.match(addressMigration, /security_invoker = true/);
  assert.match(
    addressMigration,
    /GRANT SELECT ON TABLE public.customer_sync_list TO authenticated/,
  );
});

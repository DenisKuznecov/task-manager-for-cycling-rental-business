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

test("loader lists customer_sync_list newest first and page uses DataLoadError plus query", () => {
  const loader = readSrc("lib/customer-landing/load-status-page.ts");
  assert.match(loader, /from\("customer_sync_list"\)/);
  assert.match(loader, /\.order\(\s*["']synced_at["'],\s*\{\s*ascending:\s*false/);
  assert.match(loader, /\.order\(\s*["']id["'],\s*\{\s*ascending:\s*false/);
  assert.match(loader, /\.ilike\(\s*["']name["']/);
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
});

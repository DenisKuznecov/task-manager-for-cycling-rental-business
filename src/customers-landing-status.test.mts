import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = join(root, "src");

function readSrc(relativePath: string): string {
  return readFileSync(join(srcRoot, relativePath), "utf8");
}

test("Customers navigation preserves the staff customer directory entry", () => {
  const nav = readSrc("ui/layouts/nav-config.ts");
  assert.match(nav, /label: "Customers"/);
  assert.match(nav, /href: "\/customers"/);
  assert.match(nav, /roles: \["admin", "manager", "mechanic"\]/);
});

test("directory starts at customer_directory and searches all contact identifiers", () => {
  const customers = readSrc("lib/customers.ts");
  assert.match(customers, /from\("customer_directory"\)/);
  assert.match(customers, /name\.ilike/);
  assert.match(customers, /email\.ilike/);
  assert.match(customers, /phone\.ilike/);
  assert.match(customers, /function escapedContactTerm/);
  assert.match(customers, /\\\\%_/);
  assert.match(customers, /if \(escaped\)/);
  assert.match(customers, /\.order\("name", \{ ascending: true \}\)/);
  assert.match(customers, /\.order\("id", \{ ascending: true \}\)/);
  assert.match(customers, /count: "exact"/);
  assert.match(customers, /loadCustomerDirectoryPage:/);
  assert.match(customers, /customers: \[\], count: 0, error: error\.message/);
  assert.doesNotMatch(customers, /createServiceRoleClient|SUPABASE_SERVICE_ROLE_KEY/);

  const page = readSrc("app/customers/page.tsx");
  assert.match(page, /loadCustomerDirectoryPage/);
  assert.match(page, /CUSTOMERS_DIRECTORY_PAGE_SIZE/);
  assert.match(page, /DataLoadError/);
  assert.match(page, /queryParam\.trim\(\)/);
});

test("directory table keeps URL state, debounces search, opens customer drawer, and replaces stale rows", () => {
  const table = readSrc("app/customers/_components/CustomersLandingTable.tsx");
  assert.match(table, /SEARCH_DEBOUNCE_MS = 300/);
  assert.match(table, /useTransition/);
  assert.match(table, /startTransition\(\(\) => router\.push\(buildHref\(search, 1\)\)\)/);
  assert.match(table, /startTransition\(\(\) => router\.push\(buildHref\(query, page\)\)\)/);
  assert.match(table, /params\.set\("customer", customerId\)/);
  assert.match(table, /aria-label="Search customers"/);
  assert.match(table, /event\.key === "Enter"/);
  assert.match(table, /<CustomersLandingTableSkeleton \/>/);
  assert.match(table, /HeaderCell>Name<\/Table.HeaderCell>\s*<Table.HeaderCell>Email<\/Table.HeaderCell>\s*<Table.HeaderCell>Phone<\/Table.HeaderCell>\s*<Table.HeaderCell>Birthday<\/Table.HeaderCell>/);
  assert.doesNotMatch(table, /customer_sync_list|HeaderCell>Google|HeaderCell>Holded|HeaderCell>Mailchimp/);

  const skeleton = readSrc("app/customers/_components/CustomersLandingTableSkeleton.tsx");
  assert.match(skeleton, /Table\.HeaderCell>Name/);
  assert.match(skeleton, /SkeletonText/);
});

test("customer drawer has authenticated details loading and the resolved destinations", () => {
  const action = readSrc("lib/customers/actions/customer-details-actions.ts");
  assert.match(action, /withAuth\(/);
  assert.match(action, /fetchCustomerDetails/);
  assert.match(action, /loadCustomerDetails/);

  const customers = readSrc("lib/customers.ts");
  assert.match(customers, /UUID_RE\.test\(customerId\)/);
  assert.match(customers, /from\("orders"\)/);
  assert.match(customers, /from\("bike_fits"\)/);
  assert.match(customers, /from\("customer_partner_history"\)/);
  assert.match(customers, /Promise\.all/);
  assert.match(customers, /loadCustomerDetails:/);

  const host = readSrc("components/customers/CustomerDetailsDrawerHost.tsx");
  assert.match(host, /searchParams\.get\("customer"\)/);
  assert.match(host, /cancelled/);
  assert.match(host, /fetchCustomerDetails/);

  const drawer = readSrc("components/customers/CustomerDetailsDrawer.tsx");
  assert.match(drawer, /params\.delete\("customer"\)/);
  assert.match(drawer, /CustomerDetailsDrawerSkeleton/);
  assert.match(drawer, /Couldn't load customer details/);
  assert.match(drawer, /Customer not found/);
  assert.match(drawer, /\/orders\?order=\$\{order\.id\}/);
  assert.match(drawer, /\/bike-fits\/\$\{fit\.id\}/);
  assert.match(drawer, /No qualifying partner order exists/);

  const orderDrawer = readSrc("components/orders/OrderDetailsDrawer.tsx");
  const orders = readSrc("lib/orders.ts");
  assert.match(orders, /customers \( id, name, email, phone, birthday \)/);
  assert.match(orderDrawer, /useHasRole\("admin", "manager", "mechanic"\)/);
  assert.match(orderDrawer, /href=\{`\/customers\?customer=\$\{order\.customers\.id\}`\}/);
  assert.match(orderDrawer, /focus-visible:ring-2/);
});

test("customer layout retains its authorization boundary and mounts the drawer host", () => {
  const layout = readSrc("app/customers/layout.tsx");
  assert.match(layout, /redirect\("\/login"\)/);
  assert.match(layout, /redirect\("\/pending"\)/);
  assert.match(layout, /redirect\("\/partner\/overview"\)/);
  assert.match(layout, /redirect\("\/unauthorized"\)/);
  assert.match(
    layout,
    /const ALLOWED_ROLES = \["admin", "manager", "mechanic"\]/,
  );
  assert.match(layout, /<CustomerDetailsDrawerHost \/>/);
  assert.match(layout, /<Suspense fallback=\{null\}>/);
});

test("migration uses security-invoker views, qualified partners, grants, and indexes", () => {
  const migration = readFileSync(
    join(root, "supabase/migrations/20260904120000_customer_directory.sql"),
    "utf8",
  );
  assert.match(migration, /CREATE OR REPLACE VIEW public\.customer_directory/);
  assert.match(migration, /security_invoker = true/);
  assert.match(migration, /FROM public\.customers AS c/);
  assert.match(migration, /LEFT JOIN public\.customer_sync AS s/);
  assert.match(migration, /CREATE OR REPLACE VIEW public\.customer_partner_history/);
  assert.match(migration, /SELECT DISTINCT/);
  assert.match(migration, /NULLIF\(btrim\(o\.partner_promo\), ''\) IS NOT NULL/);
  assert.match(migration, /GRANT SELECT ON TABLE public\.customer_directory TO authenticated/);
  assert.match(migration, /GRANT SELECT ON TABLE public\.customer_partner_history TO authenticated/);
  assert.match(migration, /CREATE INDEX IF NOT EXISTS customers_directory_name_id_idx/);
  assert.match(migration, /CREATE INDEX IF NOT EXISTS orders_customer_created_at_id_idx/);
  assert.match(migration, /CREATE INDEX IF NOT EXISTS bike_fits_customer_date_fit_number_idx/);
});

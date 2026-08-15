import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  BIKE_FIT_DETAIL_SELECT,
  BOOQABLE_SOURCE_TABLES,
  BROWNFIELD_CONSUMERS_CONTRACT_VERSION,
  BROWNFIELD_CONSUMER_FILES,
  BROWNFIELD_READER_VIEWS,
  BROWNFIELD_REMOTE_SCHEMA,
  BROWNFIELD_STAR_SELECT_VIEWS,
  CUSTOMER_OPTION_SELECT,
  LIVE_BOOQABLE_ORDER_INCLUDE,
  LOCAL_CUSTOMER_INSERT_COLUMNS,
  LiveBooqableOrderIncludeSchema,
  LocalCustomerInsertSchema,
  ORDER_DETAIL_SELECT,
  PARTNER_DAILY_STATS_COLUMNS,
  PARTNER_DAILY_STATS_RPC,
  PARTNER_RECENT_ORDERS_SELECT,
  PARTNER_REPORT_BOOKINGS_SELECT,
  SHARED_PROJECTION_SOURCE_COLUMNS,
  assertNoBrownfieldConsumerLeaks,
  findBrownfieldConsumerLeaks,
  normalizeProjectionList,
  projectionListFromColumns,
} from "@/src/lib/booqable/contracts";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

function readRepoFile(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function extractSelectArguments(source: string): string[] {
  const results: string[] = [];
  const pattern = /\.select\(\s*([`"'])([\s\S]*?)\1\s*(?:,|\))/g;
  let match = pattern.exec(source);
  while (match) {
    results.push(match[2]);
    match = pattern.exec(source);
  }
  return results;
}

function extractInsertObject(source: string): string | null {
  const match = source.match(/\.insert\(\s*\{([\s\S]*?)\}\s*\)/);
  return match?.[1] ?? null;
}

function expectNormalizedSelect(
  source: string,
  expectedColumns: readonly string[],
) {
  const expected = projectionListFromColumns(expectedColumns);
  const selects = extractSelectArguments(source).map(normalizeProjectionList);
  expect(selects).toContain(expected);
}

describe("brownfield consumer I/O matrix", () => {
  it("keeps the live brownfield include at customer,coupon,lines", () => {
    const syncSource = readRepoFile(BROWNFIELD_CONSUMER_FILES.sync);
    expect(LiveBooqableOrderIncludeSchema.parse(LIVE_BOOQABLE_ORDER_INCLUDE)).toBe(
      "customer,coupon,lines",
    );
    expect(syncSource).toContain(
      `?include=${LIVE_BOOQABLE_ORDER_INCLUDE}`,
    );
    const includeMatches = [
      ...syncSource.matchAll(/include=([^"'`\s]+)/g),
    ].map((match) => match[1]);
    expect(includeMatches).toEqual([LIVE_BOOQABLE_ORDER_INCLUDE]);
  });

  it("keeps named consumer selects and view/RPC signatures on the contract", () => {
    const ordersSource = readRepoFile(BROWNFIELD_CONSUMER_FILES.orders);
    const partnerOverviewSource = readRepoFile(
      BROWNFIELD_CONSUMER_FILES.partnerOverview,
    );
    const partnerCustomersSource = readRepoFile(
      BROWNFIELD_CONSUMER_FILES.partnerCustomers,
    );
    const reportSource = readRepoFile(BROWNFIELD_CONSUMER_FILES.downloadReport);
    const customersSource = readRepoFile(BROWNFIELD_CONSUMER_FILES.customers);
    const bikeFitsSource = readRepoFile(BROWNFIELD_CONSUMER_FILES.bikeFits);
    const remoteSchema = readRepoFile(BROWNFIELD_REMOTE_SCHEMA);

    expectNormalizedSelect(ordersSource, ORDER_DETAIL_SELECT);
    expect(ordersSource).toContain('.from("bookings_view")');
    expect(extractSelectArguments(ordersSource).map(normalizeProjectionList)).toContain(
      "*",
    );

    expectNormalizedSelect(partnerOverviewSource, PARTNER_RECENT_ORDERS_SELECT);
    expect(partnerOverviewSource).toContain(
      `.rpc("${PARTNER_DAILY_STATS_RPC}"`,
    );

    expect(partnerCustomersSource).toContain('.from("partner_customers_view")');
    expect(
      extractSelectArguments(partnerCustomersSource).map(normalizeProjectionList),
    ).toContain("*");

    expectNormalizedSelect(reportSource, PARTNER_REPORT_BOOKINGS_SELECT);
    expect(reportSource).toContain('.from("bookings_view")');

    expectNormalizedSelect(customersSource, CUSTOMER_OPTION_SELECT);
    expectNormalizedSelect(bikeFitsSource, BIKE_FIT_DETAIL_SELECT);
    expect(bikeFitsSource).toContain('.from("bike_fits_view")');

    expect(BROWNFIELD_READER_VIEWS.bookings_view).toEqual([
      "id",
      "booqable_order_id",
      "order_number",
      "order_number_text",
      "status",
      "starts_at",
      "stops_at",
      "amount_in_cents",
      "partner_id",
      "created_at",
      "customer_name",
      "customer_email",
      "customer_phone",
      "partner_name",
      "partner_slug",
    ]);
    expect(BROWNFIELD_READER_VIEWS.partner_customers_view).toEqual([
      "id",
      "name",
      "email",
      "phone",
      "birthday",
      "partner_id",
      "order_numbers",
      "order_numbers_text",
    ]);
    expect(BROWNFIELD_READER_VIEWS.bike_fits_view).toEqual([
      "id",
      "fit_number",
      "fit_number_text",
      "customer_id",
      "customer_name",
      "customer_email",
      "customer_phone",
      "created_by",
      "parent_fit_id",
      "date_of_fit",
      "bike_type",
      "status",
      "fit_label",
      "created_at",
      "updated_at",
    ]);
    expect(PARTNER_DAILY_STATS_COLUMNS).toEqual([
      "stat_date",
      "daily_orders",
      "daily_cents",
    ]);

    expect(remoteSchema).toContain(
      'RETURNS TABLE("stat_date" "date", "daily_orders" bigint, "daily_cents" bigint)',
    );
    for (const viewName of BROWNFIELD_STAR_SELECT_VIEWS) {
      expect(remoteSchema).toContain(`VIEW "public"."${viewName}"`);
      for (const column of SHARED_PROJECTION_SOURCE_COLUMNS) {
        const viewBody = remoteSchema.slice(
          remoteSchema.indexOf(`VIEW "public"."${viewName}"`),
        );
        const viewEnd = viewBody.indexOf("ALTER VIEW");
        expect(viewBody.slice(0, viewEnd)).not.toContain(column);
      }
    }
  });

  it("fails closed when consumer source mentions new fields or booqable_* tables", () => {
    const leaked = findBrownfieldConsumerLeaks(
      "select entity_origin, source_lifecycle from booqable_product_groups",
    );
    expect(leaked).toEqual([
      "entity_origin",
      "source_lifecycle",
      "booqable_product_groups",
    ]);
    expect(
      assertNoBrownfieldConsumerLeaks(
        "select entity_origin from booqable_stock_items",
      ),
    ).toEqual({
      ok: false,
      error:
        "brownfield consumer source leaked entity_origin, booqable_stock_items",
    });

    for (const relativePath of Object.values(BROWNFIELD_CONSUMER_FILES)) {
      const source = readRepoFile(relativePath);
      expect(
        assertNoBrownfieldConsumerLeaks(source),
        `${relativePath} must not mention new source columns or booqable_* tables`,
      ).toEqual({ ok: true });
    }
  });

  it("keeps local-customer create on legacy columns only", () => {
    const customersSource = readRepoFile(BROWNFIELD_CONSUMER_FILES.customers);
    const insertBody = extractInsertObject(customersSource);
    expect(insertBody).not.toBeNull();
    const insertKeys = [
      ...(insertBody ?? "").matchAll(/^\s*(\w+)\s*(?::|,)/gm),
    ].map((match) => match[1]);
    expect(insertKeys).toEqual([...LOCAL_CUSTOMER_INSERT_COLUMNS]);
    expect(insertBody).toContain("booqable_customer_id: null");

    expect(
      LocalCustomerInsertSchema.safeParse({
        booqable_customer_id: null,
        name: "Local Rider",
        email: "local@example.com",
        phone: "+34600000000",
        birthday: "1990-01-15",
        sex: "female",
      }).success,
    ).toBe(true);

    const merged = LocalCustomerInsertSchema.safeParse({
      booqable_customer_id: "cus_1",
      name: "Local Rider",
      email: null,
      phone: null,
      birthday: null,
      sex: null,
    });
    expect(merged.success).toBe(false);
    if (!merged.success) {
      expect(merged.error.issues.length).toBeGreaterThan(0);
      expect(merged.error.issues[0]?.path).toEqual(["booqable_customer_id"]);
    }
  });
});

describe("brownfield consumer drift", () => {
  it("file-read drift-checks sync.ts and each consumer against the contract", () => {
    expect(BROWNFIELD_CONSUMERS_CONTRACT_VERSION).toBe(1);
    expect(BOOQABLE_SOURCE_TABLES.length).toBeGreaterThan(0);

    const syncSource = readRepoFile(BROWNFIELD_CONSUMER_FILES.sync);
    expect(syncSource).toContain(
      `?include=${LIVE_BOOQABLE_ORDER_INCLUDE}`,
    );
    expect(syncSource).toContain("syncBooqableOrder");

    const webhookSource = readRepoFile(BROWNFIELD_CONSUMER_FILES.webhook);
    const sandboxSource = readRepoFile(BROWNFIELD_CONSUMER_FILES.sandbox);
    expect(webhookSource).toContain("syncBooqableOrder");
    expect(sandboxSource).toContain("syncBooqableOrder");

    const ordersSource = readRepoFile(BROWNFIELD_CONSUMER_FILES.orders);
    const partnerOverviewSource = readRepoFile(
      BROWNFIELD_CONSUMER_FILES.partnerOverview,
    );
    const partnerCustomersSource = readRepoFile(
      BROWNFIELD_CONSUMER_FILES.partnerCustomers,
    );
    const reportSource = readRepoFile(BROWNFIELD_CONSUMER_FILES.downloadReport);
    const customersSource = readRepoFile(BROWNFIELD_CONSUMER_FILES.customers);
    const bikeFitsSource = readRepoFile(BROWNFIELD_CONSUMER_FILES.bikeFits);

    expectNormalizedSelect(ordersSource, ORDER_DETAIL_SELECT);
    expectNormalizedSelect(partnerOverviewSource, PARTNER_RECENT_ORDERS_SELECT);
    expectNormalizedSelect(reportSource, PARTNER_REPORT_BOOKINGS_SELECT);
    expectNormalizedSelect(customersSource, CUSTOMER_OPTION_SELECT);
    expectNormalizedSelect(bikeFitsSource, BIKE_FIT_DETAIL_SELECT);

    expect(ordersSource).toContain('.from("bookings_view")');
    expect(partnerCustomersSource).toContain('.from("partner_customers_view")');
    expect(bikeFitsSource).toContain('.from("bike_fits_view")');
    expect(partnerOverviewSource).toContain(
      `.rpc("${PARTNER_DAILY_STATS_RPC}"`,
    );

    for (const relativePath of Object.values(BROWNFIELD_CONSUMER_FILES)) {
      expect(assertNoBrownfieldConsumerLeaks(readRepoFile(relativePath))).toEqual(
        { ok: true },
      );
    }
  });
});

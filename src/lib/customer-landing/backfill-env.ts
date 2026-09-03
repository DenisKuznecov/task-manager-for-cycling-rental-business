import { execFile } from "node:child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CustomerListPage } from "../booqable/fetch-source-snapshot.ts";
import { workshopSyncAllowed } from "../workshop/application/sync-env.ts";
import { createSupabaseLandingStore } from "./landing-store.ts";
import { landBooqableCustomer } from "./land-customer.ts";
import type { LandResult, LandingStore } from "./types.ts";

export const PRODUCTION_PROJECT_REF = "iwawhxfptzimluqyebiq";
export const STAGING_PROJECT_REF = "aoupusbxtznqvnpmlhox";
export const BACKFILL_LOG_PREFIX = "[customer-dest-backfill]";

export type ExecFileResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
  status: number | null;
};

export type ExecFileFn = (
  file: string,
  args: readonly string[],
) => Promise<ExecFileResult>;

export type ProductionLandingTarget = {
  projectRef: string;
  url: string;
  serviceRoleKey: string;
};

export type BackfillCursor = {
  doneIds: string[];
};

export function productionApiUrl(projectRef: string): string {
  return `https://${projectRef}.supabase.co`;
}

export function isLocalSupabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "[::1]" ||
      parsed.port === "54321"
    );
  } catch {
    return /localhost|127\.0\.0\.1|\[::1\]|:54321/i.test(url);
  }
}

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

export function assertProductionProjectRef(
  projectRef: string | null | undefined,
): { ok: true; projectRef: string } | { ok: false; error: string } {
  const ref = projectRef?.trim() ?? "";
  if (ref === "") {
    return fail("project-ref is missing.");
  }
  if (ref === STAGING_PROJECT_REF) {
    return fail("refusing staging project-ref.");
  }
  if (ref !== PRODUCTION_PROJECT_REF) {
    return fail(`refusing project-ref ${ref}.`);
  }
  return { ok: true, projectRef: ref };
}

export function assertProductionApiUrl(
  url: string,
  projectRef: string,
): { ok: true; url: string } | { ok: false; error: string } {
  const trimmed = url.trim();
  if (trimmed === "") {
    return fail("API URL is missing.");
  }
  if (isLocalSupabaseUrl(trimmed)) {
    return fail("refusing local Supabase URL.");
  }
  if (trimmed.includes(STAGING_PROJECT_REF)) {
    return fail("refusing staging API URL.");
  }
  const expected = productionApiUrl(projectRef);
  if (trimmed !== expected) {
    return fail("API URL is not the production project.");
  }
  return { ok: true, url: trimmed };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function keyFromRow(row: Record<string, unknown>): string | null {
  for (const field of ["api_key", "apiKey", "key", "value"] as const) {
    const value = row[field];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return null;
}

function isServiceRoleRow(row: Record<string, unknown>): boolean {
  const name = typeof row.name === "string" ? row.name.toLowerCase() : "";
  return name === "service_role" || name === "service-role";
}

export function parseSupabaseApiKeysOutput(
  stdout: string,
): { ok: true; serviceRoleKey: string } | { ok: false; error: string } {
  const text = stdout.trim();
  if (text === "") {
    return fail("CLI api-keys output was empty.");
  }
  try {
    const parsed = JSON.parse(text) as unknown;
    const rows = Array.isArray(parsed)
      ? parsed.filter(isRecord)
      : isRecord(parsed) && Array.isArray(parsed.keys)
        ? parsed.keys.filter(isRecord)
        : [];
    for (const row of rows) {
      if (!isServiceRoleRow(row)) continue;
      const key = keyFromRow(row);
      if (key) return { ok: true, serviceRoleKey: key };
    }
  } catch {
    // table output
  }
  const table = text.match(/service[_-]role\s*[|\s]+(\S+)/i);
  if (table?.[1] && table[1] !== "|" && !/^name$/i.test(table[1])) {
    return { ok: true, serviceRoleKey: table[1] };
  }
  return fail("CLI api-keys output did not include a service_role key.");
}

export function defaultExecFile(
  file: string,
  args: readonly string[],
): Promise<ExecFileResult> {
  return new Promise((resolve) => {
    execFile(file, [...args], { encoding: "utf8" }, (error, stdout, stderr) => {
      const out = typeof stdout === "string" ? stdout : "";
      const err = typeof stderr === "string" ? stderr : "";
      if (error) {
        const status =
          "code" in error && typeof error.code === "number" ? error.code : null;
        resolve({
          ok: false,
          stdout: out,
          stderr: err || error.message,
          status,
        });
        return;
      }
      resolve({ ok: true, stdout: out, stderr: err, status: 0 });
    });
  });
}

export async function resolveProductionLandingTarget(
  options: {
    exec?: ExecFileFn;
    projectRef?: string;
  } = {},
): Promise<
  { ok: true; target: ProductionLandingTarget } | { ok: false; error: string }
> {
  const refCheck = assertProductionProjectRef(
    options.projectRef ?? PRODUCTION_PROJECT_REF,
  );
  if (!refCheck.ok) return refCheck;
  const urlCheck = assertProductionApiUrl(
    productionApiUrl(refCheck.projectRef),
    refCheck.projectRef,
  );
  if (!urlCheck.ok) return urlCheck;

  const exec = options.exec ?? defaultExecFile;
  const result = await exec("supabase", [
    "projects",
    "api-keys",
    "--project-ref",
    refCheck.projectRef,
    "--output",
    "json",
  ]);
  if (!result.ok) {
    return fail(
      result.stderr.trim() ||
        "Supabase CLI is not logged in or api-keys failed.",
    );
  }
  const keys = parseSupabaseApiKeysOutput(result.stdout);
  if (!keys.ok) return keys;
  return {
    ok: true,
    target: {
      projectRef: refCheck.projectRef,
      url: urlCheck.url,
      serviceRoleKey: keys.serviceRoleKey,
    },
  };
}

export function createProductionLandingClient(
  target: ProductionLandingTarget,
): SupabaseClient {
  return createClient(target.url, target.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function parseBackfillCursor(
  raw: string,
): { ok: true; doneIds: Set<string> } | { ok: false; error: string } {
  if (raw.trim() === "") return { ok: true, doneIds: new Set() };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return fail("backfill cursor is not valid JSON.");
  }
  if (!isRecord(parsed) || !Array.isArray(parsed.doneIds)) {
    return fail("backfill cursor is missing doneIds.");
  }
  const ids: string[] = [];
  for (const id of parsed.doneIds) {
    if (typeof id !== "string" || id.trim() === "") {
      return fail("backfill cursor doneIds contains an invalid id.");
    }
    ids.push(id);
  }
  return { ok: true, doneIds: new Set(ids) };
}

export function assertConfirmProduction(
  argv: readonly string[],
): { ok: true } | { ok: false; error: string } {
  if (!argv.includes("--confirm-production")) {
    return fail("refusing to start without --confirm-production.");
  }
  return { ok: true };
}

export function serializeBackfillCursor(doneIds: Iterable<string>): string {
  return `${JSON.stringify({ doneIds: [...doneIds] }, null, 2)}\n`;
}

export function pendingCustomerIds(
  pageIds: readonly string[],
  doneIds: ReadonlySet<string>,
): string[] {
  return pageIds.filter((id) => !doneIds.has(id));
}

export function formatBackfillLog(input: {
  page: number;
  booqableCustomerId: string;
  result: LandResult;
}): string {
  if (!input.result.ok) {
    return `${BACKFILL_LOG_PREFIX} page=${input.page} id=${input.booqableCustomerId} error=${input.result.error}`;
  }
  if (input.result.ignored) {
    return `${BACKFILL_LOG_PREFIX} page=${input.page} id=${input.booqableCustomerId} ignored`;
  }
  const { google, holded, mailchimp } = input.result.statuses;
  return (
    `${BACKFILL_LOG_PREFIX} page=${input.page} id=${input.booqableCustomerId}` +
    ` google=${google.status} holded=${holded.status} mailchimp=${mailchimp.status}`
  );
}

export async function runCustomerDestBackfill(options: {
  fetchPage: (page: number) => Promise<CustomerListPage>;
  land: (id: string) => Promise<LandResult>;
  loadCursor: () => Set<string> | Promise<Set<string>>;
  saveCursor: (doneIds: Set<string>) => void | Promise<void>;
  log?: (line: string) => void;
}): Promise<{ ok: true; processed: number } | { ok: false; error: string }> {
  const log = options.log ?? ((line: string) => console.log(line));
  const doneIds = new Set(await options.loadCursor());
  let processed = 0;
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const list = await options.fetchPage(page);
    hasMore = list.hasMore;
    for (const id of pendingCustomerIds(list.ids, doneIds)) {
      if (doneIds.has(id)) continue;
      const result = await options.land(id);
      log(formatBackfillLog({ page, booqableCustomerId: id, result }));
      if (!result.ok) {
        continue;
      }
      if (result.ignored) {
        return fail("land was ignored; dest writes are not allowed in this environment.");
      }
      doneIds.add(id);
      await options.saveCursor(doneIds);
      processed += 1;
    }
    page += 1;
  }

  return { ok: true, processed };
}

export async function startCustomerDestBackfill(options: {
  exec?: ExecFileFn;
  projectRef?: string;
  fetchPage?: (page: number) => Promise<CustomerListPage>;
  land?: (id: string, store: LandingStore) => Promise<LandResult>;
  loadCursor: () => Set<string> | Promise<Set<string>>;
  saveCursor: (doneIds: Set<string>) => void | Promise<void>;
  log?: (line: string) => void;
}): Promise<{ ok: true; processed: number } | { ok: false; error: string }> {
  if (!workshopSyncAllowed(process.env)) {
    const error = "workshop sync is not allowed.";
    (options.log ?? console.error)(`${BACKFILL_LOG_PREFIX} ${error}`);
    return fail(error);
  }

  const resolved = await resolveProductionLandingTarget({
    exec: options.exec,
    projectRef: options.projectRef,
  });
  if (!resolved.ok) {
    const line = `${BACKFILL_LOG_PREFIX} ${resolved.error}`;
    (options.log ?? console.error)(line);
    return resolved;
  }

  const store = createSupabaseLandingStore(
    createProductionLandingClient(resolved.target),
  );
  const fetchPage = options.fetchPage;
  const land =
    options.land ??
    ((id: string, landingStore: LandingStore) =>
      landBooqableCustomer(id, { store: landingStore }));

  if (!fetchPage) {
    const { fetchCustomerListPage } = await import(
      "../booqable/fetch-source-snapshot.ts"
    );
    return runCustomerDestBackfill({
      fetchPage: fetchCustomerListPage,
      land: (id) => land(id, store),
      loadCursor: options.loadCursor,
      saveCursor: options.saveCursor,
      log: options.log,
    });
  }

  return runCustomerDestBackfill({
    fetchPage,
    land: (id) => land(id, store),
    loadCursor: options.loadCursor,
    saveCursor: options.saveCursor,
    log: options.log,
  });
}

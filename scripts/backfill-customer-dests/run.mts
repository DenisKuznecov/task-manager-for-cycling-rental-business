#!/usr/bin/env node
/**
 * Historical Booqable → dest backfill. Writes production customers +
 * customer_sync via the logged-in Supabase CLI (project-ref
 * iwawhxfptzimluqyebiq). Dest / Booqable secrets come from the local env.
 *
 * Usage:
 *   node --env-file=.env.local scripts/backfill-customer-dests/run.mts --confirm-production
 *
 * Do not run until the human has confirmed the live dest + production DML.
 */
import { readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BACKFILL_LOG_PREFIX,
  assertConfirmProduction,
  parseBackfillCursor,
  serializeBackfillCursor,
  startCustomerDestBackfill,
} from "../../src/lib/customer-landing/backfill-env.ts";

const CURSOR_PATH = join(dirname(fileURLToPath(import.meta.url)), "cursor.json");

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

async function loadCursor(): Promise<Set<string>> {
  let raw: string;
  try {
    raw = await readFile(CURSOR_PATH, "utf8");
  } catch (error) {
    if (isNotFound(error)) return new Set();
    throw error;
  }
  const parsed = parseBackfillCursor(raw);
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }
  return parsed.doneIds;
}

async function saveCursor(doneIds: Set<string>): Promise<void> {
  const tmp = `${CURSOR_PATH}.tmp`;
  await writeFile(tmp, serializeBackfillCursor(doneIds), "utf8");
  await rename(tmp, CURSOR_PATH);
}

const confirm = assertConfirmProduction(process.argv);
if (!confirm.ok) {
  console.error(BACKFILL_LOG_PREFIX, confirm.error);
  process.exit(1);
}

let initialCursor: Set<string>;
try {
  initialCursor = await loadCursor();
} catch (error) {
  console.error(
    BACKFILL_LOG_PREFIX,
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
}

const result = await startCustomerDestBackfill({
  loadCursor: () => initialCursor,
  saveCursor,
});

if (!result.ok) {
  console.error(BACKFILL_LOG_PREFIX, result.error);
  process.exit(1);
}

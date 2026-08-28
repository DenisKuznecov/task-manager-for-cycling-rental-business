import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { getVisibleNavItems } from "./ui/layouts/nav-config.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("pending layout shows DefaultPageLayout and does not bounce to /pending", () => {
  const source = readFileSync(join(root, "src/app/pending/layout.tsx"), "utf8");
  assert.match(source, /DefaultPageLayout/);
  assert.match(source, /redirect\("\/login"\)/);
  assert.match(source, /title:\s*"Account pending"/);
  assert.equal(source.includes('redirect("/pending")'), false);
  assert.equal(source.includes("redirect('/pending')"), false);
});

test("pending page uses a heading and readable approval copy", () => {
  const source = readFileSync(join(root, "src/app/pending/page.tsx"), "utf8");
  assert.match(source, /<h1[\s\S]*Account pending/);
  assert.match(source, /pending approval/);
  assert.doesNotMatch(source, /\{\"Welcome!/);
});

test("user menu always exposes Log out and hides Contact Us without a role", () => {
  const source = readFileSync(join(root, "src/ui/layouts/UserMenu.tsx"), "utf8");
  assert.match(source, /Log out/);
  assert.match(source, /canViewContact/);
  assert.match(source, /Contact Us/);
});

test("pending users see no role nav items so the avatar menu is the chrome", () => {
  assert.deepEqual(getVisibleNavItems(undefined), []);
});

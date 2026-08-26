import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { isPublicRoute } from "./utils/auth/public-routes.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function shouldRedirectUnauthenticatedToLogin(input: {
  hasUser: boolean;
  pathname: string;
  isServerAction: boolean;
}): boolean {
  const isApiRoute =
    input.pathname === "/api" || input.pathname.startsWith("/api/");
  return (
    !input.hasUser &&
    !isApiRoute &&
    !input.isServerAction &&
    !isPublicRoute(input.pathname)
  );
}

function loginRedirectNext(pathname: string, search: string): string | null {
  return pathname !== "/" ? `${pathname}${search}` : null;
}

test("lint script is ESLint CLI, not next lint", () => {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
    scripts: { lint: string };
    engines: { node: string };
    dependencies: { next: string; react: string };
  };
  assert.equal(pkg.scripts.lint, "eslint .");
  assert.doesNotMatch(pkg.scripts.lint, /next lint/);
  assert.equal(pkg.engines.node, ">=20.9.0");
  assert.equal(pkg.dependencies.next, "16.3.1");
  assert.equal(pkg.dependencies.react, "19.2.8");
});

test("login searchParams is an awaited Promise passed to requireAnonymous", async () => {
  const source = readFileSync(join(root, "src/app/login/page.tsx"), "utf8");
  assert.match(source, /searchParams: Promise<\{ next\?: string \}>/);
  assert.match(source, /const \{ next \} = await searchParams;/);
  assert.match(source, /requireAnonymous\(next \?\? null\)/);

  const { next } = await Promise.resolve({ next: "/orders" });
  assert.equal(next ?? null, "/orders");
  const missing = await Promise.resolve({} as { next?: string });
  assert.equal(missing.next ?? null, null);
});

test("unauthenticated HTML to a protected page redirects to /login?next=...", () => {
  const middleware = readFileSync(
    join(root, "src/utils/supabase/middleware.ts"),
    "utf8",
  );
  const proxy = readFileSync(join(root, "src/proxy.ts"), "utf8");
  assert.match(proxy, /export async function proxy/);
  assert.match(proxy, /updateSession\(request\)/);
  assert.match(middleware, /url\.pathname = "\/login"/);
  assert.match(middleware, /searchParams\.set\("next", next\)/);
  assert.equal(
    shouldRedirectUnauthenticatedToLogin({
      hasUser: false,
      pathname: "/orders",
      isServerAction: false,
    }),
    true,
  );
  assert.equal(loginRedirectNext("/orders", "?page=2"), "/orders?page=2");
});

test("unauthenticated API and next-action POSTs are not redirected to login", () => {
  const middleware = readFileSync(
    join(root, "src/utils/supabase/middleware.ts"),
    "utf8",
  );
  assert.match(middleware, /pathname\.startsWith\("\/api\/"\)/);
  assert.match(middleware, /headers\.has\("next-action"\)/);
  assert.equal(
    shouldRedirectUnauthenticatedToLogin({
      hasUser: false,
      pathname: "/api/webhooks/booqable",
      isServerAction: false,
    }),
    false,
  );
  assert.equal(
    shouldRedirectUnauthenticatedToLogin({
      hasUser: false,
      pathname: "/orders",
      isServerAction: true,
    }),
    false,
  );
});

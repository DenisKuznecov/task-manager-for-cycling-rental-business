/**
 * Vercel preview/branch URLs can inherit project secrets. Ingestion must
 * refuse to run there even when those secrets are present, so a leaked
 * preview URL cannot write with the service-role key. Local `npm run dev`
 * leaves VERCEL_ENV unset and is not preview.
 */
export function isBooqableIngestionAllowed(): boolean {
  return process.env.VERCEL_ENV !== "preview";
}

/**
 * Sandbox backfill is for terminal/agent callers, not a logged-in browser.
 * Compare Authorization: Bearer against BOOQABLE_SYNC_SECRET (never the
 * webhook secret or service-role key). Do not log the supplied token —
 * path names and skipped API middleware are not access control.
 */
export function authorizeSandboxBearer(request: Request): boolean {
  const expected = process.env.BOOQABLE_SYNC_SECRET;
  if (!expected) {
    return false;
  }

  const header = request.headers.get("authorization");
  if (!header) {
    return false;
  }

  const [scheme, token, ...rest] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token || rest.length > 0) {
    return false;
  }

  return token === expected;
}

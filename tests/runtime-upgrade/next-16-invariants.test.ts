import { createRequire } from "node:module";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getReportAssetDataUrl } from "@/src/lib/bike-fit/report/public-assets";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(import.meta.url);

const { requireAnonymous } = vi.hoisted(() => ({
  requireAnonymous: vi.fn(async () => undefined),
}));

const { createServerClient } = vi.hoisted(() => ({
  createServerClient: vi.fn(),
}));

vi.mock("@/src/utils/auth/requireAnonymous", () => ({
  requireAnonymous,
}));

vi.mock("@/src/app/login/_components/LoginForm", () => ({
  LoginForm: () => null,
}));

vi.mock("@supabase/ssr", () => ({ createServerClient }));

const SSR_REFRESH_HEADERS = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
  Expires: "0",
  Pragma: "no-cache",
};

function collectTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectTsFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe("Story 2.2 runtime upgrade invariants", () => {
  beforeEach(() => {
    requireAnonymous.mockClear();
  });

  it("lands the lockfile on supported Next 16 / React 19 LTS", () => {
    const pkg = JSON.parse(
      readFileSync(join(repoRoot, "package.json"), "utf8"),
    ) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    const lock = JSON.parse(
      readFileSync(join(repoRoot, "package-lock.json"), "utf8"),
    ) as {
      packages: Record<string, { version?: string }>;
    };

    expect(pkg.dependencies.next).toMatch(/^16\./);
    expect(pkg.dependencies.react).toMatch(/^19\./);
    expect(pkg.dependencies["react-dom"]).toMatch(/^19\./);
    expect(pkg.devDependencies["eslint-config-next"]).toMatch(/^16\./);
    expect(pkg.dependencies.next).not.toMatch(/^14\./);

    expect(lock.packages["node_modules/next"]?.version).toMatch(/^16\./);
    expect(lock.packages["node_modules/react"]?.version).toMatch(/^19\./);
  });

  it("records the 16 landing or a named remaining 16 gate", () => {
    const proof = readFileSync(
      join(
        repoRoot,
        "_bmad-output/implementation-artifacts/2-2-runtime-upgrade-proof.md",
      ),
      "utf8",
    );

    expect(proof).toMatch(/16\.3\.\d/);
    expect(proof).toMatch(/No remaining 16 gate|remaining 16 gate/i);
    expect(proof).not.toMatch(/next@14|Next\.js 14\.2/);
  });

  it("awaits login searchParams and passes next to requireAnonymous", async () => {
    const { default: LoginPage } = await import("@/src/app/login/page");

    await LoginPage({
      searchParams: Promise.resolve({ next: "/orders" }),
    });

    expect(requireAnonymous).toHaveBeenCalledWith("/orders");
  });

  it("awaits empty login searchParams and passes null to requireAnonymous", async () => {
    const { default: LoginPage } = await import("@/src/app/login/page");

    await LoginPage({
      searchParams: Promise.resolve({}),
    });

    expect(requireAnonymous).toHaveBeenCalledWith(null);
  });

  it("rejects repeated login next parameters in favor of the role landing", async () => {
    const { default: LoginPage } = await import("@/src/app/login/page");

    await LoginPage({
      searchParams: Promise.resolve({ next: ["/orders", "/workshop"] }),
    });

    expect(requireAnonymous).toHaveBeenCalledWith(null);
  });

  it("keeps PDF yoga/wasm external and bike-fit public assets traced", () => {
    const nextConfig = require(join(repoRoot, "next.config.js")) as {
      experimental?: { serverExternalPackages?: string[] };
      serverExternalPackages?: string[];
      outputFileTracingIncludes?: Record<string, string[]>;
    };

    expect(nextConfig.experimental?.serverExternalPackages).toBeUndefined();
    expect(nextConfig.serverExternalPackages).toContain("@react-pdf/renderer");
    expect(nextConfig.outputFileTracingIncludes?.["/bike-fits/[id]"]).toEqual(
      expect.arrayContaining([
        "./public/echeloncycling_full_logo.jpg",
        "./public/Saddle-height.png",
      ]),
    );
  });

  it("keeps only the required Next 16 network-boundary rename", () => {
    expect(existsSync(join(repoRoot, "src/middleware.ts"))).toBe(false);
    expect(existsSync(join(repoRoot, "src/utils/supabase/middleware.ts"))).toBe(
      true,
    );
  });

  it("has no leftover export const instant on any src/app route", () => {
    const leftovers = collectTsFiles(join(repoRoot, "src/app")).filter((file) =>
      readFileSync(file, "utf8").includes("export const instant"),
    );

    expect(leftovers).toEqual([]);
  });

  it("reads a traced bike-fit public asset as a data URL", () => {
    const publicAssetsSource = readFileSync(
      join(repoRoot, "src/lib/bike-fit/report/public-assets.ts"),
      "utf8",
    );
    expect(publicAssetsSource).toContain("turbopackIgnore: true");

    const dataUrl = getReportAssetDataUrl("echeloncycling_full_logo.jpg");
    expect(dataUrl).toMatch(/^data:image\/jpeg;base64,/);
  });
});

describe("proxy session refresh", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    createServerClient.mockReset();
    createServerClient.mockImplementation(
      (
        _url: string,
        _key: string,
        options: {
          cookies: {
            setAll: (
              cookies: Array<{
                name: string;
                value: string;
                options: Record<string, unknown>;
              }>,
              headers: Record<string, string>,
            ) => void;
          };
        },
      ) => {
        options.cookies.setAll(
          [{ name: "sb-access-token", value: "refreshed", options: {} }],
          SSR_REFRESH_HEADERS,
        );
        return {
          auth: {
            getUser: async () => ({ data: { user: { id: "user-1" } } }),
          },
        };
      },
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("copies Cache-Control private and no-store through proxy", async () => {
    const { proxy } = await import("@/src/proxy");
    const request = new NextRequest("http://localhost/orders");

    const response = await proxy(request);
    const cacheControl = response.headers.get("Cache-Control") ?? "";

    expect(cacheControl).toContain("private");
    expect(cacheControl).toContain("no-store");
  });
});

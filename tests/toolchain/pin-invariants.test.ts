import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

type PackageJson = {
  engines?: { node?: string };
  scripts?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

type Lockfile = {
  packages?: Record<string, { version?: string }>;
};

function readRepoFile(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function workflowCliVersion(source: string): string {
  const match = source.match(
    /uses:\s*supabase\/setup-cli@v2[\s\S]*?version:\s*(\S+)/,
  );
  if (!match) {
    throw new Error("workflow is missing supabase/setup-cli version");
  }
  return match[1];
}

describe("Story 2.3 toolchain pin invariants", () => {
  const pkg = JSON.parse(readRepoFile("package.json")) as PackageJson;
  const lock = JSON.parse(readRepoFile("package-lock.json")) as Lockfile;
  const staging = readRepoFile(".github/workflows/deploy-staging.yml");
  const production = readRepoFile(".github/workflows/deploy-production.yml");

  it("pins engines.node to 24.x only", () => {
    expect(pkg.engines?.node).toBe("^24.0.0");
    expect(pkg.engines?.node).not.toMatch(/(^|[^\d.])20(\D|$)/);
    expect(pkg.engines?.node).not.toMatch(/(^|[^\d.])22(\D|$)/);
  });

  it("pins @types/node to 24.x in package metadata and the lockfile", () => {
    expect(pkg.devDependencies?.["@types/node"]).toMatch(/^24\./);
    expect(lock.packages?.["node_modules/@types/node"]?.version).toMatch(
      /^24\./,
    );
  });

  it("pins the same exact Supabase CLI in package metadata, lockfile, and workflows", () => {
    const declared = pkg.devDependencies?.supabase;
    const locked = lock.packages?.["node_modules/supabase"]?.version;
    const stagingVersion = workflowCliVersion(staging);
    const productionVersion = workflowCliVersion(production);

    expect(declared).toMatch(/^\d+\.\d+\.\d+$/);
    expect(declared).not.toMatch(/latest|beta/i);
    expect(locked).toBe(declared);
    expect(stagingVersion).toBe(declared);
    expect(productionVersion).toBe(declared);
    expect(staging).not.toMatch(/version:\s*latest/);
    expect(production).not.toMatch(/version:\s*latest/);
  });

  it("sets up Node 24 in both deploy workflows", () => {
    expect(staging).toMatch(/uses:\s*actions\/setup-node@v4/);
    expect(production).toMatch(/uses:\s*actions\/setup-node@v4/);
    expect(staging).toMatch(/node-version:\s*24\b/);
    expect(production).toMatch(/node-version:\s*24\b/);
  });

  it("owns type generation through db:types", () => {
    expect(pkg.scripts?.["db:types"]).toMatch(
      /supabase gen types typescript/,
    );
    expect(pkg.scripts?.["db:types"]).toMatch(/--local/);
  });

  it("records type generation success and the environment-proof parity gate", () => {
    const proof = readRepoFile(
      "_bmad-output/implementation-artifacts/2-3-toolchain-pin-proof.md",
    );

    expect(proof).toMatch(/npm run db:types/);
    expect(proof).toMatch(/Exit 0/);
    expect(proof).toMatch(/environment-proof gate/i);
    expect(proof).not.toMatch(/remote parity (was )?closed/i);
    expect(proof).toMatch(/workshop-tasks/);
  });
});

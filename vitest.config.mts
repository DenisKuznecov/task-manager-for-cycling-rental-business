import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  oxc: {
    jsx: {
      runtime: "automatic",
    },
  },
  resolve: {
    alias: [
      {
        find: "@/ui",
        replacement: fileURLToPath(new URL("./src/ui", import.meta.url)),
      },
      {
        find: "@",
        replacement: fileURLToPath(new URL("./", import.meta.url)),
      },
    ],
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});

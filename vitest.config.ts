import { defineConfig } from "vitest/config";

// Standalone config so unit tests of the pure engine modules don't boot the
// SvelteKit plugin.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});

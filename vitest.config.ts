import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// Exercise browser-side runes and effects without booting SvelteKit or a DOM.
export default defineConfig({
  plugins: [svelte({ configFile: false, dynamicCompileOptions: () => ({ generate: "client" }) })],
  resolve: { conditions: ["browser"] },
  ssr: { resolve: { conditions: ["browser"] }, noExternal: ["svelte"] },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});

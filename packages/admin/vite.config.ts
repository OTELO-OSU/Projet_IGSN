import { paraglideVitePlugin } from "@inlang/paraglide-js";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { paraglideOptions } from "./paraglide.config.ts";

export default defineConfig({
  server: {
    port: 3001,
    host: true,
    hmr: {
      clientPort: 3001,
    },
  },
  resolve: { tsconfigPaths: true },
  // These arrive through the linked design-system workspace package, which
  // Vite's dep scanner does not crawl, so pre-bundle them at server start
  // instead of lazily mid-request (a cold-start stall).
  optimizeDeps: { include: ["radix-ui", "lucide-react", "cmdk", "sonner"] },
  plugins: [
    tailwindcss(),
    paraglideVitePlugin(paraglideOptions),
    tanstackRouter({ autoCodeSplitting: true }),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
});

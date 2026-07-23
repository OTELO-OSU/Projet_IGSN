import { paraglideVitePlugin } from "@inlang/paraglide-js";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

import { paraglideOptions } from "./src/i18n/paraglide";

const config = defineConfig({
  server: {
    port: 3000,
    host: true,
    hmr: {
      clientPort: 3000,
    },
  },
  resolve: { tsconfigPaths: true },
  // These arrive through the linked design-system workspace package, which
  // Vite's dep scanner does not crawl, so pre-bundle them at server start
  // instead of lazily mid-request (a cold-start stall).
  optimizeDeps: { include: ["radix-ui", "lucide-react", "cmdk", "sonner"] },
  plugins: [
    devtools(),
    nitro(),
    tailwindcss(),
    paraglideVitePlugin(paraglideOptions),
    tanstackStart(),
    viteReact(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
});

export default config;

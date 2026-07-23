import { paraglideVitePlugin } from "@inlang/paraglide-js";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

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
    paraglideVitePlugin({
      project: path.resolve(__dirname, "project.inlang"),
      outdir: path.resolve(__dirname, "src/paraglide"),
      // locale-modules bundles ~1 file per locale; message-modules emits one
      // per message (~1k here), which stalls the cold dev server (all module
      // requests pending) until the transform cache warms. See paraglide docs.
      outputStructure: "locale-modules",
      strategy: ["baseLocale"],
    }),
    tanstackRouter({ autoCodeSplitting: true }),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
});

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
  plugins: [
    tailwindcss(),
    paraglideVitePlugin({
      project: path.resolve(__dirname, "project.inlang"),
      outdir: path.resolve(__dirname, "src/paraglide"),
      outputStructure: "message-modules",
      strategy: ["baseLocale"],
    }),
    tanstackRouter({ autoCodeSplitting: true }),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
});

import { paraglideVitePlugin } from "@inlang/paraglide-js";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
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
  optimizeDeps: { include: ["radix-ui", "lucide-react", "cmdk", "sonner"] },
  plugins: [
    devtools(),
    nitro({ exportConditions: ["module"], noExternals: ["tslib"] }),
    tailwindcss(),
    paraglideVitePlugin(paraglideOptions),
    tanstackStart(),
    viteReact({ compiler: true }),
  ],
});

export default config;

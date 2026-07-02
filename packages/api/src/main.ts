import { serve } from "@hono/node-server";

import { createApp } from "./app.ts";
import { createDb } from "./db.ts";

const app = createApp(createDb());

const port = process.env.PORT ? parseInt(process.env.PORT) : 3002;

const server = serve({
  port,
  fetch: app.fetch,
});

process.on("SIGINT", () => {
  server.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  server.close((err) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    process.exit(0);
  });
});

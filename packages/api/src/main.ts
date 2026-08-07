import { serve } from "@hono/node-server";

import { createApp } from "./app.ts";
import { createDb } from "./db.ts";
import { createSendMail } from "./mail/send-mail.ts";
import { adminAppUrl } from "./user/admin-users-url.ts";

const { app, startPendingUsersDigest } = createApp(createDb(), {
  mail: { sendMail: createSendMail(), adminUrl: adminAppUrl() },
});
startPendingUsersDigest();

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

import { serve } from "@hono/node-server";

import { createApp } from "./app.ts";
import { createDb } from "./db.ts";
import { createSendMail } from "./mail/send-mail.ts";
import { createUserRepository } from "./user/repository.ts";
import { sendPendingUsersDigest } from "./user/send-pending-users-digest.ts";

const db = createDb();
const app = createApp(db);

const DIGEST_INTERVAL_MS = 24 * 60 * 60 * 1000;
const sendMail = createSendMail();
const userRepository = createUserRepository(db);
setInterval(() => {
  void sendPendingUsersDigest(userRepository, sendMail);
}, DIGEST_INTERVAL_MS);

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

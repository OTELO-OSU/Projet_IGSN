import { serve } from "@hono/node-server";

import { createApp } from "./app.ts";
import { createDb } from "./db.ts";
import { createSendMail } from "./mail/send-mail.ts";
import { schedulePendingUsersDigest } from "./user/pending-users-digest-schedule.ts";
import { createUserRepository } from "./user/repository.ts";
import { sendPendingUsersDigest } from "./user/send-pending-users-digest.ts";

const db = createDb();
const app = createApp(db);

const sendMail = createSendMail();
const userRepository = createUserRepository(db);
schedulePendingUsersDigest(() => {
  void sendPendingUsersDigest(userRepository, sendMail);
});

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

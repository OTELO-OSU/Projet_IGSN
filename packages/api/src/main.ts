import { serve } from "@hono/node-server";

import { appUrl } from "./app-url.ts";
import { createApp } from "./app.ts";
import { createDb } from "./db.ts";
import { createInstitutionalGroupRepository } from "./institutional-group/repository.ts";
import { createSendMail } from "./mail/send-mail.ts";
import { createManualGroupRepository } from "./manual-group/repository.ts";
import { schedulePendingUsersDigest } from "./user/pending-users-digest-schedule.ts";
import { createUserRepository } from "./user/repository.ts";
import { sendPendingUsersDigest } from "./user/send-pending-users-digest.ts";

const db = createDb();
const sendMail = createSendMail();
const adminUrl = appUrl("ADMIN_URL");
const frontendUrl = appUrl("FRONTEND_URL");
const { app } = createApp(db, { mail: { sendMail, adminUrl, frontendUrl } });
schedulePendingUsersDigest(() => {
  void sendPendingUsersDigest(
    {
      users: createUserRepository(db),
      manualGroups: createManualGroupRepository(db),
      institutionalGroups: createInstitutionalGroupRepository(db),
    },
    sendMail,
    { usersUrl: new URL("/users", adminUrl).toString(), adminUrl },
  );
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

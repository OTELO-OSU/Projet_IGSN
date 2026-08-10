import { createDb } from "../src/db.ts";
import { createSendMail } from "../src/mail/send-mail.ts";
import { adminAppUrl } from "../src/user/admin-app-url.ts";
import { createUserRepository } from "../src/user/repository.ts";
import { sendPendingUsersDigest } from "../src/user/send-pending-users-digest.ts";

const db = createDb();
await sendPendingUsersDigest(
  createUserRepository(db),
  createSendMail(),
  new URL("/users", adminAppUrl()).toString(),
);
await db.destroy();

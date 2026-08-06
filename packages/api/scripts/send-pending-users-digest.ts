import { createDb } from "../src/db.ts";
import { createSendMail } from "../src/mail/send-mail.ts";
import { adminUsersUrl } from "../src/user/admin-users-url.ts";
import { createUserRepository } from "../src/user/repository.ts";
import { sendPendingUsersDigest } from "../src/user/send-pending-users-digest.ts";

const db = createDb();
await sendPendingUsersDigest(
  createUserRepository(db),
  createSendMail(),
  adminUsersUrl(),
);
await db.destroy();

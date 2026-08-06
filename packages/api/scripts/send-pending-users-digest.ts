import { createDb } from "../src/db.ts";
import { createSendMail } from "../src/mail/send-mail.ts";
import { createUserRepository } from "../src/user/repository.ts";
import { sendPendingUsersDigest } from "../src/user/send-pending-users-digest.ts";

const db = createDb();
await sendPendingUsersDigest(createUserRepository(db), createSendMail());
await db.destroy();

import { appUrl } from "../src/app-url.ts";
import { createDb } from "../src/db.ts";
import { createInstitutionalGroupRepository } from "../src/institutional-group/repository.ts";
import { createSendMail } from "../src/mail/send-mail.ts";
import { createManualGroupRepository } from "../src/manual-group/repository.ts";
import { createUserRepository } from "../src/user/repository.ts";
import { sendPendingUsersDigest } from "../src/user/send-pending-users-digest.ts";

const db = createDb();
await sendPendingUsersDigest(
  {
    users: createUserRepository(db),
    manualGroups: createManualGroupRepository(db),
    institutionalGroups: createInstitutionalGroupRepository(db),
  },
  createSendMail(),
  appUrl("ADMIN_URL"),
);
await db.destroy();

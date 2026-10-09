import { serve } from "@hono/node-server";

import { appUrl } from "./app-url.ts";
import { createApp } from "./app.ts";
import { attachmentsDir } from "./attachments-dir.ts";
import { dataCiteConfig } from "./datacite/config.ts";
import { createDb } from "./db.ts";
import { createInstitutionalGroupRepository } from "./institutional-group/repository.ts";
import { createSendMail } from "./mail/send-mail.ts";
import { createManualGroupRepository } from "./manual-group/repository.ts";
import { startWebhookWorker } from "./sample-batch/webhook-worker.ts";
import { createSampleRepository } from "./sample/repository.ts";
import { scheduleEmbargoRelease } from "./sample/service/embargo-release-schedule.ts";
import { releaseDueEmbargoes } from "./sample/service/release-due-embargoes.ts";
import { startSynchronizationWorker } from "./sample/service/synchronization-worker.ts";
import { scheduleStagedUploadCleanup } from "./staged-upload/cleanup-schedule.ts";
import { createStagedUploads } from "./staged-upload/staged-uploads.ts";
import { createUserSampleRepository } from "./user-sample/repository.ts";
import { schedulePendingUsersDigest } from "./user/pending-users-digest-schedule.ts";
import { createUserRepository } from "./user/repository.ts";
import { sendPendingUsersDigest } from "./user/send-pending-users-digest.ts";

const db = createDb();
startSynchronizationWorker(db, dataCiteConfig());
startWebhookWorker(db);
const sendMail = createSendMail();
const adminUrl = appUrl("ADMIN_URL");
const frontendUrl = appUrl("FRONTEND_URL");
const { app } = createApp(db, {
  frontendUrl,
  mail: { sendMail, adminUrl, frontendUrl },
});
schedulePendingUsersDigest(() => {
  void sendPendingUsersDigest(
    {
      users: createUserRepository(db),
      manualGroups: createManualGroupRepository(db),
      institutionalGroups: createInstitutionalGroupRepository(db),
    },
    sendMail,
    adminUrl,
  );
});

const embargoRepositories = {
  samples: createSampleRepository(db, attachmentsDir, dataCiteConfig()),
  userSamples: createUserSampleRepository(db),
};
scheduleEmbargoRelease(() => {
  releaseDueEmbargoes(embargoRepositories, { sendMail, adminUrl }).catch(
    console.error,
  );
});

const stagedUploads = createStagedUploads(attachmentsDir);
scheduleStagedUploadCleanup(() => {
  stagedUploads.deleteExpired().catch(console.error);
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

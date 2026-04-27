import app from "./app";
import { db, runSeed } from "@workspace/db";
import { logger } from "./lib/logger";
import { bootstrapAdminFromEnv } from "./lib/bootstrapAdmin";
import { scheduleIndexNowDaily } from "./jobs/indexNowDaily";
import { scheduleLinkCheckDaily } from "./jobs/linkCheckDaily";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function bootstrap() {
  try {
    const report = await runSeed(db);
    const inserted = Object.entries(report).filter(([, n]) => n > 0);
    if (inserted.length > 0) {
      logger.info(
        { seeded: Object.fromEntries(inserted) },
        "Seeded empty tables on startup",
      );
    }
  } catch (err) {
    logger.error(
      { err },
      "Database seeding failed — continuing to start server",
    );
  }

  try {
    await bootstrapAdminFromEnv();
  } catch (err) {
    logger.error(
      { err },
      "Admin bootstrap from ADMIN_EMAILS/ADMIN_PASSWORD failed",
    );
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
    scheduleIndexNowDaily();
    scheduleLinkCheckDaily();
  });
}

void bootstrap();

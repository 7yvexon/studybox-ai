import { createApp } from "./app.js";
import { config } from "./config.js";
import { closeDatabase } from "./db/index.js";

const app = createApp();
const server = app.listen(config.port, () => {
  process.stdout.write(`StudyBox API listening on ${config.port}\n`);
});

const shutdown = async () => {
  server.close(async () => {
    await closeDatabase();
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

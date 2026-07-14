import { createApp } from "./app.js";
import { config } from "./config.js";
import { closeDatabase } from "./db/index.js";

const app = createApp();

const tryListen = (port: number, host: string) =>
  new Promise<ReturnType<typeof app.listen>>((resolve, reject) => {
    const server = app.listen(port, host, () => resolve(server));
    server.once("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        reject(error);
        return;
      }

      reject(error);
    });
  });

const startServer = async () => {
  const requestedPort = config.port;

  try {
    const server = await tryListen(requestedPort, config.host);
    process.stdout.write(`StudyBox API listening on ${config.host}:${requestedPort}\n`);
    return server;
  } catch (error) {
    if (
      config.nodeEnv !== "production" &&
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "EADDRINUSE"
    ) {
      for (let port = requestedPort + 1; port <= requestedPort + 20; port += 1) {
        try {
          const server = await tryListen(port, config.host);
          process.stdout.write(`StudyBox API listening on ${config.host}:${port}\n`);
          return server;
        } catch (fallbackError) {
          if (fallbackError && typeof fallbackError === "object" && "code" in fallbackError && fallbackError.code === "EADDRINUSE") {
            continue;
          }

          throw fallbackError;
        }
      }
    }

    throw error;
  }
};

const server = await startServer();

const shutdown = async () => {
  server.close(async () => {
    await closeDatabase();
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

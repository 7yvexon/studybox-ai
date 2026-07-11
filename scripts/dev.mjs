import { spawn } from "node:child_process";
import net from "node:net";

function getNpmCommand() {
  return process.platform === "win32" ? "cmd.exe" : "npm";
}

function getNpmArgs(args) {
  return process.platform === "win32" ? ["/d", "/s", "/c", `npm ${args.join(" ")}`] : args;
}

function spawnNpm(args, env) {
  return spawn(getNpmCommand(), getNpmArgs(args), {
    cwd: process.cwd(),
    env,
    stdio: "inherit",
    shell: false
  });
}

async function findAvailablePort(startPort = 3001) {
  const requestedPort = Number(startPort);

  for (let port = requestedPort; port <= requestedPort + 20; port += 1) {
    const server = net.createServer();

    try {
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, "127.0.0.1", () => resolve());
      });

      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });

      return port;
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "EADDRINUSE") {
        continue;
      }

      throw error;
    }
  }

  throw new Error(`Could not find an available port from ${requestedPort}`);
}

async function main() {
  const port = await findAvailablePort(process.env.PORT || 3001);
  console.log(`Starting development servers on API port ${port}`);

  const build = spawnNpm(["run", "build", "--workspace=@studybox/shared"], process.env);
  await new Promise((resolve, reject) => {
    build.once("error", reject);
    build.once("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Shared build failed with exit code ${code}`));
      }
    });
  });

  const apiEnv = { ...process.env, PORT: String(port) };
  const webEnv = { ...process.env, VITE_API_TARGET: `http://localhost:${port}` };

  const api = spawnNpm(["run", "dev", "--workspace=@studybox/api"], apiEnv);
  const web = spawnNpm(["run", "dev", "--workspace=@studybox/web"], webEnv);

  const shutdown = () => {
    api.kill("SIGTERM");
    web.kill("SIGTERM");
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  api.on("exit", (code) => {
    if (code && code !== 0) {
      process.exit(code);
    }
  });

  web.on("exit", (code) => {
    if (code && code !== 0) {
      process.exit(code);
    }
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const apiRoot = fileURLToPath(new URL("../", import.meta.url));
const source = join(apiRoot, "src", "db", "migrations");
const destination = join(apiRoot, "dist", "db", "migrations");
const destinationFromRoot = relative(apiRoot, destination);

if (destinationFromRoot === "" || destinationFromRoot.startsWith(`..${sep}`)) {
  throw new Error("Migration destination must stay inside the API workspace");
}

await rm(destination, { recursive: true, force: true });
await mkdir(dirname(destination), { recursive: true });
await cp(source, destination, { recursive: true });

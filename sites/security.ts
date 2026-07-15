const encoder = new TextEncoder();
const passwordIterations = 100000;

const toBase64Url = (bytes: Uint8Array) => {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const fromBase64Url = (value: string) => {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const derivePassword = async (password: string, salt: Uint8Array, iterations: number) => {
  const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    material,
    256
  );
  return new Uint8Array(bits);
};

const equalBytes = (left: Uint8Array, right: Uint8Array) => {
  if (left.length !== right.length) {
    return false;
  }
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
};

export const createId = () => crypto.randomUUID();

export const createOpaqueToken = () => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
};

export const hashToken = async (token: string) => {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};

export const hashPassword = async (password: string) => {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const hash = await derivePassword(password, salt, passwordIterations);
  return `pbkdf2_sha256$${passwordIterations}$${toBase64Url(salt)}$${toBase64Url(hash)}`;
};

export const verifyPassword = async (stored: string, password: string) => {
  const [algorithm, iterationsValue, saltValue, hashValue] = stored.split("$");
  const iterations = Number(iterationsValue);
  if (algorithm !== "pbkdf2_sha256" || !Number.isInteger(iterations) || !saltValue || !hashValue) {
    return false;
  }
  const actual = await derivePassword(password, fromBase64Url(saltValue), iterations);
  return equalBytes(actual, fromBase64Url(hashValue));
};

let dummyPasswordHash: Promise<string> | null = null;

export const getDummyPasswordHash = () => {
  dummyPasswordHash ??= hashPassword("studybox-dummy-verifier-do-not-use");
  return dummyPasswordHash;
};

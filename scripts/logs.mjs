import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const usage = `사용법: npm run logs -- [옵션]

옵션:
  --since <기간|ISO 시간>  조회 시작 시각, 기본값: 24h
  --until <ISO 시간>       조회 종료 시각
  --level <수준>           debug, info, warn, error
  --event <이벤트>         이벤트 이름
  --route <경로>           요청 경로
  --request-id <ID>        요청 ID
  --limit <1-500>          최대 결과 수, 기본값: 100
  --include-content        질문·AI 응답 전문 포함
`;

const allowed = new Set(["--since", "--until", "--level", "--event", "--route", "--request-id", "--limit", "--include-content", "--help"]);
const values = new Map();
let includeContent = false;

for (let index = 0; index < process.argv.slice(2).length; index += 1) {
  const argument = process.argv.slice(2)[index];
  if (!allowed.has(argument)) {
    throw new Error(`알 수 없는 옵션입니다: ${argument}`);
  }
  if (argument === "--help") {
    process.stdout.write(usage);
    process.exit(0);
  }
  if (argument === "--include-content") {
    includeContent = true;
    continue;
  }
  const value = process.argv.slice(2)[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${argument} 옵션의 값이 필요합니다.`);
  }
  values.set(argument, value);
  index += 1;
}

const quote = (value) => `'${value.replaceAll("'", "''")}'`;

const parseTime = (value, allowDuration = false) => {
  if (allowDuration) {
    const duration = /^(\d+)([mhd])$/.exec(value);
    if (duration) {
      const unitMs = { m: 60_000, h: 3_600_000, d: 86_400_000 }[duration[2]];
      return new Date(Date.now() - Number(duration[1]) * unitMs).toISOString();
    }
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`올바른 시간 형식이 아닙니다: ${value}`);
  }
  return date.toISOString();
};

const conditions = ["occurred_at >= " + quote(parseTime(values.get("--since") || "24h", true))];
const filters = ["--until", "--level", "--event", "--route", "--request-id"];
const columns = {
  "--until": "occurred_at <=",
  "--level": "level =",
  "--event": "event =",
  "--route": "route =",
  "--request-id": "request_id ="
};

for (const filter of filters) {
  const value = values.get(filter);
  if (!value) {
    continue;
  }
  const normalized = filter === "--until" ? parseTime(value) : value;
  if (filter === "--level" && !["debug", "info", "warn", "error"].includes(value)) {
    throw new Error("--level 값은 debug, info, warn, error 중 하나여야 합니다.");
  }
  conditions.push(`${columns[filter]} ${quote(normalized)}`);
}

const limit = Number(values.get("--limit") || "100");
if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
  throw new Error("--limit 값은 1에서 500 사이의 정수여야 합니다.");
}

const selectedColumns = [
  "id",
  "occurred_at",
  "level",
  "source",
  "event",
  "request_id",
  "method",
  "route",
  "status",
  "duration_ms",
  "actor_id",
  "ip_hash",
  "details"
];
if (includeContent) {
  selectedColumns.push("content");
}

const query = `SELECT ${selectedColumns.join(", ")} FROM observability_logs WHERE ${conditions.join(" AND ")} ORDER BY occurred_at DESC LIMIT ${limit}`;
const wrangler = fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url));
const result = spawnSync(process.execPath, [wrangler, "d1", "execute", "DB", "--remote", "--config", "wrangler.jsonc", "--command", query, "--json"], {
  stdio: "inherit"
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);

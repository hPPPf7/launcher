import { existsSync, readFileSync } from "node:fs";
import type { Config } from "drizzle-kit";

function readEnvFile(path: string) {
  if (!existsSync(path)) return {};

  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .reduce<Record<string, string>>((env, line) => {
      const separatorIndex = line.indexOf("=");
      if (separatorIndex <= 0) return env;

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      env[key] = value;
      return env;
    }, {});
}

const localEnv = readEnvFile(".env.local");
const databaseUrl = process.env.DATABASE_URL ?? localEnv.DATABASE_URL ?? "";

export default {
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;

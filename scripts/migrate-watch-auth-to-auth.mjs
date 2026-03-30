import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "@neondatabase/serverless";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const launcherRoot = path.resolve(__dirname, "..");
const watchRoot = path.resolve(launcherRoot, "..", "watch");

function readEnvFileValue(filePath, key) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith("#")) {
      continue;
    }
    const prefix = `${key}=`;
    if (!line.startsWith(prefix)) {
      continue;
    }
    const rawValue = line.slice(prefix.length).trim();
    return rawValue.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
  }

  return null;
}

function getRequiredUrl(options) {
  for (const candidate of options) {
    if (candidate && candidate.trim()) {
      return candidate.trim();
    }
  }
  throw new Error("MISSING_DATABASE_URL");
}

function toIsoOrNull(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function readSourceRows(sourcePool) {
  const [profiles, authUserMap, authSessionStates, deletedAuthAccountMarkers] = await Promise.all([
    sourcePool.query(`
      select id, nickname, provider_nickname, avatar_url, created_at
      from profiles
      order by created_at asc nulls last, id asc
    `),
    sourcePool.query(`
      select id, provider, provider_account_id, user_id, created_at
      from auth_user_map
      order by created_at asc nulls last, id asc
    `),
    sourcePool.query(`
      select user_id, session_version, created_at, updated_at
      from auth_session_states
      order by created_at asc nulls last, user_id asc
    `),
    sourcePool.query(`
      select provider, provider_account_id, user_id, expires_at, created_at, updated_at
      from deleted_auth_account_markers
      order by created_at asc nulls last, provider asc, provider_account_id asc
    `),
  ]);

  return {
    profiles: profiles.rows,
    authUserMap: authUserMap.rows,
    authSessionStates: authSessionStates.rows,
    deletedAuthAccountMarkers: deletedAuthAccountMarkers.rows,
  };
}

async function upsertProfiles(client, rows) {
  for (const row of rows) {
    await client.query(
      `
        insert into profiles (id, nickname, provider_nickname, avatar_url, created_at)
        values ($1, $2, $3, $4, $5)
        on conflict (id) do update
        set
          nickname = excluded.nickname,
          provider_nickname = excluded.provider_nickname,
          avatar_url = excluded.avatar_url
      `,
      [
        row.id,
        row.nickname ?? null,
        row.provider_nickname ?? null,
        row.avatar_url ?? null,
        toIsoOrNull(row.created_at),
      ],
    );
  }
}

async function upsertAuthUserMap(client, rows) {
  for (const row of rows) {
    await client.query(
      `
        insert into auth_user_map (id, provider, provider_account_id, user_id, created_at)
        values ($1, $2, $3, $4, $5)
        on conflict (provider, provider_account_id) do update
        set user_id = excluded.user_id
      `,
      [
        row.id,
        row.provider,
        row.provider_account_id,
        row.user_id,
        toIsoOrNull(row.created_at),
      ],
    );
  }
}

async function upsertAuthSessionStates(client, rows) {
  for (const row of rows) {
    await client.query(
      `
        insert into auth_session_states (user_id, session_version, created_at, updated_at)
        values ($1, $2, $3, $4)
        on conflict (user_id) do update
        set
          session_version = excluded.session_version,
          updated_at = excluded.updated_at
      `,
      [
        row.user_id,
        row.session_version,
        toIsoOrNull(row.created_at),
        toIsoOrNull(row.updated_at),
      ],
    );
  }
}

async function upsertDeletedAuthAccountMarkers(client, rows) {
  for (const row of rows) {
    await client.query(
      `
        insert into deleted_auth_account_markers (
          provider,
          provider_account_id,
          user_id,
          expires_at,
          created_at,
          updated_at
        )
        values ($1, $2, $3, $4, $5, $6)
        on conflict (provider, provider_account_id) do update
        set
          user_id = excluded.user_id,
          expires_at = excluded.expires_at,
          updated_at = excluded.updated_at
      `,
      [
        row.provider,
        row.provider_account_id,
        row.user_id,
        toIsoOrNull(row.expires_at),
        toIsoOrNull(row.created_at),
        toIsoOrNull(row.updated_at),
      ],
    );
  }
}

async function main() {
  const watchDatabaseUrl = getRequiredUrl([
    process.env.WATCH_DATABASE_URL,
    readEnvFileValue(path.join(watchRoot, ".env.local"), "DATABASE_URL"),
  ]);
  const authDatabaseUrl = getRequiredUrl([
    process.env.AUTH_DATABASE_URL,
    process.env.DATABASE_URL,
    readEnvFileValue(path.join(launcherRoot, ".env.local"), "DATABASE_URL"),
  ]);

  const sourcePool = new Pool({ connectionString: watchDatabaseUrl });
  const targetPool = new Pool({ connectionString: authDatabaseUrl });

  try {
    const data = await readSourceRows(sourcePool);
    const client = await targetPool.connect();

    try {
      await client.query("begin");
      await upsertProfiles(client, data.profiles);
      await upsertAuthUserMap(client, data.authUserMap);
      await upsertAuthSessionStates(client, data.authSessionStates);
      await upsertDeletedAuthAccountMarkers(client, data.deletedAuthAccountMarkers);
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }

    console.log(
      JSON.stringify(
        {
          migrated: {
            profiles: data.profiles.length,
            auth_user_map: data.authUserMap.length,
            auth_session_states: data.authSessionStates.length,
            deleted_auth_account_markers: data.deletedAuthAccountMarkers.length,
          },
        },
        null,
        2,
      ),
    );
  } finally {
    await Promise.all([sourcePool.end(), targetPool.end()]);
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.stack ?? error.message : String(error),
  );
  process.exit(1);
});

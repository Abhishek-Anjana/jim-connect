import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const envPath = join(root, ".env");

async function loadEnvFile() {
  if (!existsSync(envPath)) return;
  const lines = (await readFile(envPath, "utf8")).split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

await loadEnvFile();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required. Add it to .env using your Supabase PostgreSQL connection string.");
}

const { Client } = pg;
const client = new Client({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes("supabase.co") ? { rejectUnauthorized: false } : undefined
});

try {
  await client.connect();
  await client.query(`
    create table if not exists notices (
      id serial primary key,
      title varchar(255) not null,
      message text not null,
      from_office varchar(100) not null,
      priority varchar(20) default 'Normal',
      created_at timestamp default now(),
      is_active boolean default true
    )
  `);
  console.log("Created notices table.");
} finally {
  await client.end();
}

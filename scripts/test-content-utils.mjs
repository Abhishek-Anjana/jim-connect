import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(root, "src/utils/content.ts");
const outputPath = resolve(root, ".tmp-tests/content-utils.cjs");
const source = await readFile(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020
  }
}).outputText;

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, compiled);

const { sortArchiveEntries, sortUpcomingEvents, sortWinners } = await import(`file:///${outputPath.replace(/\\/g, "/")}`);

const events = [
  {
    id: "ended",
    name: "Ended",
    startsAt: "2026-05-01T10:00:00+05:30",
    endsAt: "2026-05-01T11:00:00+05:30"
  },
  {
    id: "later",
    name: "Later",
    startsAt: "2026-05-09T10:00:00+05:30",
    endsAt: "2026-05-09T11:00:00+05:30"
  },
  {
    id: "sooner",
    name: "Sooner",
    startsAt: "2026-05-08T10:00:00+05:30",
    endsAt: "2026-05-08T11:00:00+05:30"
  }
];

assert.deepEqual(
  sortUpcomingEvents(events, new Date("2026-05-07T12:00:00+05:30")).map((event) => event.id),
  ["sooner", "later"]
);

assert.deepEqual(
  sortArchiveEntries([
    { id: "old", date: "2025-01-01" },
    { id: "new", date: "2026-01-01" }
  ]).map((entry) => entry.id),
  ["new", "old"]
);

assert.deepEqual(
  sortWinners([
    { id: "b", name: "Bina", champion: false },
    { id: "c", name: "Chirag", champion: true },
    { id: "a", name: "Asha", champion: true }
  ]).map((winner) => winner.id),
  ["a", "c", "b"]
);

console.log("Content utility tests passed.");

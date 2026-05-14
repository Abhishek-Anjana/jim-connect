import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(root, "src/services/contentGuards.ts");
const linksSourcePath = resolve(root, "src/utils/links.ts");
const outputPath = resolve(root, ".tmp-tests/src/services/contentGuards.cjs");
const linksOutputPath = resolve(root, ".tmp-tests/src/utils/links.js");
const source = await readFile(sourcePath, "utf8");
const linksSource = await readFile(linksSourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    esModuleInterop: true,
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020
  }
}).outputText;
const compiledLinks = ts.transpileModule(linksSource, {
  compilerOptions: {
    esModuleInterop: true,
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020
  }
}).outputText.replace('require("react-native")', "{ Linking: { openURL: async () => undefined } }");

await mkdir(dirname(outputPath), { recursive: true });
await mkdir(dirname(linksOutputPath), { recursive: true });
await writeFile(outputPath, compiled);
await writeFile(linksOutputPath, compiledLinks);

const guards = await import(`file:///${outputPath.replace(/\\/g, "/")}`);

const event = {
  id: "e1",
  name: "Event",
  startsAt: "2026-05-18T10:00:00+05:30",
  endsAt: "2026-05-18T11:00:00+05:30",
  venue: "Auditorium",
  club: "Student Affairs",
  image: "https://example.com/event.jpg",
  description: "Description",
  speakers: [],
  attachments: []
};

const archive = {
  id: "a1",
  eventId: "past-1",
  name: "Event",
  date: "2026-04-26",
  club: "Student Affairs",
  year: "2026",
  image: "https://example.com/archive.jpg",
  summary: Array.from({ length: 100 }, (_, index) => `word${index}`).join(" "),
  driveUrl: "https://drive.google.com/"
};

const winner = {
  id: "w1",
  name: "Winner",
  batch: "2025-27",
  award: "Champion",
  category: "Leadership",
  club: "Student Affairs",
  eventName: "Event",
  archiveId: "a1",
  portrait: "https://example.com/portrait.jpg",
  champion: true
};

assert.equal(guards.isValidEvent(event), true);
assert.equal(guards.isValidEvent({ ...event, image: "http://example.com/event.jpg" }), false);
assert.equal(guards.isValidArchiveEntry(archive), true);
assert.equal(guards.isValidArchiveEntry({ ...archive, summary: "too short" }), false);
assert.equal(guards.isValidWinner(winner), true);
assert.doesNotThrow(() => guards.assertContentRelations([event], [archive], [winner]));
assert.throws(() => guards.assertContentRelations([event], [archive], [{ ...winner, archiveId: "missing" }]));
assert.throws(() => guards.assertContentRelations([event], [archive], [{ ...winner, eventName: "Different Event" }]));

console.log("Content guard tests passed.");

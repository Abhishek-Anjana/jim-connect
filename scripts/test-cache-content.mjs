import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  ["src/hooks/useJimConnectContent.ts", ".tmp-tests/src/hooks/useJimConnectContent.cjs"],
  ["src/services/contentGuards.ts", ".tmp-tests/src/services/contentGuards.js"],
  ["src/utils/links.ts", ".tmp-tests/src/utils/links.js"],
  ["src/data/content.ts", ".tmp-tests/src/data/content.js"],
  ["src/services/jimConnectApi.ts", ".tmp-tests/src/services/jimConnectApi.js"],
  ["src/config/env.ts", ".tmp-tests/src/config/env.js"],
  ["src/utils/content.ts", ".tmp-tests/src/utils/content.js"]
];

for (const [input, output] of files) {
  const source = await readFile(resolve(root, input), "utf8");
  let compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;

  compiled = compiled
    .replace('require("@react-native-async-storage/async-storage")', "{ default: { getItem: async () => null, setItem: async () => undefined, removeItem: async () => undefined } }")
    .replace('require("react-native")', "{ Linking: { openURL: async () => undefined } }");

  const outputPath = resolve(root, output);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, compiled);
}

const { parseCachedContentForTest } = await import(
  `file:///${resolve(root, ".tmp-tests/src/hooks/useJimConnectContent.cjs").replace(/\\/g, "/")}`
);

const summary = Array.from({ length: 100 }, (_, index) => `word${index}`).join(" ");
const validCache = {
  events: [
    {
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
    }
  ],
  archive: [
    {
      id: "a1",
      eventId: "past-1",
      name: "Event",
      date: "2026-04-26",
      club: "Student Affairs",
      year: "2026",
      image: "https://example.com/archive.jpg",
      summary,
      driveUrl: "https://drive.google.com/"
    }
  ],
  fame: [
    {
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
    }
  ],
  savedAt: "2026-05-07T16:40:00.000Z"
};

assert.equal(parseCachedContentForTest(JSON.stringify(validCache)).archive.length, 1);
assert.throws(() => parseCachedContentForTest(JSON.stringify({ ...validCache, savedAt: "not a date" })));
assert.throws(() =>
  parseCachedContentForTest(
    JSON.stringify({
      ...validCache,
      fame: [{ ...validCache.fame[0], archiveId: "missing" }]
    })
  )
);
assert.throws(() => parseCachedContentForTest("{"));

console.log("Cache content tests passed.");

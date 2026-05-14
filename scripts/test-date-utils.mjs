import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(root, "src/utils/date.ts");
const outputPath = resolve(root, ".tmp-tests/date-utils.cjs");
const source = await readFile(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020
  }
}).outputText;

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, compiled);

const { getEventTimingLabel } = await import(`file:///${outputPath.replace(/\\/g, "/")}`);

assert.equal(
  getEventTimingLabel(
    "2026-05-11T09:00:00+05:30",
    "2026-05-11T17:00:00+05:30",
    new Date("2026-05-11T10:00:00+05:30")
  ),
  "Happening now"
);
assert.equal(
  getEventTimingLabel(
    "2026-05-11T18:00:00+05:30",
    "2026-05-11T20:00:00+05:30",
    new Date("2026-05-11T10:00:00+05:30")
  ),
  "Today"
);
assert.equal(
  getEventTimingLabel(
    "2026-05-12T10:00:00+05:30",
    "2026-05-12T12:00:00+05:30",
    new Date("2026-05-11T10:00:00+05:30")
  ),
  "Tomorrow"
);
assert.equal(
  getEventTimingLabel(
    "2026-05-18T10:00:00+05:30",
    "2026-05-18T12:00:00+05:30",
    new Date("2026-05-11T10:00:00+05:30")
  ),
  "In 7 days"
);
assert.equal(
  getEventTimingLabel(
    "2026-05-09T10:00:00+05:30",
    "2026-05-09T12:00:00+05:30",
    new Date("2026-05-11T10:00:00+05:30")
  ),
  "Event ended"
);

console.log("Date utility tests passed.");

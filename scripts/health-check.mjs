const checks = [
  ["Main app", "http://localhost:8081"],
  ["API health", "http://localhost:3001/health"],
  ["Admin portal", "http://localhost:3001/admin"],
  ["Events API", "http://localhost:3001/events/upcoming"]
];

let failed = false;

for (const [label, url] of checks) {
  try {
    const response = await fetch(url);
    const ok = response.ok;
    console.log(`${ok ? "OK" : "FAIL"} ${label}: ${response.status} ${url}`);
    if (!ok) failed = true;
  } catch (error) {
    failed = true;
    console.log(`FAIL ${label}: ${error instanceof Error ? error.message : "unknown error"} ${url}`);
  }
}

if (failed) process.exit(1);

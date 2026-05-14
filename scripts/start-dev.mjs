import { spawn } from "node:child_process";

const processes = [
  {
    args: ["run", "api"],
    name: "api"
  },
  {
    args: ["run", "start:web"],
    name: "web"
  }
];

const children = processes.map((item) => {
  const child = spawn("npm.cmd", item.args, {
    shell: false,
    stdio: ["ignore", "pipe", "pipe"]
  });

  child.stdout.on("data", (chunk) => process.stdout.write(`[${item.name}] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[${item.name}] ${chunk}`));
  child.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[${item.name}] exited with code ${code}`);
    }
  });

  return child;
});

function shutdown() {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
}

process.on("SIGINT", () => {
  shutdown();
  process.exit(0);
});

process.on("SIGTERM", () => {
  shutdown();
  process.exit(0);
});

console.log("JIM-Connect dev servers starting...");
console.log("App: http://localhost:8081");
console.log("Admin: http://localhost:3001/admin");

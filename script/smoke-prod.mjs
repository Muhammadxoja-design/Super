import { spawn } from "node:child_process";

const smokeEnv = {
  ...process.env,
  NODE_ENV: "production",
  SMOKE_TEST: "1",
  PORT: process.env.PORT || "5000",
  DATABASE_URL:
    process.env.DATABASE_URL ||
    "postgres://postgres:postgres@localhost:5432/postgres",
};

const child = spawn(
  process.execPath,
  ["--enable-source-maps", "dist/index.js"],
  {
    env: smokeEnv,
    stdio: ["ignore", "pipe", "pipe"],
  },
);

let ready = false;
const timeoutMs = 5000;

const shutdown = (code) => {
  if (!child.killed) {
    child.kill("SIGTERM");
  }
  process.exit(code);
};

const handleOutput = (data) => {
  const text = data.toString();
  process.stdout.write(text);
  if (text.includes("Listening on PORT=")) {
    ready = true;
    setTimeout(() => shutdown(0), timeoutMs);
  }
};

child.stdout.on("data", handleOutput);
child.stderr.on("data", (data) => {
  process.stderr.write(data.toString());
});

child.on("exit", (code) => {
  if (ready) return;
  shutdown(code ?? 1);
});

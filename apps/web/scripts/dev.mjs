import { spawn } from "node:child_process";
import process from "node:process";
import { existsSync } from "node:fs";

for (const file of [".env.local", "../../.env"]) if (existsSync(file)) process.loadEnvFile(file);

// Credential-free `pnpm dev` connects the mission and parent space to the same API.
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, WIGGLE_API_URL: process.env.WIGGLE_API_URL || "http://127.0.0.1:8000" },
});
child.on("exit", code => process.exit(code ?? 0));

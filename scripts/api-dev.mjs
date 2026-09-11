import { spawn } from "node:child_process";
import process from "node:process";
import { existsSync } from "node:fs";

if (existsSync(".env")) process.loadEnvFile(".env");

const child = spawn("python", ["-m", "uvicorn", "app.main:app", "--reload", "--no-access-log"], {
  cwd: new URL("../apps/api", import.meta.url), stdio: "inherit", env: process.env,
});
child.on("exit", code => process.exit(code ?? 0));

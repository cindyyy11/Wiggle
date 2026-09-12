import { defineConfig } from "@playwright/test";

const localURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3100";
const connectedURL = process.env.PLAYWRIGHT_CONNECTED_URL || "http://127.0.0.1:3101";
export default defineConfig({
  testDir: "./tests/browser",
  outputDir: "../../.superpowers/sdd/2026-09-11-wiggle-hybrid-universe/browser-artifacts",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  reporter: [["list"], ["html", { outputFolder: "../../.superpowers/sdd/2026-09-11-wiggle-hybrid-universe/playwright-report", open: "never" }]],
  use: {
    baseURL: localURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    headless: true,
    channel: "chrome",
    launchOptions: { args: ["--enable-unsafe-swiftshader"] },
  },
  projects: [
    { name: "desktop", testIgnore: "**/parent-connected.spec.ts", use: { viewport: { width: 1440, height: 900 } } },
    { name: "mobile", testIgnore: "**/parent-connected.spec.ts", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 } },
    { name: "connected-desktop", testDir: ".", testMatch: ["e2e/**/*.spec.ts", "tests/browser/parent-connected.spec.ts"], use: { baseURL: connectedURL, viewport: { width: 1440, height: 900 } } },
    { name: "connected-mobile", testDir: ".", testMatch: ["e2e/**/*.spec.ts", "tests/browser/parent-connected.spec.ts"], use: { baseURL: connectedURL, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 } },
  ],
  webServer: process.env.PLAYWRIGHT_EXTERNAL_SERVERS ? undefined : [
    { command: "python -m uvicorn browser_server:app --app-dir tests --host 127.0.0.1 --port 8101 --workers 1 --no-access-log", cwd: "../api", url: "http://127.0.0.1:8101/health", reuseExistingServer: false, env: { WIGGLE_REPOSITORY_BACKEND: "memory", WIGGLE_AI_PROVIDER: "local", WIGGLE_PIN_STORE_PATH: "" } },
    { command: "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3100", url: localURL, reuseExistingServer: false, env: { NEXT_IGNORE_INCORRECT_LOCKFILE: "1", WIGGLE_API_URL: "", NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "" } },
    { command: "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3101", url: connectedURL, reuseExistingServer: false, env: { NEXT_IGNORE_INCORRECT_LOCKFILE: "1", WIGGLE_API_URL: "http://127.0.0.1:8101", NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "" } },
  ],
});

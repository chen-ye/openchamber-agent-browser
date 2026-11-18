import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./test",
  testMatch: ["**/*.playwright.ts"],
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  use: {
    headless: true,
  },
});

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: {
    baseURL: 'http://127.0.0.1:8421',
    headless: true,
  },
  webServer: {
    command: 'python3 -m http.server 8421 --bind 127.0.0.1',
    port: 8421,
    reuseExistingServer: true,
  },
});

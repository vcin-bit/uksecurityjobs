const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './specs',
  timeout: 60000,
  retries: 1,
  use: {
    baseURL: 'https://app.uksecurityjobs.co.uk',
    headless: true,
    viewport: { width: 1280, height: 900 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    slowMo: 200,
  },
  reporter: [['list'], ['html', { outputFolder: 'reports', open: 'never' }]],
});

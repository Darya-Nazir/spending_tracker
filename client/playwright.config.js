import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './e2e/specs',
    webServer: {
        command: 'npm run dev',
        port: 9000,
        timeout: 120 * 1000,
        reuseExistingServer: !process.env.CI,
    },
    use: {
        baseURL: 'http://localhost:9000',
        screenshot: 'only-on-failure'
    },
});
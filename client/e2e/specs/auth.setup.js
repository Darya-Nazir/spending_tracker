import { test } from '@playwright/test';

import { Auth } from "../../src/services/auth.js";

// Arrange: test environment setup for all tests
Auth.accessTokenKey = 'test_access_token';
test.describe.configure({ mode: 'serial' });

// Arrange: cleanup setup after each test
test.afterEach(async ({ context }) => {
    // Act: clear browser state
    await context.clearCookies();
    const pages = context.pages();

    // Act: clear storage for all open pages
    await Promise.all(pages.map(page => page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
    })));
});

export { test };


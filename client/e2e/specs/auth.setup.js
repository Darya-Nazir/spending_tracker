import { test } from '@playwright/test';

import { Auth } from "../../src/services/auth.js";

Auth.accessTokenKey = 'test_access_token';
test.describe.configure({ mode: 'serial' });

test.afterEach(async ({ context }) => {
    await context.clearCookies();
    const pages = context.pages();
    await Promise.all(pages.map(page => page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
    })));
});

export { test };


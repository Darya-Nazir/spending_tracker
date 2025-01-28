import { test } from '@playwright/test';

import { Auth } from "../../src/services/auth.js";

// Arrange: настройка тестового окружения для всех тестов
Auth.accessTokenKey = 'test_access_token';
test.describe.configure({ mode: 'serial' });

// Arrange: настройка очистки после каждого теста
test.afterEach(async ({ context }) => {
    // Act: очистка состояния браузера
    await context.clearCookies();
    const pages = context.pages();

    // Act: очистка хранилищ для всех открытых страниц
    await Promise.all(pages.map(page => page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
    })));
});

export { test };


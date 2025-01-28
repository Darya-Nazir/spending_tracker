import { expect } from '@playwright/test';

import { test } from './auth.setup.js';
import { createTestUser } from '../fixtures/users.js';

const validUser = createTestUser();

test.describe('Login success scenarios', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        // Настраиваем мок для успешного ответа API
        await page.route('**/api/login', route => route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                tokens: { accessToken: 'mock-token', refreshToken: 'mock-refresh' },
                user: { id: 1, name: validUser.fullName }
            })
        }));
    });

    test('successful login', async ({ page }) => {
        await page.fill('#email', validUser.email);
        await page.fill('#password', validUser.password);
        const responsePromise = page.waitForResponse(res => res.url().includes('/api/login'));
        await page.click('button[type="submit"]');
        await responsePromise;
        await expect(page).toHaveURL('/');
    });

    test('remember me functionality', async ({ page }) => {
        await page.fill('#email', validUser.email);
        await page.fill('#password', validUser.password);
        await page.check('#rememberMe');
        const responsePromise = page.waitForResponse(res => res.url().includes('/api/login'));
        await page.click('button[type="submit"]');
        await responsePromise;
        await expect(page).toHaveURL('/');
    });

    test('email validation', async ({ page }) => {
        await page.fill('#email', 'invalid-email');
        await page.click('button[type="submit"]');
        await expect(page.locator('#email')).toHaveClass(/is-invalid/);
    });

    test('empty form validation', async ({ page }) => {
        await page.click('button[type="submit"]');
        await expect(page.locator('form')).toHaveClass(/was-validated/);
    });
});

test.describe('Login error scenarios', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
    });

    test('invalid credentials', async ({ page }) => {
        // Переопределяем мок для неуспешной авторизации
        await page.route('**/api/login', route => route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Пользователь с такими данными не зарегистрирован' })
        }));

        await page.fill('#email', 'wrong@email.com');
        await page.fill('#password', 'wrongpass');
        await page.click('button[type="submit"]');
        const dialog = await page.waitForEvent('dialog');
        expect(dialog.message()).toBe('Пользователь с такими данными не зарегистрирован');
        await dialog.accept();
    });

    test('invalid credentials: should show only one alert', async ({ page }) => {
        await page.route('**/api/login', route => route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Пользователь с такими данными не зарегистрирован' })
        }));

        await page.fill('#email', 'wrong@email.com');
        await page.fill('#password', 'wrongpass');

        let dialogCount = 0;
        const dialogHandler = dialog => {
            dialogCount++;
            dialog.accept();
        };

        page.on('dialog', dialogHandler);
        await page.click('button[type="submit"]');

        // Ждем появления диалога
        await page.waitForEvent('dialog');
        // Даем время на потенциальное появление второго диалога
        await page.waitForTimeout(100);

        page.removeListener('dialog', dialogHandler);
        expect(dialogCount).toBe(1);
    });
});
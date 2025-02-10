import { expect } from '@playwright/test';

import { test } from './auth.setup.js';
import { createTestUser } from '../fixtures/users.js';

const validUser = createTestUser();

test.describe('Login success scenarios', () => {
    // Common Arrange for all tests in describe block
    test.beforeEach(async ({ page }) => {
        // Arrange: test environment setup
        await page.goto('/login');
        // Arrange: mock API setup
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
        // Arrange: fill form with valid data
        await page.fill('#email', validUser.email);
        await page.fill('#password', validUser.password);
        const responsePromise = page.waitForResponse(res =>
            res.url().includes('/api/login'));

        // Act: submit form
        await page.click('button[type="submit"]');
        await responsePromise;

        // Assert: check successful redirect
        await expect(page).toHaveURL('/');
    });

    test('remember me functionality', async ({ page }) => {
        // Arrange: fill form with "remember me" checked
        await page.fill('#email', validUser.email);
        await page.fill('#password', validUser.password);
        await page.check('#rememberMe');
        const responsePromise = page.waitForResponse(res => res.url().includes('/api/login'));

        // Act: submit form
        await page.click('button[type="submit"]');
        await responsePromise;

        // Assert: check successful redirect
        await expect(page).toHaveURL('/');
    });

    test('email validation', async ({ page }) => {
        // Arrange: fill form with invalid email
        await page.fill('#email', 'invalid-email');

        // Act: attempt to submit form
        await page.click('button[type="submit"]');

        // Assert: check validation class appears
        await expect(page.locator('#email')).toHaveClass(/is-invalid/);
    });

    test('empty form validation', async ({ page }) => {
        // Act: attempt to submit empty form
        await page.click('button[type="submit"]');

        // Assert: check validation class appears on form
        await expect(page.locator('form')).toHaveClass(/was-validated/);
    });
});

test.describe('Login error scenarios', () => {
    test.beforeEach(async ({ page }) => {
        // Arrange: basic page setup
        await page.goto('/login');
    });

    test('invalid credentials', async ({ page }) => {
        // Arrange: mock for unsuccessful authorization
        await page.route('**/api/login', route => route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Пользователь с такими данными не зарегистрирован' })
        }));
        await page.fill('#email', 'wrong@email.com');
        await page.fill('#password', 'wrongpass');

        // Act & Assert: wait for dialog before clicking submit
        const dialogPromise = page.waitForEvent('dialog');
        await page.click('button[type="submit"]');

        const dialog = await dialogPromise;
        expect(dialog.message()).toBe('Пользователь с такими данными не зарегистрирован');
        await dialog.accept();
    });

    test('invalid credentials: should show only one alert', async ({ page }) => {
        // Arrange: setup mock and dialog tracking
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

        // Act: submit form and wait for response
        const responsePromise = page.waitForResponse(res =>
            res.url().includes('/api/login'));
        const dialogPromise = page.waitForEvent('dialog');

        await page.click('button[type="submit"]');
        await responsePromise;
        await dialogPromise;

        // Assert: check number of dialogs shown
        page.removeListener('dialog', dialogHandler);
        expect(dialogCount).toBe(1);
    });
});


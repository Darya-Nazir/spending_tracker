import { test, expect } from '@playwright/test';

import { testUsers } from '../fixtures/users.js';

test.describe('Authentication', () => {
    const validUser = testUsers.new;

    test.describe('Registration', () => {
        test.beforeEach(async ({ page }) => {
            await page.goto('/signup');
        });

        test('successful registration', async ({ page }) => {
            await page.fill('#fullName', validUser.fullName);
            await page.fill('#email', validUser.email);
            await page.fill('#password', validUser.password);
            await page.fill('#confirmPassword', validUser.confirmPassword);
            const responsePromise = page.waitForResponse(res => res.url().includes('/api/signup'));
            await page.click('button[type="submit"]');
            await responsePromise;
            await expect(page).toHaveURL('/');
        });

        test('empty form validation', async ({ page }) => {
            await page.click('button[type="submit"]');
            await expect(page.locator('form')).toHaveClass(/was-validated/);
            await expect(page.locator('#fullName')).toHaveClass(/is-invalid/);
        });

        test('invalid email format', async ({ page }) => {
            await page.fill('#email', 'invalid-email');
            await page.click('button[type="submit"]');
            await expect(page.locator('#email')).toHaveClass(/is-invalid/);
        });

        test('password mismatch', async ({ page }) => {
            await page.fill('#password', validUser.password);
            await page.fill('#confirmPassword', 'DifferentPass123!');
            await page.click('button[type="submit"]');
            await expect(page.locator('#confirmPassword')).toHaveClass(/is-invalid/);
        });
    });

    test.describe('Login', () => {
        test.beforeEach(async ({ page }) => {
            await page.goto('/signup');
            await page.fill('#fullName', validUser.fullName);
            await page.fill('#email', validUser.email);
            await page.fill('#password', validUser.password);
            await page.fill('#confirmPassword', validUser.confirmPassword);
            const responsePromise = page.waitForResponse(res => res.url().includes('/api/signup'));
            await page.click('button[type="submit"]');
            await responsePromise;
            await page.goto('/login');
        });

        test('successful login', async ({ page }) => {
            await page.fill('#email', validUser.email);
            await page.fill('#password', validUser.password);
            const responsePromise = page.waitForResponse(res => res.url().includes('/api/login'));
            await page.click('button[type="submit"]');
            await responsePromise;
            await expect(page).toHaveURL('/');
        });

        test('invalid credentials', async ({ page }) => {
            await page.fill('#email', 'wrong@email.com');
            await page.fill('#password', 'wrongpass');
            await page.click('button[type="submit"]');
            const dialog = await page.waitForEvent('dialog');
            expect(dialog.message()).toBe('Пользователь с такими данными не зарегистрирован');
            await dialog.accept();
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
});
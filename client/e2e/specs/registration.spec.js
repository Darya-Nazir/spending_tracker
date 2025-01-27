import { expect } from '@playwright/test';

import { test } from './auth.setup.js';
import { createTestUser } from '../fixtures/users.js';

test.describe('Registration', () => {
    const validUser = createTestUser();

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


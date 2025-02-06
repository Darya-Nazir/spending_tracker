import { expect } from '@playwright/test';

import { test } from './auth.setup.js';
import { createTestUser } from '../fixtures/users.js';

test.describe('Registration', () => {
    const validUser = createTestUser();

    // Arrange
    test.beforeEach(async ({ page }) => {
        await page.goto('/signup');
    });

    test('successful registration', async ({ page }) => {
        // Arrange - mock for registration
        await page.route('**/api/signup', route => {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true })
            });
        });

        // Arrange - mock for login
        await page.route('**/api/login', route => {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    tokens: { accessToken: 'mock-token', refreshToken: 'mock-refresh' },
                    user: { id: 1, name: validUser.fullName }
                })
            });
        });

        // Arrange - mock for GET categories requests - return empty arrays
        // to trigger default categories creation
        await page.route('**/api/categories/expense', route => {
            if (route.request().method() === 'GET') {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([])
                });
            }
            return route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
        });

        // Arrange
        await page.route('**/api/categories/income', route => {
            if (route.request().method() === 'GET') {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([])
                });
            }
            return route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
        });

        // Arrange - fill the form
        await page.fill('#fullName', validUser.fullName);
        await page.fill('#email', validUser.email);
        await page.fill('#password', validUser.password);
        await page.fill('#confirmPassword', validUser.confirmPassword);

        // Act - submit form and wait for all requests
        const signupPromise = page.waitForResponse(res => res.url().includes('/api/signup'));
        const loginPromise = page.waitForResponse(res => res.url().includes('/api/login'));
        const expenseCategoriesGetPromise = page.waitForResponse(
            res => res.url().includes('/api/categories/expense') && res.request().method() === 'GET'
        );
        const incomeCategoriesGetPromise = page.waitForResponse(
            res => res.url().includes('/api/categories/income') && res.request().method() === 'GET'
        );

        await page.click('button[type="submit"]');

        // Act - wait for all requests to complete
        await Promise.all([
            signupPromise,
            loginPromise,
            expenseCategoriesGetPromise,
            incomeCategoriesGetPromise
        ]);

        // Act - wait for POST requests to create categories
        await page.waitForResponse(
            res => res.url().includes('/api/categories') && res.request().method() === 'POST'
        );

        // Assert - check redirect to home page
        await page.waitForURL('/');
        await expect(page).toHaveURL('/');
    });

    test('empty form validation', async ({ page }) => {
        // Act
        await page.click('button[type="submit"]');
        // Assert
        await expect(page.locator('form')).toHaveClass(/was-validated/);
        await expect(page.locator('#fullName')).toHaveClass(/is-invalid/);
    });

    test('invalid email format', async ({ page }) => {
        // Arrange
        await page.fill('#email', 'invalid-email');
        // Act
        await page.click('button[type="submit"]');
        // Assert
        await expect(page.locator('#email')).toHaveClass(/is-invalid/);
    });

    test('password mismatch', async ({ page }) => {
        // Arrange
        await page.fill('#password', validUser.password);
        await page.fill('#confirmPassword', 'DifferentPass123!');
        // Act
        await page.click('button[type="submit"]');
        // Assert
        await expect(page.locator('#confirmPassword')).toHaveClass(/is-invalid/);
    });
});
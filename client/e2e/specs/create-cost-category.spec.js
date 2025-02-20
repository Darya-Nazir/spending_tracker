import { expect } from '@playwright/test';

import { test } from './auth.setup.js';
import { mockTokens } from "../fixtures/test-data.js";
import { createTestUser } from '../fixtures/users.js';

test.describe('Create Cost Category', () => {
    // Arrange - prepare test data
    const validUser = createTestUser();
    const tokens = mockTokens;

    test.beforeEach(async ({ page }) => {
        // Arrange - setup API mocks and prepare initial state
        await page.route('**/api/**', route => {
            const url = route.request().url();

            if (url.includes('/api/login')) {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        tokens: tokens,
                        user: { id: 1, name: validUser.fullName }
                    })
                });
            }

            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([])
            });
        });

        // Act - perform preliminary actions for all tests
        await page.goto('/login');
        await page.fill('#email', validUser.email);
        await page.fill('#password', validUser.password);
        await page.click('button[type="submit"]');
        await page.waitForURL('/');

        await page.click('#dropdownMenuButton1');
        await page.click('#costsPage');
        await page.waitForURL('/costs');
        await page.click('#addCategoryBtn');
        await page.waitForURL('/create-cost');
    });

    test('successful category creation', async ({ page }) => {
        // Arrange - setup mock for successful category creation
        await page.route('**/api/categories/expense', route => {
            if (route.request().method() === 'POST') {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ success: true })
                });
            }
        });

        // Act - fill and submit form
        await page.fill('.form-control', 'New Category');
        const responsePromise = page.waitForResponse(
            res => res.url().includes('/api/categories/expense') &&
                res.request().method() === 'POST'
        );
        await page.click('#create');

        // Assert - check successful response and redirect
        const response = await responsePromise;
        expect(response.ok()).toBeTruthy();
        await page.waitForURL('/costs');
    });

    test('empty category name validation', async ({ page }) => {
        // Arrange - prepare dialog handler
        page.on('dialog', async dialog => {
            // Assert - check error message
            expect(dialog.message()).toBe('Введите название категории!');
            await dialog.accept();
        });

        // Act - attempt to create category with empty name
        await page.click('#create');

        // Assert - check user remains on creation page
        await expect(page).toHaveURL(/create-cost$/);
    });

    test('duplicate category error handling', async ({ page }) => {
        // Arrange - setup mock for duplicate error
        await page.route('**/api/categories/expense', route => {
            if (route.request().method() === 'POST') {
                return route.fulfill({
                    status: 400,
                    contentType: 'application/json',
                    body: JSON.stringify({ message: 'Category already exist' })
                });
            }
        });

        // Arrange - prepare dialog handler
        page.on('dialog', async dialog => {
            // Assert - check error message
            expect(dialog.message()).toBe('Такая категория уже существует');
            await dialog.accept();
        });

        // Act - attempt to create duplicate category
        await page.fill('.form-control', 'Food');
        await page.click('#create');

        // Assert - check user remains on creation page
        await expect(page).toHaveURL(/create-cost$/);
    });

    test('cancel button navigation', async ({ page }) => {
        // Act - click cancel button
        await page.click('#cancel');

        // Assert - check redirect to costs page
        await page.waitForURL('/costs');
    });

    test('generic error handling', async ({ page }) => {
        // Arrange - setup mock for general server error
        await page.route('**/api/categories/expense', route => {
            if (route.request().method() === 'POST') {
                return route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: JSON.stringify({ message: 'Internal server error' })
                });
            }
        });

        // Arrange - prepare dialog handler
        page.on('dialog', async dialog => {
            // Assert - check error message
            expect(dialog.message()).toBe('Не удалось добавить категорию, попробуйте еще раз.');
            await dialog.accept();
        });

        // Act - attempt to create category with server error
        await page.fill('.form-control', 'New Category');
        await page.click('#create');

        // Assert - check user remains on creation page
        await expect(page).toHaveURL(/create-cost$/);
    });
});


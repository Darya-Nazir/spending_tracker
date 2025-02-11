import { expect } from '@playwright/test';

import { test } from './auth.setup.js';
import { mockTokens } from "../fixtures/test-data.js";
import { createTestUser } from '../fixtures/users.js';

test.describe('Create Income Category', () => {
    // Arrange - test data preparation
    const validUser = createTestUser();
    const tokens = mockTokens;

    test.beforeEach(async ({ page }) => {
        // Arrange - API mocks setup and initial state preparation
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

        // Act - performing preliminary actions for all tests
        await page.goto('/login');
        await page.fill('#email', validUser.email);
        await page.fill('#password', validUser.password);
        await page.click('button[type="submit"]');
        await page.waitForURL('/');

        await page.click('#dropdownMenuButton1');
        await page.click('#revenuesPage');
        await page.waitForURL('/incomes');
        await page.click('#addCategoryBtn');
        await page.waitForURL('/create-income');
    });

    test('successful category creation', async ({ page }) => {
        // Arrange - mock setup for successful category creation
        await page.route('**/api/categories/income', route => {
            if (route.request().method() === 'POST') {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ success: true })
                });
            }
        });

        // Act - form filling and submission
        await page.fill('.form-control', 'Новая категория');
        const responsePromise = page.waitForResponse(
            res => res.url().includes('/api/categories/income') &&
                res.request().method() === 'POST'
        );
        await page.click('#create');

        // Assert - checking successful response and redirect
        const response = await responsePromise;
        expect(response.ok()).toBeTruthy();
        await page.waitForURL('/incomes');
    });

    test('empty category name validation', async ({ page }) => {
        // Arrange - dialog handler setup
        page.on('dialog', async dialog => {
            // Assert - checking error message
            expect(dialog.message()).toBe('Введите название категории!');
            await dialog.accept();
        });

        // Act - attempting to create category with empty name
        await page.click('#create');

        // Assert - checking that user remains on creation page
        await expect(page).toHaveURL(/create-income$/);
    });

    test('duplicate category error handling', async ({ page }) => {
        // Arrange - mock setup for duplicate error
        await page.route('**/api/categories/income', route => {
            if (route.request().method() === 'POST') {
                return route.fulfill({
                    status: 400,
                    contentType: 'application/json',
                    body: JSON.stringify({ message: 'Category already exist' })
                });
            }
        });

        // Arrange - dialog handler setup
        page.on('dialog', async dialog => {
            // Assert - checking error message
            expect(dialog.message()).toBe('Такая категория уже существует');
            await dialog.accept();
        });

        // Act - attempting to create duplicate category
        await page.fill('.form-control', 'Зарплата');
        await page.click('#create');

        // Assert - checking that user remains on creation page
        await expect(page).toHaveURL(/create-income$/);
    });

    test('cancel button navigation', async ({ page }) => {
        // Act - clicking cancel button
        await page.click('#cancel');

        // Assert - checking redirect to incomes page
        await page.waitForURL('/incomes');
    });

    test('generic error handling', async ({ page }) => {
        // Arrange - mock setup for general server error
        await page.route('**/api/categories/income', route => {
            if (route.request().method() === 'POST') {
                return route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: JSON.stringify({ message: 'Internal server error' })
                });
            }
        });

        // Arrange - dialog handler setup
        page.on('dialog', async dialog => {
            // Assert - checking error message
            expect(dialog.message()).toBe('Не удалось добавить категорию, попробуйте еще раз.');
            await dialog.accept();
        });

        // Act - attempting to create category with server error
        await page.fill('.form-control', 'Новая категория');
        await page.click('#create');

        // Assert - checking that user remains on creation page
        await expect(page).toHaveURL(/create-income$/);
    });
});
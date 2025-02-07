import { expect } from '@playwright/test';

import { test } from './auth.setup.js';
import { createTestUser } from '../fixtures/users.js';

test.describe('Edit Cost Category', () => {
    const validUser = createTestUser();
    const mockTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token'
    };

    const mockCategory = {
        id: 1,
        title: 'Продукты'
    };

    test.beforeEach(async ({ page }) => {
        // Skip requests to static files
        await page.route('**/*.{css,js,svg}', route => route.continue());

        // Mock API requests
        await page.route('**/api/**', async route => {
            const url = route.request().url();
            const method = route.request().method();

            // Login
            if (url.includes('/api/login')) {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        tokens: mockTokens,
                        user: { id: 1, name: validUser.fullName }
                    })
                });
            }

            // GET categories list
            if (url.includes('/api/categories/expense') && method === 'GET' && !url.includes(`/${mockCategory.id}`)) {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([mockCategory])
                });
            }

            // GET specific category
            if (url.includes(`/api/categories/expense/${mockCategory.id}`) && method === 'GET') {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify(mockCategory)
                });
            }

            // Default response for other requests
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([])
            });
        });

        // Login
        await page.goto('/login');
        await page.waitForSelector('#registrationForm');

        await page.fill('input[name="email"]', validUser.email);
        await page.fill('input[name="password"]', validUser.password);
        await page.click('button[type="submit"]');
        await page.waitForURL('/');

        // Navigate to edit page
        await page.click('#dropdownMenuButton1');
        await page.click('#costsPage');
        await page.waitForURL('/costs');

        await page.waitForSelector(`[data-id="${mockCategory.id}"]`);
        await page.click(`[data-id="${mockCategory.id}"] .btn-primary`);
        await page.waitForURL(`/edit-cost?id=${mockCategory.id}`);
        await page.waitForSelector('.form-control');
    });

    test('successful category edit', async ({ page }) => {
        // Arrange - mock for successful PUT request
        await page.route(`**/api/categories/expense/${mockCategory.id}`, route => {
            if (route.request().method() === 'PUT') {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ success: true })
                });
            }
        });

        // Act
        await page.fill('.form-control', 'Обновленные продукты');
        await page.click('#save');

        // Assert
        await page.waitForURL('/costs');
    });

    test('empty category name validation', async ({ page }) => {
        // Arrange
        let dialogShown = false;
        page.on('dialog', async dialog => {
            // Act
            dialogShown = true;
            expect(dialog.message()).toBe('Введите название категории!');
            await dialog.accept();
        });

        await page.fill('.form-control', '');
        await page.click('#save');

        // Assert - wait for alert to appear
        await page.waitForTimeout(100);
        expect(dialogShown).toBeTruthy();
        await expect(page).toHaveURL(`/edit-cost?id=${mockCategory.id}`);
    });

    test('duplicate category error handling', async ({ page }) => {
        // Arrange - mock for duplicate error
        let dialogShown = false;
        page.on('dialog', async dialog => {
            dialogShown = true;
            expect(dialog.message()).toBe('Не удалось обновить категорию, попробуйте еще раз.');
            await dialog.accept();
        });

        await page.route(`**/api/categories/expense/${mockCategory.id}`, route => {
            if (route.request().method() === 'PUT') {
                return route.fulfill({
                    status: 400,
                    contentType: 'application/json',
                    body: JSON.stringify({ message: 'Category already exist' })
                });
            }
        });

        // Act
        await page.fill('.form-control', 'Существующая категория');
        await page.click('#save');

        // Assert - wait for dialog to appear
        await page.waitForTimeout(100);
        expect(dialogShown).toBeTruthy();
        await expect(page).toHaveURL(`/edit-cost?id=${mockCategory.id}`);
    });

    test('cancel edit navigation', async ({ page }) => {
        await page.click('#cancel');
        await page.waitForURL('/costs');
    });

    test('invalid category id handling', async ({ page }) => {
        // Arrange
        let dialogShown = false;
        page.on('dialog', async dialog => {
            dialogShown = true;
            expect(dialog.message()).toBe('Не удалось загрузить данные категории!');
            await dialog.accept();
        });

        await page.route('**/api/categories/expense/invalid', route => {
            if (route.request().method() === 'GET') {
                return route.fulfill({
                    status: 404,
                    contentType: 'application/json',
                    body: JSON.stringify({ message: 'Category not found' })
                });
            }
        });

        // Act
        await page.goto('/edit-cost?id=invalid');

        // Assert - wait for dialog to appear
        await page.waitForTimeout(100);
        expect(dialogShown).toBeTruthy();
        await page.waitForURL('/costs');
    });

    test('server error handling', async ({ page }) => {
        // Arrange
        let dialogShown = false;
        page.on('dialog', async dialog => {
            dialogShown = true;
            expect(dialog.message()).toBe('Не удалось обновить категорию, попробуйте еще раз.');
            await dialog.accept();
        });

        await page.route(`**/api/categories/expense/${mockCategory.id}`, route => {
            if (route.request().method() === 'PUT') {
                return route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: JSON.stringify({ message: 'Internal server error' })
                });
            }
        });

        // Act
        await page.fill('.form-control', 'Новое название');
        await page.click('#save');

        // Assert - wait for dialog to appear
        await page.waitForTimeout(100);
        expect(dialogShown).toBeTruthy();
        await expect(page).toHaveURL(`/edit-cost?id=${mockCategory.id}`);
    });

    test('unauthorized access handling', async ({ page }) => {
        // Arrange - mock 401 error for editing
        await page.route(`**/api/categories/expense/${mockCategory.id}`, route => {
            if (route.request().method() === 'PUT') {
                return route.fulfill({
                    status: 401,
                    contentType: 'application/json',
                    body: JSON.stringify({ message: 'Unauthorized' })
                });
            }
        });

        // Arrange - mock refresh token request
        await page.route('**/api/refresh', route => {
            return route.fulfill({
                status: 401,
                contentType: 'application/json',
                body: JSON.stringify({ message: 'Refresh token expired' })
            });
        });

        // Act - fill form
        await page.fill('.form-control', 'Новое название');

        // Act - submit form and wait for all requests
        const savePromise = page.click('#save');
        const responsePromise = page.waitForResponse(
            res => res.url().includes(`/api/categories/expense/${mockCategory.id}`) &&
                res.request().method() === 'PUT'
        );

        // Wait for response and check status
        const response = await responsePromise;
        expect(response.status()).toBe(401);

        // Wait for click to complete
        await savePromise;

        // Assert - check redirect to login page
        await page.waitForURL('/login', { waitUntil: 'networkidle' });
    });
});
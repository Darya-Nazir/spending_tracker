import { expect } from '@playwright/test';

import { test } from './auth.setup.js';
import { createTestUser } from '../fixtures/users.js';

test.describe('Income Categories tests', () => {
    // Arrange
    const validUser = createTestUser();
    const mockTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token'
    };

    const mockIncomeCategories = [
        { id: 1, title: 'Зарплата' },
        { id: 2, title: 'Фриланс' },
        { id: 3, title: 'Инвестиции' }
    ];

    test.beforeEach(async ({ page }) => {
        // Mock API responses
        await page.route('**/api/**', route => {
            const url = route.request().url();

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

            if (url.includes('/api/categories/income')) {
                const method = route.request().method();
                if (method === 'GET') {
                    return route.fulfill({
                        status: 200,
                        contentType: 'application/json',
                        body: JSON.stringify(mockIncomeCategories)
                    });
                }
            }

            // Default response for other API requests
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([])
            });
        });

        // Login
        await page.goto('/login');
        await page.fill('#email', validUser.email);
        await page.fill('#password', validUser.password);
        await Promise.all([
            page.waitForResponse(res => res.url().includes('/api/login')),
            page.click('button[type="submit"]')
        ]);

        // Act. Navigate to incomes page
        await page.click('#dropdownMenuButton1');
        await page.click('#revenuesPage');
        await page.waitForURL('/incomes');
    });

    test('income page navigation and UI elements', async ({ page }) => {
        // Arrange - уже сделан в beforeEach

        // Act
        await page.waitForSelector('#dropdownMenuButton1');

        // Assert
        // Menu highlighting
        await expect(page.locator('#dropdownMenuButton1')).toHaveClass(/btn-primary/);
        await expect(page.locator('#revenuesPage')).toHaveClass(/bg-primary/);

        // Page elements
        await expect(page.locator('#incomesContainer')).toBeVisible();
        await expect(page.locator('#addCategoryBtn')).toBeVisible();

        // Categories display
        for (const category of mockIncomeCategories) {
            await expect(page.locator(`[data-id="${category.id}"]`)).toBeVisible();
            await expect(page.locator(`[data-id="${category.id}"] .card-title`))
                .toHaveText(category.title);
        }
    });

    test('add new income category navigation', async ({ page }) => {
        // Act. Click add category button
        await page.click('#addCategoryBtn');

        // Assert. Verify navigation to create page
        await page.waitForURL('/create-income');
    });

    test('edit income category navigation', async ({ page }) => {
        // Act. Click edit button on first category
        await page.click(`[data-id="1"] .btn-primary`);

        // Assert. Verify navigation to edit page with correct ID
        await page.waitForURL('/edit-income?id=1');
    });

    test('delete income category', async ({ page }) => {
        // Arrange
        await page.route('**/api/categories/income/1', route => {
            if (route.request().method() === 'DELETE') {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ success: true })
                });
            }
        });

        // Act
        await page.click(`[data-id="1"] .btn-danger`);
        await page.click('#confirmDeleteBtn');

        // Assert
        await expect(page.locator('#deleteCategoryModal')).toBeVisible();
        await expect(page.locator(`[data-id="1"]`)).not.toBeVisible();
    });

    test('cancel delete income category', async ({ page }) => {
        // Arrange - не требуется, выполнено в beforeEach

        // Act
        await page.click(`[data-id="1"] .btn-danger`);
        await page.click('button[data-bs-dismiss="modal"]');

        // Assert
        await expect(page.locator('#deleteCategoryModal')).not.toBeVisible();
        await expect(page.locator(`[data-id="1"]`)).toBeVisible();
    });

    test('unauthorized access handling', async ({ page }) => {
        // Arrange. Mock ответа с 401 ошибкой для категорий
        await page.route('**/api/categories/income', route => {
            return route.fulfill({
                status: 401,
                contentType: 'application/json',
                body: JSON.stringify({ message: 'Unauthorized' })
            });
        });

        // Act. Перезагружаем страницу чтобы вызвать запрос категорий
        await page.reload();

        // Ждем ответ с 401 ошибкой
        const response = await page.waitForResponse(
            res => res.url().includes('/api/categories/income')
        );

        // Assert. Проверяем что получили 401 статус
        expect(response.status()).toBe(401);
    });
});


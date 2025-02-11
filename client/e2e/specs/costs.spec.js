import { expect } from '@playwright/test';

import { test } from './auth.setup.js';
import { mockTokens } from '../fixtures/test-data.js';
import { createTestUser } from '../fixtures/users.js';

test.describe('Costs Categories tests', () => {
    // Arrange
    const validUser = createTestUser();
    const tokens = mockTokens;

    const mockCostCategories = [
        { id: 1, title: 'Продукты' },
        { id: 2, title: 'Транспорт' },
        { id: 3, title: 'Развлечения' }
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
                        tokens: tokens,
                        user: { id: 1, name: validUser.fullName }
                    })
                });
            }

            if (url.includes('/api/categories/expense')) {
                const method = route.request().method();
                if (method === 'GET') {
                    return route.fulfill({
                        status: 200,
                        contentType: 'application/json',
                        body: JSON.stringify(mockCostCategories)
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

        // Act - Navigate to costs page
        await page.click('#dropdownMenuButton1');
        await page.click('#costsPage');
        await page.waitForURL('/costs');
    });

    test('costs page navigation and UI elements', async ({ page }) => {
        // Arrange - done in beforeEach

        // Act
        await page.waitForSelector('#dropdownMenuButton1');

        // Assert
        // Menu highlighting
        await expect(page.locator('#dropdownMenuButton1')).toHaveClass(/btn-primary/);
        await expect(page.locator('#costsPage')).toHaveClass(/bg-primary/);

        // Page elements
        await expect(page.locator('#costsContainer')).toBeVisible();
        await expect(page.locator('#addCategoryBtn')).toBeVisible();

        // Categories display
        for (const category of mockCostCategories) {
            await expect(page.locator(`[data-id="${category.id}"]`)).toBeVisible();
            await expect(page.locator(`[data-id="${category.id}"] .card-title`))
                .toHaveText(category.title);
        }
    });

    test('add new cost category navigation', async ({ page }) => {
        // Act - Click add category button
        await page.click('#addCategoryBtn');

        // Assert - Verify navigation to create page
        await page.waitForURL('/create-cost');
    });

    test('edit cost category navigation', async ({ page }) => {
        // Act - Click edit button on first category
        await page.click(`[data-id="1"] .btn-primary`);

        // Assert - Verify navigation to edit page with correct ID
        await page.waitForURL('/edit-cost?id=1');
    });

    test('delete cost category', async ({ page }) => {
        // Arrange
        await page.route('**/api/categories/expense/1', route => {
            if (route.request().method() === 'DELETE') {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ success: true })
                });
            }
        });

        // Act & Assert
        await page.click(`[data-id="1"] .btn-danger`);
        await expect(page.locator('#deleteCategoryModal')).toBeVisible();

        await Promise.all([
            page.waitForSelector('#deleteCategoryModal', { state: 'hidden' }),
            page.waitForSelector(`[data-id="1"]`, { state: 'hidden' }),
            page.click('#confirmDeleteBtn')
        ]);
    });

    test('cancel delete cost category', async ({ page }) => {
        // Arrange - not needed, done in beforeEach

        // Act
        await page.click(`[data-id="1"] .btn-danger`);

        const modal = page.locator('#deleteCategoryModal');
        await expect(modal).toBeVisible();

        await Promise.all([
            page.waitForSelector('#deleteCategoryModal', { state: 'hidden' }),
            page.click('button[data-bs-dismiss="modal"]')
        ]);

        // Assert
        await expect(page.locator(`[data-id="1"]`)).toBeVisible();
    });

    test('unauthorized access handling', async ({ page }) => {
        // Arrange - Mock response with 401 error for categories
        await page.route('**/api/categories/expense', route => {
            return route.fulfill({
                status: 401,
                contentType: 'application/json',
                body: JSON.stringify({ message: 'Unauthorized' })
            });
        });

        // Act - Reload page to trigger categories request
        await page.reload();

        // Wait for 401 error response
        const response = await page.waitForResponse(
            res => res.url().includes('/api/categories/expense')
        );

        // Assert - Check 401 status received
        expect(response.status()).toBe(401);
    });
});

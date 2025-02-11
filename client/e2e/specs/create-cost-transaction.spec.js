import { expect } from '@playwright/test';

import { test } from './auth.setup.js';
import { mockTokens } from "../fixtures/test-data.js";
import { createTestUser } from '../fixtures/users.js';

test.describe('Create cost transaction', () => {
    // Global Arrange
    const validUser = createTestUser();
    const tokens = mockTokens;

    test.beforeEach(async ({ page }) => {
        // Arrange - setup API mocks
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

            if (url.includes('/api/categories/cost')) {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([
                        { id: 1, title: 'Проживание' },
                        { id: 2, title: 'Еда' }
                    ])
                });
            }

            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([])
            });
        });

        // Arrange - perform login
        await page.goto('/login');
        await page.fill('#email', validUser.email);
        await page.fill('#password', validUser.password);
        await page.click('button[type="submit"]');
        await page.waitForURL('/');

        // Arrange - navigate to create transaction page
        await page.goto('/create-transaction?type=cost');
        await page.waitForSelector('form', { state: 'visible' });
        await page.waitForLoadState('networkidle');
    });

    test('autocomplete transaction type', async ({ page }) => {
        // Arrange
        const typeInput = page.locator('.form-control[placeholder="Тип..."]');

        // Act - wait for element to be visible
        await expect(typeInput).toBeVisible();
        await expect(typeInput).toHaveValue('Расход');
        await expect(typeInput).toHaveAttribute('readonly', '');

        // Checking background style
        const background = await typeInput.evaluate(el =>
            window.getComputedStyle(el).backgroundColor);
        expect(background).toBe('rgb(248, 249, 250)');
    });

    test('working with a drop-down list of categories', async ({ page }) => {
        const categoriesList = page.locator('#categoriesList');
        const categoryInput = page.locator('#categoryInput');

        // Assert - initial state
        await expect(categoriesList).toHaveCSS('display', 'none');

        // Act - open dropdown
        await categoryInput.click();

        // Assert - check dropdown visibility
        await expect(categoriesList).toBeVisible();

        // Act - get list items
        const items = await page.locator('#categoriesList .dropdown-item').all();

        // Assert - check list content
        expect(items.length).toBe(2);
        await expect(items[0]).toHaveText('Проживание');
        await expect(items[1]).toHaveText('Еда');

        // Act - select category
        await items[0].click();

        // Assert - check selection results
        await expect(categoryInput).toHaveValue('Проживание');
        await expect(categoriesList).toHaveCSS('display', 'none');
    });

    test('amount field validation', async ({ page }) => {

    })

})
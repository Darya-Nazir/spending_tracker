import { expect } from '@playwright/test';

import { mockTokens } from '../fixtures/test-data.js';
import { createTestUser } from '../fixtures/users.js';
import { test } from '../specs/auth.setup.js';

export class BaseCategoriesTest {
    constructor(config) {
        this.pageUrl = config.pageUrl;
        this.apiUrl = config.apiUrl;
        this.createUrl = config.createUrl;
        this.editUrl = config.editUrl;
        this.pageId = config.pageId;
        this.containerId = config.containerId;
        this.mockCategories = config.mockCategories;
    }

    createTests() {
        test.describe(`${this.pageId} Categories tests`, () => {
            const validUser = createTestUser();
            const TwoMockTokens = mockTokens;

            test.beforeEach(async ({ page }) => {
                await page.route('**/api/**', route => {
                    const url = route.request().url();

                    if (url.includes('/api/login')) {
                        return route.fulfill({
                            status: 200,
                            contentType: 'application/json',
                            body: JSON.stringify({
                                tokens: TwoMockTokens,
                                user: { id: 1, name: validUser.fullName }
                            })
                        });
                    }

                    if (url.includes(this.apiUrl)) {
                        const method = route.request().method();
                        if (method === 'GET') {
                            return route.fulfill({
                                status: 200,
                                contentType: 'application/json',
                                body: JSON.stringify(this.mockCategories)
                            });
                        }
                    }

                    return route.fulfill({
                        status: 200,
                        contentType: 'application/json',
                        body: JSON.stringify([])
                    });
                });

                await page.goto('/login');
                await page.fill('#email', validUser.email);
                await page.fill('#password', validUser.password);
                await Promise.all([
                    page.waitForResponse(res => res.url().includes('/api/login')),
                    page.click('button[type="submit"]')
                ]);

                await page.click('#dropdownMenuButton1');
                await page.click(`#${this.pageId}Page`);
                await page.waitForURL(this.pageUrl);
            });

            test('page navigation and UI elements', async ({ page }) => {
                await page.waitForSelector('#dropdownMenuButton1');

                await expect(page.locator('#dropdownMenuButton1')).toHaveClass(/btn-primary/);
                await expect(page.locator(`#${this.pageId}Page`)).toHaveClass(/bg-primary/);

                await expect(page.locator(`#${this.containerId}`)).toBeVisible();
                await expect(page.locator('#addCategoryBtn')).toBeVisible();

                for (const category of this.mockCategories) {
                    await expect(page.locator(`[data-id="${category.id}"]`)).toBeVisible();
                    await expect(page.locator(`[data-id="${category.id}"] .card-title`))
                        .toHaveText(category.title);
                }
            });

            test('add new category navigation', async ({ page }) => {
                await page.click('#addCategoryBtn');
                await page.waitForURL(this.createUrl);
            });

            test('edit category navigation', async ({ page }) => {
                await page.click(`[data-id="1"] .btn-primary`);
                await page.waitForURL(`${this.editUrl}?id=1`);
            });

            test('delete category', async ({ page }) => {
                await page.route(`${this.apiUrl}/1`, route => {
                    if (route.request().method() === 'DELETE') {
                        return route.fulfill({
                            status: 200,
                            contentType: 'application/json',
                            body: JSON.stringify({ success: true })
                        });
                    }
                });

                await page.click(`[data-id="1"] .btn-danger`);
                await page.click('#confirmDeleteBtn');

                await expect(page.locator('#deleteCategoryModal')).toBeVisible();
                await expect(page.locator(`[data-id="1"]`)).not.toBeVisible();
            });

            test('cancel delete category', async ({ page }) => {
                await page.click(`[data-id="1"] .btn-danger`);
                await page.click('button[data-bs-dismiss="modal"]');

                await expect(page.locator('#deleteCategoryModal')).not.toBeVisible();
                await expect(page.locator(`[data-id="1"]`)).toBeVisible();
            });

            test('unauthorized access handling', async ({ page }) => {
                await page.route(this.apiUrl, route => {
                    return route.fulfill({
                        status: 401,
                        contentType: 'application/json',
                        body: JSON.stringify({ message: 'Unauthorized' })
                    });
                });

                await page.reload();

                const response = await page.waitForResponse(
                    res => res.url().includes(this.apiUrl)
                );

                expect(response.status()).toBe(401);
            });
        });
    }
}


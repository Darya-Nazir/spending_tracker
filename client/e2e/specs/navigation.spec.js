import { expect } from '@playwright/test';

import { test } from './auth.setup.js';
import { mockTokens } from '../fixtures/test-data.js';
import { createTestUser } from '../fixtures/users.js';

test.describe('Navigation tests', () => {
    const validUser = createTestUser();
    const TwoMockTokens = mockTokens;

    test.beforeEach(async ({ page }) => {
        // Arrange: setup API request mocks
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

            if (url.includes('/api/categories/expense')) {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([
                        { id: 1, name: 'Продукты' },
                        { id: 2, name: 'Транспорт' }
                    ])
                });
            }

            if (url.includes('/api/categories/income')) {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([
                        { id: 3, name: 'Зарплата' },
                        { id: 4, name: 'Фриланс' }
                    ])
                });
            }

            if (url.includes('/api/balance')) {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ balance: 500 })
                });
            }

            // Default response for other API requests
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([])
            });
        });

        // Arrange: perform system login
        await page.goto('/login');
        await page.fill('#email', validUser.email);
        await page.fill('#password', validUser.password);

        // Act: submit login form
        await Promise.all([
            page.waitForResponse(res => res.url().includes('/api/login')),
            page.click('button[type="submit"]')
        ]);

        // Arrange: wait for page to load completely
        await page.waitForLoadState('networkidle');
    });

    test('main navigation elements visibility', async ({ page }) => {
        // Arrange: wait for navigation elements to load
        await page.waitForSelector('#navbar');

        // Assert: check visibility of main navigation elements
        await expect(page.locator('#navbar')).toBeVisible();
        await expect(page.locator('.logo-link')).toBeVisible();
        await expect(page.locator('#mainPage')).toBeVisible();
        await expect(page.locator('#transactionsPage')).toBeVisible();
        await expect(page.locator('#dropdownMenuButton1')).toBeVisible();

        // Assert: check user information display
        await expect(page.locator('#balance')).toBeVisible();
        await expect(page.locator('#balance')).toHaveText('500$');
    });

    test('navigation through main menu', async ({ page }) => {
        // Arrange: wait for main page elements to load
        await page.waitForSelector('#incomeChart');
        await page.waitForSelector('#expensesChart');

        // Act: navigate to transactions page
        await page.click('#transactionsPage');
        await page.waitForURL('/transactions');

        // Assert: check navigation correctness and menu highlight
        await expect(page.locator('#transactionsPage')).toHaveClass(/bg-primary/);
    });

    test('categories dropdown navigation', async ({ page }) => {
        // Act: open dropdown and navigate to incomes
        await page.click('#dropdownMenuButton1');
        await page.click('#revenuesPage');
        await page.waitForURL('/incomes');

        // Assert: check menu highlight for incomes
        await expect(page.locator('#dropdownMenuButton1')).toHaveClass(/btn-primary/);
        await expect(page.locator('#revenuesPage')).toHaveClass(/bg-primary/);

        // Act: open dropdown and navigate to expenses
        await page.click('#dropdownMenuButton1');
        await page.click('#costsPage');
        await page.waitForURL('/costs');

        // Assert: check menu highlight for expenses
        await expect(page.locator('#dropdownMenuButton1')).toHaveClass(/btn-primary/);
        await expect(page.locator('#costsPage')).toHaveClass(/bg-primary/);
    });

    test('unauthorized access protection', async ({ page }) => {
        // Arrange: list of protected routes
        const privateRoutes = ['/', '/transactions', '/costs', '/incomes'];

        // Act: logout from system
        await page.click('button[data-bs-target="#userModal"]');
        await page.click('#logout');

        // Assert: check redirect to login
        await page.waitForURL('/login');

        // Act & Assert: check each protected route
        for (const route of privateRoutes) {
            // Act: try to navigate to protected route
            await page.goto(route);
            // Assert: check redirect to login page
            await page.waitForURL('/login');
        }
    });

    test('logout flow through modal', async ({ page }) => {
        // Arrange: open modal window
        await page.click('button[data-bs-target="#userModal"]');

        // Assert: check modal window display
        await expect(page.locator('#userModal')).toBeVisible();

        // Act: perform logout
        await page.click('#logout');
        await page.waitForURL('/login');

        // Assert: check logout result
        await expect(page.locator('#navbar')).not.toBeVisible();
    });

    test('navigation to main page through logo', async ({ page }) => {
        // Arrange: first navigate to another page
        await page.click('#transactionsPage');
        await page.waitForURL('/transactions');

        // Act: click on logo
        await page.click('.logo-link');
        await page.waitForURL('/');

        // Assert: check that we are on main page
        await expect(page.locator('#mainPage')).toHaveClass(/bg-primary/);
        await expect(page.locator('#incomeChart')).toBeVisible();
        await expect(page.locator('#expensesChart')).toBeVisible();
    });

    test('navigation to main page through main button', async ({ page }) => {
        // Arrange: first navigate to another page
        await page.click('#transactionsPage');
        await page.waitForURL('/transactions');

        // Act: click on main button
        await page.click('#mainPage');
        await page.waitForURL('/');

        // Assert: check that we are on main page
        await expect(page.locator('#mainPage')).toHaveClass(/bg-primary/);
        await expect(page.locator('#incomeChart')).toBeVisible();
        await expect(page.locator('#expensesChart')).toBeVisible();
    });
});
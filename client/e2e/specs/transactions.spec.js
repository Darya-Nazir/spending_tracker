import { expect } from '@playwright/test';

import { test } from './auth.setup.js';
import { setupLoginApiMocks, setupCategoryMocks } from '../fixtures/api-mocks.js';
import { mockCategories } from '../fixtures/test-data.js';
import { createTestUser } from '../fixtures/users.js';

test.describe('Transaction list', () => {
    // Arrange - Global test data
    const mockTransactions = [
        {
            id: 1,
            number: 1,
            type: 'income',
            category: 'зарплата',
            amount: 500,
            date: '2024-02-07T00:00:00',
            comment: 'Зарплата за январь',
            category_id: 1
        },
        {
            id: 2,
            number: 2,
            type: 'expense',
            category: 'жильё',
            amount: 2500,
            date: '2024-02-08T00:00:00',
            comment: 'Аренда',
            category_id: 2
        }
    ];

    // Arrange - Common setup for all tests
    test.beforeEach(async ({ page }) => {
        // Arrange - Create test user and setup mocks
        const user = createTestUser();
        await setupLoginApiMocks(page, user);
        await setupCategoryMocks(page, mockCategories);

        // Arrange - Setup API route mock
        await page.route('**/api/operations?period=all&type=income', route =>
            route.fulfill({
                status: 200,
                body: JSON.stringify(mockTransactions)
            })
        );

        // Act - Login and navigate to transactions page
        await page.goto('/login');
        await page.fill('#email', user.email);
        await page.fill('#password', user.password);
        await page.click('button[type="submit"]');
        await page.waitForURL('/');

        await page.goto('/transactions');
        await page.waitForLoadState('networkidle');
    });

    test('displays transaction list correctly', async ({ page }) => {
        // Assert - Check table visibility and row count
        await expect(page.locator('#transactionsTable')).toBeVisible();
        const rows = await page.locator('tbody tr').all();
        expect(rows.length).toBe(mockTransactions.length);

        // Assert - Verify first row content
        const firstRow = page.locator('tbody tr').first();
        await expect(firstRow.locator('td').nth(0)).toHaveText('1');
        await expect(firstRow.locator('td').nth(1)).toHaveText('доход');
        await expect(firstRow.locator('td').nth(2)).toHaveText('зарплата');
        await expect(firstRow.locator('td').nth(3)).toHaveText('500$');
    });

    test('displays the control elements', async ({ page }) => {
        // Arrange
        const expectedFilters = ['Сегодня', 'Неделя', 'Месяц', 'Год', 'Все', 'Интервал'];

        // Assert - Check buttons visibility
        await expect(page.locator('#createIncome')).toBeVisible();
        await expect(page.locator('#createExpense')).toBeVisible();

        // Assert - Check filter buttons
        for (const filter of expectedFilters) {
            await expect(page.getByRole('button', { name: filter, exact: true })).toBeVisible();
        }

        // Assert - Check date range labels
        await expect(page.getByText('с', { exact: true })).toBeVisible();
        await expect(page.getByText('по', { exact: true })).toBeVisible();
    });

    test('filters transactions for today', async ({ page }) => {
        // Arrange - Setup mock for today's filter
        await page.route('**/api/operations?period=today', route =>
            route.fulfill({
                status: 200,
                body: JSON.stringify([mockTransactions[0]])
            })
        );

        // Act - Click today filter
        await page.getByRole('button', { name: 'Сегодня', exact: true }).click();
        await page.waitForResponse(res => res.url().includes('period=today'));

        // Assert - Check filtered results
        const rows = await page.locator('tbody tr').all();
        expect(rows.length).toBe(1);
        await expect(page.locator('tbody tr').first()).toContainText('зарплата');
    });

    test('filters transactions for week', async ({ page }) => {
        // Arrange - Setup mock for week filter
        await page.route('**/api/operations?period=week', route =>
            route.fulfill({
                status: 200,
                body: JSON.stringify(mockTransactions)
            })
        );

        // Act - Click week filter
        await page.getByRole('button', { name: 'Неделя', exact: true }).click();
        await page.waitForResponse(res => res.url().includes('period=week'));

        // Assert - Check filtered results
        const rows = await page.locator('tbody tr').all();
        expect(rows.length).toBe(2);
    });

    test('filters transactions for month', async ({ page }) => {
        // Arrange - Setup mock for month filter
        await page.route('**/api/operations?period=month', route =>
            route.fulfill({
                status: 200,
                body: JSON.stringify([mockTransactions[0]])
            })
        );

        // Act - Click month filter
        await page.getByRole('button', { name: 'Месяц', exact: true }).click();
        await page.waitForResponse(res => res.url().includes('period=month'));

        // Assert - Check filtered results
        const rows = await page.locator('tbody tr').all();
        expect(rows.length).toBe(1);
    });

    test('filters transactions for year', async ({ page }) => {
        // Arrange - Setup mock for year filter
        await page.route('**/api/operations?period=year', route =>
            route.fulfill({
                status: 200,
                body: JSON.stringify(mockTransactions)
            })
        );

        // Act - Click year filter
        await page.getByRole('button', { name: 'Год', exact: true }).click();
        await page.waitForResponse(res => res.url().includes('period=year'));

        // Assert - Check filtered results
        const rows = await page.locator('tbody tr').all();
        expect(rows.length).toBe(2);
    });

    test('shows all transactions', async ({ page }) => {
        // Arrange - Setup mock for all transactions
        await page.route('**/api/operations?period=all', route =>
            route.fulfill({
                status: 200,
                body: JSON.stringify(mockTransactions)
            })
        );

        // Act - Click 'All' filter
        await Promise.all([
            page.waitForResponse(res => res.url().includes('period=all')),
            page.getByRole('button', { name: 'Все', exact: true }).click()
        ]);

        // Assert - Check results
        const rows = await page.locator('tbody tr').all();
        expect(rows.length).toBe(2);
    });

    test('filters transactions by date interval', async ({ page }) => {
        // Arrange - Setup mock for interval filter
        await page.route('**/api/operations?period=interval*', route =>
            route.fulfill({
                status: 200,
                body: JSON.stringify(mockTransactions)
            })
        );

        // Act - Initial interval setting (both dates are required)
        await page.getByRole('button', { name: 'Интервал', exact: true }).click();

        // Enter the first date - filtering should not work yet
        await page.locator('[data-range="from"]').fill('01.01.2025');
        await page.locator('[data-range="from"]').press('Enter');

        // Enter the second date - filtering should now occur
        const firstFilterPromise = page.waitForResponse(res => res.url().includes('period=interval'));
        await page.locator('[data-range="to"]').fill('28.02.2025');
        await page.locator('[data-range="to"]').press('Enter');
        await firstFilterPromise;

        // Assert after first filtration
        let rows = await page.locator('tbody tr').all();
        expect(rows.length).toBe(2);

        // Act - Change only the start date - the filter should work at once
        const secondFilterPromise = page.waitForResponse(res => res.url().includes('period=interval'));
        await page.locator('[data-range="from"]').fill('15.01.2025');
        await page.locator('[data-range="from"]').press('Enter');
        await secondFilterPromise;

        // Assert after second filtration
        rows = await page.locator('tbody tr').all();
        expect(rows.length).toBe(2);
    });

    test('successfully deletes transaction', async ({ page }) => {
        // Arrange - Setup mock for deletion
        await page.route('**/api/operations/1', route =>
            route.fulfill({ status: 200 })
        );

        // Act - Trigger deletion
        await page.locator('i.bi-trash').first().click();
        await expect(page.locator('#deleteCategoryModal')).toBeVisible();
        await page.locator('#confirmDeleteBtn').click();

        // Assert - Check modal closed and row deleted
        await expect(page.locator('#deleteCategoryModal')).not.toBeVisible();
        const rows = await page.locator('tbody tr').all();
        expect(rows.length).toBe(1);
    });

    test('cancel transaction deletion', async ({ page }) => {
        // Act - Open delete modal and cancel
        await page.locator('i.bi-trash').first().click();
        await expect(page.locator('#deleteCategoryModal')).toBeVisible();
        await page.getByRole('button', { name: 'Не удалять' }).click();

        // Assert - Check modal closed and no rows deleted
        await expect(page.locator('#deleteCategoryModal')).not.toBeVisible();
        const rows = await page.locator('tbody tr').all();
        expect(rows.length).toBe(2);
    });
});
import { expect } from '@playwright/test';

import { test } from './auth.setup.js';
import { setupCommonMocks, setupCategoryMocks } from '../fixtures/api-mocks.js';
import { mockCategories } from '../fixtures/test-data.js';
import { createTestUser } from '../fixtures/users.js';

test.describe('Список транзакций', () => {
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

    test.beforeEach(async ({ page }) => {
        const user = createTestUser();
        await setupCommonMocks(page, user);
        await setupCategoryMocks(page, mockCategories);

        // Базовый мок для всех операций
        await page.route('**/api/operations?period=all&type=income', route =>
            route.fulfill({
                status: 200,
                body: JSON.stringify(mockTransactions)
            })
        );

        await page.goto('/login');
        await page.fill('#email', user.email);
        await page.fill('#password', user.password);
        await page.click('button[type="submit"]');
        await page.waitForURL('/');

        await page.goto('/transactions');
        await page.waitForLoadState('networkidle');
    });

    test('отображает список транзакций корректно', async ({ page }) => {
        await expect(page.locator('#transactionsTable')).toBeVisible();
        const rows = await page.locator('tbody tr').all();
        expect(rows.length).toBe(mockTransactions.length);

        const firstRow = page.locator('tbody tr').first();
        await expect(firstRow.locator('td').nth(0)).toHaveText('1');
        await expect(firstRow.locator('td').nth(1)).toHaveText('доход');
        await expect(firstRow.locator('td').nth(2)).toHaveText('зарплата');
        await expect(firstRow.locator('td').nth(3)).toHaveText('500$');
    });

    test('отображает элементы управления', async ({ page }) => {
        await expect(page.locator('#createIncome')).toBeVisible();
        await expect(page.locator('#createExpense')).toBeVisible();

        const filterButtons = page.locator('.filter-button');
        const expectedFilters = ['Сегодня', 'Неделя', 'Месяц', 'Год', 'Все', 'Интервал'];

        for (const filter of expectedFilters) {
            await expect(page.getByRole('button', { name: filter, exact: true })).toBeVisible();
        }

        await expect(page.getByText('с', { exact: true })).toBeVisible();
        await expect(page.getByText('по', { exact: true })).toBeVisible();
    });

    test('фильтрует транзакции за сегодня', async ({ page }) => {
        await page.route('**/api/operations?period=today', route =>
            route.fulfill({
                status: 200,
                body: JSON.stringify([mockTransactions[0]])
            })
        );

        await page.getByRole('button', { name: 'Сегодня', exact: true }).click();
        await page.waitForResponse(res => res.url().includes('period=today'));

        const rows = await page.locator('tbody tr').all();
        expect(rows.length).toBe(1);
        await expect(page.locator('tbody tr').first()).toContainText('зарплата');
    });

    test('фильтрует транзакции за неделю', async ({ page }) => {
        await page.route('**/api/operations?period=week', route =>
            route.fulfill({
                status: 200,
                body: JSON.stringify(mockTransactions)
            })
        );

        await page.getByRole('button', { name: 'Неделя', exact: true }).click();
        await page.waitForResponse(res => res.url().includes('period=week'));

        const rows = await page.locator('tbody tr').all();
        expect(rows.length).toBe(2);
    });

    test('фильтрует транзакции за месяц', async ({ page }) => {
        await page.route('**/api/operations?period=month', route =>
            route.fulfill({
                status: 200,
                body: JSON.stringify([mockTransactions[0]])
            })
        );

        await page.getByRole('button', { name: 'Месяц', exact: true }).click();
        await page.waitForResponse(res => res.url().includes('period=month'));

        const rows = await page.locator('tbody tr').all();
        expect(rows.length).toBe(1);
    });

    test('фильтрует транзакции за год', async ({ page }) => {
        await page.route('**/api/operations?period=year', route =>
            route.fulfill({
                status: 200,
                body: JSON.stringify(mockTransactions)
            })
        );

        await page.getByRole('button', { name: 'Год', exact: true }).click();
        await page.waitForResponse(res => res.url().includes('period=year'));

        const rows = await page.locator('tbody tr').all();
        expect(rows.length).toBe(2);
    });

    test('показывает все транзакции', async ({ page }) => {
        // Меняем route на period=all без type=income
        await page.route('**/api/operations?period=all', route =>
            route.fulfill({
                status: 200,
                body: JSON.stringify(mockTransactions)
            })
        );

        await page.getByRole('button', { name: 'Все', exact: true }).click();
        await page.waitForResponse(res => res.url().includes('period=all'));
        await page.waitForTimeout(200);

        const rows = await page.locator('tbody tr').all();
        expect(rows.length).toBe(2);
    });

    test('фильтрует транзакции по интервалу дат', async ({ page }) => {
        await page.route('**/api/operations?period=interval*', route =>
            route.fulfill({
                status: 200,
                body: JSON.stringify(mockTransactions)
            })
        );

        await page.getByRole('button', { name: 'Интервал', exact: true }).click();

        // Первичный ввод дат
        await page.locator('[data-range="from"]').fill('01.01.2025');
        await page.locator('[data-range="from"]').press('Enter');
        await page.locator('[data-range="to"]').fill('28.02.2025');
        await page.locator('[data-range="to"]').press('Enter');

        await page.waitForTimeout(500);
        let rows = await page.locator('tbody tr').all();
        expect(rows.length).toBe(2);

        // Изменение только одной даты
        await page.locator('[data-range="from"]').fill('15.01.2025');
        await page.locator('[data-range="from"]').press('Enter');

        await page.waitForTimeout(500);
        rows = await page.locator('tbody tr').all();
        expect(rows.length).toBe(2);
    });

    test('успешно удаляет транзакцию', async ({ page }) => {
        await page.route('**/api/operations/1', route =>
            route.fulfill({ status: 200 })
        );

        await page.locator('i.bi-trash').first().click();
        await expect(page.locator('#deleteCategoryModal')).toBeVisible();

        await page.locator('#confirmDeleteBtn').click();
        await expect(page.locator('#deleteCategoryModal')).not.toBeVisible();

        const rows = await page.locator('tbody tr').all();
        expect(rows.length).toBe(1);
    });

    test('отменяет удаление транзакции', async ({ page }) => {
        await page.locator('i.bi-trash').first().click();
        await expect(page.locator('#deleteCategoryModal')).toBeVisible();

        await page.getByRole('button', { name: 'Не удалять' }).click();
        await expect(page.locator('#deleteCategoryModal')).not.toBeVisible();

        const rows = await page.locator('tbody tr').all();
        expect(rows.length).toBe(2);
    });
});
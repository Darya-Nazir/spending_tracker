import { expect } from '@playwright/test';

import { test } from './auth.setup.js';
import { mockCategories, mockTokens } from '../fixtures/test-data.js';
import { createTestUser } from '../fixtures/users.js';

test.describe('Analytics charts', () => {
    test.beforeEach(async ({ page }) => {
        const user = createTestUser();
        await setupAuthAndDefaultApiMocks(page, user);
        await setupCategoryMocks(page, mockCategories);

        await page.goto('/');
        await page.fill('#email', user.email);
        await page.fill('#password', user.password);
        await page.click('button[type="submit"]');
        await page.waitForURL('/');
    });

    test('renders both income and expense charts', async ({ page }) => {
        // Arrange
        await mockOperationsAPI(page, 'all', mockedTransactions.multiple);

        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForFunction(() => typeof Chart !== 'undefined');

        // Act
        const titles = await page.locator('.card-title').allTextContents();
        expect(titles).toContain('Доходы');
        expect(titles).toContain('Расходы');

        // Assert
        await expect(page.locator('canvas#incomeChart')).toBeVisible();
        await expect(page.locator('canvas#expensesChart')).toBeVisible();
    });

    test('single transaction fills chart with one color', async ({ page }) => {
        // Arrange
        await mockOperationsAPI(page, 'all', mockedTransactions.single);

        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForFunction(() => typeof Chart !== 'undefined');

        // Act
        const incomeCanvas = page.locator('canvas#incomeChart');
        await expect(incomeCanvas).toBeVisible();

        const hasContent = await page.evaluate(() => {
            const canvas = document.querySelector('canvas#incomeChart');
            return canvas !== null && canvas.width > 0 && canvas.height > 0;
        });

        // Assert
        expect(hasContent).toBeTruthy();
    });

    test('multiple transactions show different colors in charts', async ({ page }) => {
        // Arrange
        await mockOperationsAPI(page, 'all', mockedTransactions.multiple);

        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForFunction(() => typeof Chart !== 'undefined');

        await expect(page.locator('canvas#incomeChart')).toBeVisible();
        await expect(page.locator('canvas#expensesChart')).toBeVisible();

        // Act
        const colorResults = await page.evaluate((expectedColors) => {
            const incomeChart = Chart.getChart('incomeChart');
            const expensesChart = Chart.getChart('expensesChart');

            const incomeColors = incomeChart.data.datasets[0].backgroundColor;
            const expensesColors = expensesChart.data.datasets[0].backgroundColor;

            return {
                validColors: [...incomeColors, ...expensesColors]
                    .every(color => expectedColors.includes(color)),

                hasMultipleIncomeColors: new Set(incomeColors).size > 1,
                hasMultipleExpenseColors: new Set(expensesColors).size > 1,

                // Проверяем порядок цветов
                colorsInCorrectOrder: incomeColors.every((color, index) =>
                    color === expectedColors[index % expectedColors.length]
                )
            };
        }, TEST_CHART_COLORS);

        // Assert
        expect(colorResults.validColors).toBeTruthy();
        expect(colorResults.hasMultipleIncomeColors).toBeTruthy();
        expect(colorResults.hasMultipleExpenseColors).toBeTruthy();
        expect(colorResults.colorsInCorrectOrder).toBeTruthy();
    });

    test('charts update when filter period changes', async ({ page }) => {
        // Arrange
        await mockOperationsAPI(page, 'all', mockedTransactions.multiple);
        await mockOperationsAPI(page, 'today', mockedTransactions.today);

        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForFunction(() => typeof Chart !== 'undefined');

        await expect(page.locator('canvas#incomeChart')).toBeVisible();
        await expect(page.locator('canvas#expensesChart')).toBeVisible();

        await page.getByRole('button', { name: 'Сегодня', exact: true }).click();

        await page.waitForResponse(res => res.url().includes('period=today'));
        await page.waitForLoadState('networkidle');

        await expect(page.locator('canvas#incomeChart')).toBeVisible();
        await expect(page.locator('canvas#expensesChart')).toBeVisible();

        // Act
        const canvasesValid = await page.evaluate(() => {
            const incomeCanvas = document.querySelector('canvas#incomeChart');
            const expensesCanvas = document.querySelector('canvas#expensesChart');
            return incomeCanvas !== null &&
                expensesCanvas !== null &&
                incomeCanvas.width > 0 &&
                expensesCanvas.width > 0;
        });

        // Assert
        expect(canvasesValid).toBeTruthy();
    });
});


const tokens = mockTokens;

const setupAuthAndDefaultApiMocks = async (page, user) => {
    await page.route('**/api/**', route => {
        const url = route.request().url();

        if (url.includes('/api/login')) {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    tokens: tokens,
                    user: { id: 1, name: user.fullName }
                })
            });
        }

        return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([])
        });
    });
};

const setupCategoryMocks = async (page, categories) => {
    await page.route('**/api/categories/**', route => {
        const url = route.request().url();
        const method = route.request().method();

        if (url.includes('/income') && method === 'GET') {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(categories.income)
            });
        }

        if (url.includes('/expense') && method === 'GET') {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(categories.expense)
            });
        }
    });
};

const TEST_CHART_COLORS = [
    '#dc3545', // red
    '#fd7e14', // orange
    '#ffc107', // yellow
    '#198754', // green
    '#0d6efd', // blue
    '#6610f2', // indigo
    '#6f42c1', // purple
    '#d63384', // pink
    '#20c997', // teal
    '#0dcaf0'  // cyan
];

const mockedTransactions = {
    // Arrange
    single: [{
        id: 1,
        type: 'income',
        category: 'зарплата',
        amount: 1000,
        date: '2024-02-07T00:00:00',
        category_id: 1
    }],
    multiple: [
        {
            id: 1,
            type: 'income',
            category: 'зарплата',
            amount: 1000,
            date: '2024-02-07T00:00:00',
            category_id: 1
        },
        {
            id: 2,
            type: 'income',
            category: 'инвестиции',
            amount: 500,
            date: '2024-02-07T00:00:00',
            category_id: 2
        },
        {
            id: 3,
            type: 'expense',
            category: 'продукты',
            amount: 300,
            date: '2024-02-07T00:00:00',
            category_id: 3
        },
        {
            id: 4,
            type: 'expense',
            category: 'транспорт',
            amount: 200,
            date: '2024-02-07T00:00:00',
            category_id: 4
        }
    ],
    today: [
        {
            id: 1,
            type: 'income',
            category: 'зарплата',
            amount: 1000,
            date: '2024-02-07T00:00:00',
            category_id: 1
        },
        {
            id: 2,
            type: 'income',
            category: 'инвестиции',
            amount: 500,
            date: '2024-02-07T00:00:00',
            category_id: 2
        }
    ]
};

const mockOperationsAPI = async (page, period, data) => {
    await page.route(`**/api/operations?period=${period}`, route =>
        route.fulfill({
            status: 200,
            body: JSON.stringify(data)
        })
    );
};


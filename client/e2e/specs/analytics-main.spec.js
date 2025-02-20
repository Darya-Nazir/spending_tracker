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
        const allTransactions = mockedTransactions.multiple;
        const todayTransactions = mockedTransactions.today;

        await mockOperationsAPI(page, 'all', allTransactions);
        await mockOperationsAPI(page, 'today', todayTransactions);

        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForFunction(() => typeof Chart !== 'undefined');

        const initialChartData = await page.evaluate(() => {
            const incomeChart = Chart.getChart('incomeChart');
            const expensesChart = Chart.getChart('expensesChart');

            return {
                income: {
                    labels: incomeChart.data.labels,
                    data: incomeChart.data.datasets[0].data,
                    colors: incomeChart.data.datasets[0].backgroundColor
                },
                expenses: {
                    labels: expensesChart.data.labels,
                    data: expensesChart.data.datasets[0].data,
                    colors: expensesChart.data.datasets[0].backgroundColor
                }
            };
        });

        expect(initialChartData.income).toEqual({
            labels: ['зарплата', 'инвестиции'],
            data: [1000, 500],
            colors: [TEST_CHART_COLORS[0], TEST_CHART_COLORS[1]] // Первые два цвета из палитры
        });

        expect(initialChartData.expenses).toEqual({
            labels: ['продукты', 'транспорт'],
            data: [300, 200],
            colors: [TEST_CHART_COLORS[0], TEST_CHART_COLORS[1]]
        });

        await page.getByRole('button', { name: 'Сегодня', exact: true }).click();
        await page.waitForResponse(res => res.url().includes('period=today'));
        await page.waitForLoadState('networkidle');

        const updatedChartData = await page.evaluate(() => {
            const incomeChart = Chart.getChart('incomeChart');
            const expensesChart = Chart.getChart('expensesChart');

            return {
                income: {
                    labels: incomeChart.data.labels,
                    data: incomeChart.data.datasets[0].data,
                    colors: incomeChart.data.datasets[0].backgroundColor
                },
                expenses: {
                    labels: expensesChart.data.labels,
                    data: expensesChart.data.datasets[0].data,
                    colors: expensesChart.data.datasets[0].backgroundColor
                }
            };
        });
        // Assert
        expect(updatedChartData).not.toEqual(initialChartData);

        const todayIncomeData = todayTransactions.reduce((acc, tr) => {
            if (tr.type === 'income') {
                acc.labels.push(tr.category);
                acc.data.push(tr.amount);
                acc.colors.push(TEST_CHART_COLORS[acc.labels.length - 1]);
            }
            return acc;
        }, { labels: [], data: [], colors: [] });

        expect(updatedChartData.income).toEqual({
            labels: todayIncomeData.labels,
            data: todayIncomeData.data,
            colors: todayIncomeData.colors
        });

        // Check expenses (they are not in the period “today”)
        expect(updatedChartData.expenses).toEqual({
            labels: [],
            data: [],
            colors: []
        });

        if (updatedChartData.income.labels.length > 0) {
            updatedChartData.income.labels.forEach((label, index) => {
                const initialIndex = initialChartData.income.labels.indexOf(label);
                if (initialIndex !== -1) {
                    expect(updatedChartData.income.colors[index]).toBe(initialChartData.income.colors[initialIndex]);
                }
            });
        }
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


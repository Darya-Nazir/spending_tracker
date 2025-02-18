import { expect } from '@playwright/test';

import { test } from './auth.setup.js';
import { mockTokens } from "../fixtures/test-data.js";
import { createTestUser } from '../fixtures/users.js';

test.describe('Transaction editing', () => {
    const validUser = createTestUser();
    const expectedTransaction = {
        id: 8,
        type: 'expense',
        category: 'Жильё',
        amount: 789,
        date: '2025-02-13',
        comment: 'hehe',
        category_id: 1
    };

    test.beforeEach(async ({ page }) => {
        // Arrange: Setup API mocks and authentication
        await page.route('**/api/**', route => {
            const url = route.request().url();
            const method = route.request().method();

            if (url.includes('/api/login')) {
                return route.fulfill({
                    status: 200,
                    body: JSON.stringify({
                        tokens: mockTokens,
                        user: { id: 1, name: validUser.fullName }
                    })
                });
            }

            if (url.includes('/api/categories/expense')) {
                return route.fulfill({
                    status: 200,
                    body: JSON.stringify([
                        { id: 1, title: 'Жильё' },
                        { id: 2, title: 'Еда' },
                        { id: 3, title: 'Транспорт' }
                    ])
                });
            }

            if (url.includes(`/api/operations/${expectedTransaction.id}`)) {
                if (method === 'GET') {
                    return route.fulfill({
                        status: 200,
                        body: JSON.stringify(expectedTransaction)
                    });
                }
            }
        });

        // Act: Perform login
        await page.goto('/');
        await page.fill('#email', validUser.email);
        await page.fill('#password', validUser.password);
        await page.click('button[type="submit"]');
    });

    test('transaction data loading', async ({ page }) => {
        // Arrange: Navigate to edit transaction page
        await page.goto(`/edit-transaction?id=${expectedTransaction.id}`);

        await page.waitForSelector('.edit-transaction-form');

        const typeMapping = {
            'expense': 'Расход',
            'income': 'Доход'
        };

        const formatDate = (dateString) => {
            const [year, month, day] = dateString.split('-');
            return `${day}.${month}.${year}`;
        };

        // Assert: Verify all transaction fields are loaded correctly
        await expect(page.locator('input[name="type"]')).toHaveValue(typeMapping[expectedTransaction.type]);
        await expect(page.locator('input[name="category"]')).toHaveValue(expectedTransaction.category);
        await expect(page.locator('input[name="amount"]')).toHaveValue(expectedTransaction.amount.toString());
        await expect(page.locator('input[name="date"]')).toHaveValue(formatDate(expectedTransaction.date));
        await expect(page.locator('input[name="comment"]')).toHaveValue(expectedTransaction.comment);
    });

    test('should correctly load and display transaction data', async ({ page }) => {
        // Arrange: Setup API routes
        await page.route(`**/api/operations/${expectedTransaction.id}`, route => {
            if (route.request().method() === 'GET') {
                return route.fulfill({
                    status: 200,
                    body: JSON.stringify(expectedTransaction)
                });
            }
        });

        await page.route('**/api/categories/expense', route => {
            return route.fulfill({
                status: 200,
                body: JSON.stringify([
                    { id: 1, title: 'Жильё' },
                    { id: 2, title: 'Еда' },
                    { id: 3, title: 'Транспорт' }
                ])
            });
        });

        // Act: Navigate to edit page
        await page.goto(`/edit-transaction?id=${expectedTransaction.id}`);
        await page.waitForSelector('.edit-transaction-form');

        // Assert: Verify initial form state
        await expect(page.locator('input[name="type"]')).toHaveValue('Расход');
        await expect(page.locator('input[name="category"]')).toHaveValue('Жильё');
        await expect(page.locator('input[name="amount"]')).toHaveValue(expectedTransaction.amount.toString());
        await expect(page.locator('input[name="comment"]')).toHaveValue(expectedTransaction.comment);
    });

    test('should successfully update transaction with new data', async ({ page }) => {
        // Arrange: Setup API routes and capture PUT request data
        let capturedPutRequest = null;

        await page.route(`**/api/operations/${expectedTransaction.id}`, async route => {
            if (route.request().method() === 'PUT') {
                capturedPutRequest = await route.request().postData();
                return route.fulfill({
                    status: 200,
                    body: JSON.stringify({ success: true })
                });
            }
            if (route.request().method() === 'GET') {
                return route.fulfill({
                    status: 200,
                    body: JSON.stringify(expectedTransaction)
                });
            }
        });

        await page.route('**/api/categories/expense', route => {
            return route.fulfill({
                status: 200,
                body: JSON.stringify([
                    { id: 1, title: 'Жильё' },
                    { id: 2, title: 'Еда' },
                    { id: 3, title: 'Транспорт' }
                ])
            });
        });

        // Act: Navigate and modify transaction
        await page.goto(`/edit-transaction?id=${expectedTransaction.id}`);
        await page.waitForSelector('.edit-transaction-form');

        // Modify transaction fields
        await page.click('#categoryInput');
        await page.waitForSelector('.categories-list li');
        await page.click('.categories-list button:has-text("Еда")');
        await expect(page.locator('input[name="category"]')).toHaveValue('Еда');

        const newAmount = '1000';
        const newComment = 'Обновленный комментарий';
        await page.fill('input[name="amount"]', newAmount);
        await page.fill('input[name="comment"]', newComment);

        // Submit form and wait for navigation
        await Promise.all([
            page.waitForURL('/transactions'),
            page.click('#create')
        ]);

        // Assert: Verify the PUT request data
        const putRequestData = JSON.parse(capturedPutRequest);
        expect(putRequestData).toMatchObject({
            type: 'expense',
            amount: 1000,
            category_id: 2,
            comment: newComment
        });
        expect(putRequestData.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('validation of empty amount field', async ({ page }) => {
        // Arrange: Setup dialog handler and navigate to edit page
        let dialogShown = false;
        page.on('dialog', async dialog => {
            dialogShown = true;
            expect(dialog.message()).toBe('Введите корректную сумму');
            await dialog.accept();
        });
        await page.goto(`/edit-transaction?id=${expectedTransaction.id}`);

        // Act: Submit form with empty amount
        await page.fill('input[name="amount"]', '');
        await page.click('button[type="submit"]');

        // Assert: Verify validation dialog was shown
        expect(dialogShown).toBeTruthy();
    });

    test('invalid amount validation', async ({ page }) => {
        // Arrange: Setup test cases
        const testCases = ['abc', '-100', '0'];
        await page.goto(`/edit-transaction?id=${expectedTransaction.id}`);

        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Введите корректную сумму');
            await dialog.accept();
        });

        for (const testCase of testCases) {
            await page.fill('input[name="amount"]', ''); // Очистка перед вводом
            await page.fill('input[name="amount"]', testCase);

            // Act: Ожидание появления диалога перед кликом
            const dialogPromise = page.waitForEvent('dialog');
            await page.click('button[type="submit"]');
            await dialogPromise;
        }
    });

    test('cancel editing', async ({ page }) => {
        // Arrange: Navigate to edit page
        await page.goto(`/edit-transaction?id=${expectedTransaction.id}`);

        // Act & Assert: Click cancel and verify redirect
        await Promise.all([
            page.waitForURL('/transactions'),
            page.click('#cancel')
        ]);
    });

    test('server error handling', async ({ page }) => {
        // Arrange: Setup error dialog handler and failed API response
        let dialogShown = false;
        page.on('dialog', async dialog => {
            dialogShown = true;
            expect(dialog.message()).toBe('Не удалось загрузить данные транзакции!');
            await dialog.accept();
        });

        await page.route(`**/api/operations/${expectedTransaction.id}`, route => {
            if (route.request().method() === 'PUT') {
                return route.fulfill({
                    status: 500,
                    body: JSON.stringify({ message: 'Internal server error' })
                });
            }
        });

        // Act: Attempt to save transaction
        await page.goto(`/edit-transaction?id=${expectedTransaction.id}`);
        await page.fill('input[name="amount"]', '1000');
        await page.click('button[type="submit"]');

        // Assert: Verify error dialog was shown
        expect(dialogShown).toBeTruthy();
    });

    test('handling invalid transaction ID', async ({ page }) => {
        // Arrange: Setup error dialog handler and 404 API response
        let dialogShown = false;
        page.on('dialog', async dialog => {
            dialogShown = true;
            expect(dialog.message()).toBe('Не удалось загрузить данные транзакции!');
            await dialog.accept();
        });

        await page.route('**/api/operations/999', route => {
            if (route.request().method() === 'GET') {
                return route.fulfill({
                    status: 404,
                    body: JSON.stringify({ message: 'Transaction not found' })
                });
            }
        });

        // Act: Navigate to invalid transaction
        await page.goto('/edit-transaction?id=999');

        // Assert: Verify error handling and redirect
        await page.waitForURL('/transactions');
        expect(dialogShown).toBeTruthy();
    });
});
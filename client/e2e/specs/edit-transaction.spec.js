import { expect } from '@playwright/test';

import { test } from './auth.setup.js';
import { mockTokens } from "../fixtures/test-data.js";
import { createTestUser } from '../fixtures/users.js';

test.describe('Редактирование транзакции', () => {
    const validUser = createTestUser();
    const mockTransaction = {
        id: 8,
        type: 'expense',
        category: 'Жильё',
        amount: 789,
        date: '2025-02-13',
        comment: 'bbjlggu',
        category_id: 1
    };

    test.beforeEach(async ({ page }) => {
        // Mock API responses
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

            if (url.includes(`/api/operations/${mockTransaction.id}`)) {
                if (method === 'GET') {
                    return route.fulfill({
                        status: 200,
                        body: JSON.stringify(mockTransaction)
                    });
                }
            }
        });

        // Login flow
        await page.goto('/');
        await page.fill('#email', validUser.email);
        await page.fill('#password', validUser.password);
        await page.click('button[type="submit"]');
    });

    test('загрузка данных транзакции', async ({ page }) => {
        await page.goto(`/edit-transaction?id=${mockTransaction.id}`);

        await expect(page.locator('input[name="type"]')).toHaveValue('Расход');
        await expect(page.locator('input[name="category"]')).toHaveValue('Жильё');
        await expect(page.locator('input[name="amount"]')).toHaveValue('789');
        await expect(page.locator('input[name="date"]')).toHaveValue('13.02.2025');
        await expect(page.locator('input[name="comment"]')).toHaveValue('bbjlggu');
    });

    test('successful transaction editing', async ({ page }) => {
        // Мок ответа для PUT запроса
        await page.route(`**/api/operations/${mockTransaction.id}`, route => {
            if (route.request().method() === 'PUT') {
                return route.fulfill({
                    status: 200,
                    body: JSON.stringify({ success: true })
                });
            }

            // GET запрос для получения данных транзакции
            if (route.request().method() === 'GET') {
                return route.fulfill({
                    status: 200,
                    body: JSON.stringify(mockTransaction)
                });
            }
        });

        // Мок для получения категорий
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

        await page.goto(`/edit-transaction?id=${mockTransaction.id}`);
        await page.waitForSelector('.edit-transaction-form');

        // Кликаем по инпуту категории
        await page.click('#categoryInput');

        // Ждем появления списка после загрузки категорий
        await page.waitForSelector('.categories-list li');

        // Выбираем категорию "Еда"
        await page.click('.categories-list button:has-text("Еда")');

        // Обновляем остальные поля
        await page.fill('input[name="amount"]', '1000');
        await page.fill('input[name="comment"]', 'Обновленный комментарий');

        // Отправляем форму
        await Promise.all([
            page.waitForURL('/transactions'),
            page.click('#create')
        ]);
    });

    test('валидация пустого поля суммы', async ({ page }) => {
        let dialogShown = false;
        page.on('dialog', async dialog => {
            dialogShown = true;
            expect(dialog.message()).toBe('Введите корректную сумму');
            await dialog.accept();
        });

        await page.goto(`/edit-transaction?id=${mockTransaction.id}`);
        await page.fill('input[name="amount"]', '');
        await page.click('button[type="submit"]');

        expect(dialogShown).toBeTruthy();
    });

    test('валидация некорректной суммы', async ({ page }) => {
        const testCases = ['abc', '-100', '0'];
        let dialogCount = 0;

        // Обработчик диалогов
        page.on('dialog', async dialog => {
            dialogCount++;
            expect(dialog.message()).toBe('Введите корректную сумму');
            await dialog.accept();
        });

        await page.goto(`/edit-transaction?id=${mockTransaction.id}`);

        // Проверяем каждый тест-кейс отдельно
        for (const testCase of testCases) {
            // Заполняем поле
            await page.fill('input[name="amount"]', testCase);

            // Ожидаем диалог и кликаем одновременно
            await Promise.all([
                page.waitForEvent('dialog'),
                page.click('button[type="submit"]')
            ]);
        }

        // Финальная проверка общего количества
        expect(dialogCount).toBe(testCases.length);
    });

    test('отмена редактирования', async ({ page }) => {
        await page.goto(`/edit-transaction?id=${mockTransaction.id}`);
        await Promise.all([
            page.waitForURL('/transactions'),
            page.click('#cancel')
        ]);
    });

    test('обработка ошибки сервера', async ({ page }) => {
        let dialogShown = false;
        page.on('dialog', async dialog => {
            dialogShown = true;
            expect(dialog.message()).toBe('Не удалось загрузить данные транзакции!');
            await dialog.accept();
        });

        await page.route(`**/api/operations/${mockTransaction.id}`, route => {
            if (route.request().method() === 'PUT') {
                return route.fulfill({
                    status: 500,
                    body: JSON.stringify({ message: 'Internal server error' })
                });
            }
        });

        await page.goto(`/edit-transaction?id=${mockTransaction.id}`);
        await page.fill('input[name="amount"]', '1000');
        await page.click('button[type="submit"]');

        expect(dialogShown).toBeTruthy();
    });

    test('обработка невалидного ID транзакции', async ({ page }) => {
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

        await page.goto('/edit-transaction?id=999');
        await page.waitForURL('/transactions');
        expect(dialogShown).toBeTruthy();
    });
});
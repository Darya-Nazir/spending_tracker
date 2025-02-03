import { expect } from '@playwright/test';

import { test } from './auth.setup.js';
import { createTestUser } from '../fixtures/users.js';

test.describe('Create Income Category', () => {
    const validUser = createTestUser();
    const mockTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token'
    };

    test.beforeEach(async ({ page }) => {
        // Мокаем API ответы
        await page.route('**/api/**', route => {
            const url = route.request().url();

            if (url.includes('/api/login')) {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        tokens: mockTokens,
                        user: { id: 1, name: validUser.fullName }
                    })
                });
            }

            // Дефолтный ответ для остальных API запросов
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([])
            });
        });

        // Выполняем логин
        await page.goto('/login');
        await page.fill('#email', validUser.email);
        await page.fill('#password', validUser.password);
        await page.click('button[type="submit"]');
        await page.waitForURL('/');

        // Переходим на страницу создания категории
        await page.click('#dropdownMenuButton1');
        await page.click('#revenuesPage');
        await page.waitForURL('/incomes');
        await page.click('#addCategoryBtn');
        await page.waitForURL('/create-income');
    });

    test('successful category creation', async ({ page }) => {
        await page.route('**/api/categories/income', route => {
            if (route.request().method() === 'POST') {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ success: true })
                });
            }
        });

        await page.fill('.form-control', 'Новая категория');

        const responsePromise = page.waitForResponse(
            res => res.url().includes('/api/categories/income') &&
                res.request().method() === 'POST'
        );

        await page.click('#create');
        const response = await responsePromise;
        expect(response.ok()).toBeTruthy();

        await page.waitForURL('/incomes');
    });

    test('empty category name validation', async ({ page }) => {
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Введите название категории!');
            await dialog.accept();
        });

        await page.click('#create');
        await expect(page).toHaveURL(/create-income$/);
    });

    test('duplicate category error handling', async ({ page }) => {
        await page.route('**/api/categories/income', route => {
            if (route.request().method() === 'POST') {
                return route.fulfill({
                    status: 400,
                    contentType: 'application/json',
                    body: JSON.stringify({ message: 'Category already exist' })
                });
            }
        });

        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Такая категория уже существует');
            await dialog.accept();
        });

        await page.fill('.form-control', 'Зарплата');
        await page.click('#create');
        await expect(page).toHaveURL(/create-income$/);
    });

    test('cancel button navigation', async ({ page }) => {
        await page.click('#cancel');
        await page.waitForURL('/incomes');
    });

    test('generic error handling', async ({ page }) => {
        await page.route('**/api/categories/income', route => {
            if (route.request().method() === 'POST') {
                return route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: JSON.stringify({ message: 'Internal server error' })
                });
            }
        });

        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Не удалось добавить категорию, попробуйте еще раз.');
            await dialog.accept();
        });

        await page.fill('.form-control', 'Новая категория');
        await page.click('#create');
        await expect(page).toHaveURL(/create-income$/);
    });
});


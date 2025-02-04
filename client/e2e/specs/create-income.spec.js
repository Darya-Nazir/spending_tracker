import { expect } from '@playwright/test';

import { test } from './auth.setup.js';
import { createTestUser } from '../fixtures/users.js';

test.describe('Create Income Category', () => {
    // Arrange - подготовка тестовых данных
    const validUser = createTestUser();
    const mockTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token'
    };

    test.beforeEach(async ({ page }) => {
        // Arrange - настройка моков API и подготовка начального состояния
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

            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([])
            });
        });

        // Act - выполнение предварительных действий для всех тестов
        await page.goto('/login');
        await page.fill('#email', validUser.email);
        await page.fill('#password', validUser.password);
        await page.click('button[type="submit"]');
        await page.waitForURL('/');

        await page.click('#dropdownMenuButton1');
        await page.click('#revenuesPage');
        await page.waitForURL('/incomes');
        await page.click('#addCategoryBtn');
        await page.waitForURL('/create-income');
    });

    test('successful category creation', async ({ page }) => {
        // Arrange - настройка мока для успешного создания категории
        await page.route('**/api/categories/income', route => {
            if (route.request().method() === 'POST') {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ success: true })
                });
            }
        });

        // Act - заполнение и отправка формы
        await page.fill('.form-control', 'Новая категория');
        const responsePromise = page.waitForResponse(
            res => res.url().includes('/api/categories/income') &&
                res.request().method() === 'POST'
        );
        await page.click('#create');

        // Assert - проверка успешного ответа и редиректа
        const response = await responsePromise;
        expect(response.ok()).toBeTruthy();
        await page.waitForURL('/incomes');
    });

    test('empty category name validation', async ({ page }) => {
        // Arrange - подготовка обработчика диалогового окна
        page.on('dialog', async dialog => {
            // Assert - проверка сообщения об ошибке
            expect(dialog.message()).toBe('Введите название категории!');
            await dialog.accept();
        });

        // Act - попытка создания категории с пустым названием
        await page.click('#create');

        // Assert - проверка, что пользователь остается на странице создания
        await expect(page).toHaveURL(/create-income$/);
    });

    test('duplicate category error handling', async ({ page }) => {
        // Arrange - настройка мока для ошибки дубликата
        await page.route('**/api/categories/income', route => {
            if (route.request().method() === 'POST') {
                return route.fulfill({
                    status: 400,
                    contentType: 'application/json',
                    body: JSON.stringify({ message: 'Category already exist' })
                });
            }
        });

        // Arrange - подготовка обработчика диалогового окна
        page.on('dialog', async dialog => {
            // Assert - проверка сообщения об ошибке
            expect(dialog.message()).toBe('Такая категория уже существует');
            await dialog.accept();
        });

        // Act - попытка создания дубликата категории
        await page.fill('.form-control', 'Зарплата');
        await page.click('#create');

        // Assert - проверка, что пользователь остается на странице создания
        await expect(page).toHaveURL(/create-income$/);
    });

    test('cancel button navigation', async ({ page }) => {
        // Act - нажатие кнопки отмены
        await page.click('#cancel');

        // Assert - проверка редиректа на страницу доходов
        await page.waitForURL('/incomes');
    });

    test('generic error handling', async ({ page }) => {
        // Arrange - настройка мока для общей ошибки сервера
        await page.route('**/api/categories/income', route => {
            if (route.request().method() === 'POST') {
                return route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: JSON.stringify({ message: 'Internal server error' })
                });
            }
        });

        // Arrange - подготовка обработчика диалогового окна
        page.on('dialog', async dialog => {
            // Assert - проверка сообщения об ошибке
            expect(dialog.message()).toBe('Не удалось добавить категорию, попробуйте еще раз.');
            await dialog.accept();
        });

        // Act - попытка создания категории при ошибке сервера
        await page.fill('.form-control', 'Новая категория');
        await page.click('#create');

        // Assert - проверка, что пользователь остается на странице создания
        await expect(page).toHaveURL(/create-income$/);
    });
});


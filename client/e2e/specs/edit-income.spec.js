import { expect } from '@playwright/test';

import { test } from './auth.setup.js';
import { createTestUser } from '../fixtures/users.js';

test.describe('Edit Income Category', () => {
    const validUser = createTestUser();
    const mockTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token'
    };

    const mockCategory = {
        id: 1,
        title: 'Зарплата'
    };

    test.beforeEach(async ({ page }) => {
        // Пропускаем запросы к статическим файлам
        await page.route('**/*.{css,js,svg}', route => route.continue());

        // Мокаем API запросы
        await page.route('**/api/**', async route => {
            const url = route.request().url();
            const method = route.request().method();

            // Логин
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

            // GET список категорий
            if (url.includes('/api/categories/income') && method === 'GET' && !url.includes(`/${mockCategory.id}`)) {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([mockCategory])
                });
            }

            // GET конкретная категория
            if (url.includes(`/api/categories/income/${mockCategory.id}`) && method === 'GET') {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify(mockCategory)
                });
            }

            // Дефолтный ответ для остальных запросов
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([])
            });
        });

        // Логин
        await page.goto('/login');
        await page.waitForSelector('#registrationForm');

        await page.fill('input[name="email"]', validUser.email);
        await page.fill('input[name="password"]', validUser.password);
        await page.click('button[type="submit"]');
        await page.waitForURL('/');

        // Переходим к редактированию
        await page.click('#dropdownMenuButton1');
        await page.click('#revenuesPage');
        await page.waitForURL('/incomes');

        await page.waitForSelector(`[data-id="${mockCategory.id}"]`);
        await page.click(`[data-id="${mockCategory.id}"] .btn-primary`);
        await page.waitForURL(`/edit-income?id=${mockCategory.id}`);
        await page.waitForSelector('.form-control');
    });

    test('successful category edit', async ({ page }) => {
        // Arrange - мок для успешного PUT запроса
        await page.route(`**/api/categories/income/${mockCategory.id}`, route => {
            if (route.request().method() === 'PUT') {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ success: true })
                });
            }
        });

        // Act
        await page.fill('.form-control', 'Обновленная зарплата');
        await page.click('#save');

        // Assert
        await page.waitForURL('/incomes');
    });

    test('empty category name validation', async ({ page }) => {
        // Arrange & Act
        let dialogShown = false;
        page.on('dialog', async dialog => {
            dialogShown = true;
            expect(dialog.message()).toBe('Введите название категории!');
            await dialog.accept();
        });

        await page.fill('.form-control', '');
        await page.click('#save');

        // Assert
        await page.waitForTimeout(100); // Даем время для появления диалога
        expect(dialogShown).toBeTruthy();
        await expect(page).toHaveURL(`/edit-income?id=${mockCategory.id}`);
    });

    test('duplicate category error handling', async ({ page }) => {
        // Arrange - мок для ошибки дубликата
        let dialogShown = false;
        page.on('dialog', async dialog => {
            dialogShown = true;
            expect(dialog.message()).toBe('Не удалось обновить категорию, попробуйте еще раз.');
            await dialog.accept();
        });

        await page.route(`**/api/categories/income/${mockCategory.id}`, route => {
            if (route.request().method() === 'PUT') {
                return route.fulfill({
                    status: 400,
                    contentType: 'application/json',
                    body: JSON.stringify({ message: 'Category already exist' })
                });
            }
        });

        // Act
        await page.fill('.form-control', 'Существующая категория');
        await page.click('#save');

        // Assert
        await page.waitForTimeout(100); // Даем время для появления диалога
        expect(dialogShown).toBeTruthy();
        await expect(page).toHaveURL(`/edit-income?id=${mockCategory.id}`);
    });

    test('cancel edit navigation', async ({ page }) => {
        await page.click('#cancel');
        await page.waitForURL('/incomes');
    });

    test('invalid category id handling', async ({ page }) => {
        // Arrange
        let dialogShown = false;
        page.on('dialog', async dialog => {
            dialogShown = true;
            expect(dialog.message()).toBe('Не удалось загрузить данные категории!');
            await dialog.accept();
        });

        await page.route('**/api/categories/income/invalid', route => {
            if (route.request().method() === 'GET') {
                return route.fulfill({
                    status: 404,
                    contentType: 'application/json',
                    body: JSON.stringify({ message: 'Category not found' })
                });
            }
        });

        // Act
        await page.goto('/edit-income?id=invalid');

        // Assert
        await page.waitForTimeout(100); // Даем время для появления диалога
        expect(dialogShown).toBeTruthy();
        await page.waitForURL('/incomes');
    });

    test('server error handling', async ({ page }) => {
        // Arrange
        let dialogShown = false;
        page.on('dialog', async dialog => {
            dialogShown = true;
            expect(dialog.message()).toBe('Не удалось обновить категорию, попробуйте еще раз.');
            await dialog.accept();
        });

        await page.route(`**/api/categories/income/${mockCategory.id}`, route => {
            if (route.request().method() === 'PUT') {
                return route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: JSON.stringify({ message: 'Internal server error' })
                });
            }
        });

        // Act
        await page.fill('.form-control', 'Новое название');
        await page.click('#save');

        // Assert
        await page.waitForTimeout(100); // Даем время для появления диалога
        expect(dialogShown).toBeTruthy();
        await expect(page).toHaveURL(`/edit-income?id=${mockCategory.id}`);
    });

    test('unauthorized access handling', async ({ page }) => {
        // Arrange - мокаем 401 ошибку при редактировании
        await page.route(`**/api/categories/income/${mockCategory.id}`, route => {
            if (route.request().method() === 'PUT') {
                return route.fulfill({
                    status: 401,
                    contentType: 'application/json',
                    body: JSON.stringify({ message: 'Unauthorized' })
                });
            }
        });

        // Arrange - мокаем refresh token запрос
        await page.route('**/api/refresh', route => {
            return route.fulfill({
                status: 401,
                contentType: 'application/json',
                body: JSON.stringify({ message: 'Refresh token expired' })
            });
        });

        // Act - заполняем форму
        await page.fill('.form-control', 'Новое название');

        // Act - отправляем форму и ждем все запросы
        const savePromise = page.click('#save');
        const responsePromise = page.waitForResponse(
            res => res.url().includes(`/api/categories/income/${mockCategory.id}`) &&
                res.request().method() === 'PUT'
        );

        // Дожидаемся ответа и проверяем статус
        const response = await responsePromise;
        expect(response.status()).toBe(401);

        // Ждем выполнения клика
        await savePromise;

        // Assert - проверяем редирект на страницу логина
        await page.waitForURL('/login', { waitUntil: 'networkidle' });
    });
});
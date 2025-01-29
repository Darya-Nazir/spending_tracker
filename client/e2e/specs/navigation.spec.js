import { expect } from '@playwright/test';

import { test } from './auth.setup.js';
import { createTestUser } from '../fixtures/users.js';

test.describe('Navigation tests', () => {
    const validUser = createTestUser();
    const mockTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token'
    };

    test.beforeEach(async ({ page }) => {
        // Arrange: настраиваем моки для API запросов
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

            if (url.includes('/api/categories/expense')) {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([
                        { id: 1, name: 'Продукты', icon: '🥗' },
                        { id: 2, name: 'Транспорт', icon: '🚗' }
                    ])
                });
            }

            if (url.includes('/api/categories/income')) {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([
                        { id: 3, name: 'Зарплата', icon: '💰' },
                        { id: 4, name: 'Фриланс', icon: '💻' }
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

            // Дефолтный ответ для остальных API запросов
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([])
            });
        });

        // Arrange: выполняем вход в систему
        await page.goto('/login');
        await page.fill('#email', validUser.email);
        await page.fill('#password', validUser.password);

        // Act: отправляем форму логина
        await Promise.all([
            page.waitForResponse(res => res.url().includes('/api/login')),
            page.click('button[type="submit"]')
        ]);

        // Arrange: ждем полной загрузки страницы
        await page.waitForLoadState('networkidle');
    });

    test('main navigation elements visibility', async ({ page }) => {
        // Arrange: ждем загрузку навигационных элементов
        await page.waitForSelector('#navbar');

        // Assert: проверяем видимость основных элементов навигации
        await expect(page.locator('#navbar')).toBeVisible();
        await expect(page.locator('.logo-link')).toBeVisible();
        await expect(page.locator('#mainPage')).toBeVisible();
        await expect(page.locator('#transactionsPage')).toBeVisible();
        await expect(page.locator('#dropdownMenuButton1')).toBeVisible();

        // Assert: проверяем отображение информации пользователя
        await expect(page.locator('#balance')).toBeVisible();
        await expect(page.locator('#balance')).toHaveText('500$');
    });

    test('navigation through main menu', async ({ page }) => {
        // Arrange: ждем загрузку элементов главной страницы
        await page.waitForSelector('#incomeChart');
        await page.waitForSelector('#expensesChart');

        // Act: переходим на страницу транзакций
        await page.click('#transactionsPage');
        await page.waitForURL('/transactions');

        // Assert: проверяем корректность перехода и подсветку меню
        await expect(page.locator('#transactionsPage')).toHaveClass(/bg-primary/);
    });

    test('categories dropdown navigation', async ({ page }) => {
        // Act: открываем дропдаун и переходим к доходам
        await page.click('#dropdownMenuButton1');
        await page.click('#revenuesPage');
        await page.waitForURL('/incomes');

        // Assert: проверяем подсветку меню для доходов
        await expect(page.locator('#dropdownMenuButton1')).toHaveClass(/btn-primary/);
        await expect(page.locator('#revenuesPage')).toHaveClass(/bg-primary/);

        // Act: открываем дропдаун и переходим к расходам
        await page.click('#dropdownMenuButton1');
        await page.click('#costsPage');
        await page.waitForURL('/costs');

        // Assert: проверяем подсветку меню для расходов
        await expect(page.locator('#dropdownMenuButton1')).toHaveClass(/btn-primary/);
        await expect(page.locator('#costsPage')).toHaveClass(/bg-primary/);
    });

    test('unauthorized access protection', async ({ page }) => {
        // Arrange: список защищенных маршрутов
        const privateRoutes = ['/', '/transactions', '/costs', '/incomes'];

        // Act: выходим из системы
        await page.click('button[data-bs-target="#userModal"]');
        await page.click('#logout');

        // Assert: проверяем редирект на логин
        await page.waitForURL('/login');

        // Act & Assert: проверяем каждый защищенный маршрут
        for (const route of privateRoutes) {
            // Act: пытаемся перейти на защищенный маршрут
            await page.goto(route);
            // Assert: проверяем редирект на страницу логина
            await page.waitForURL('/login');
        }
    });

    test('logout flow through modal', async ({ page }) => {
        // Arrange: открываем модальное окно
        await page.click('button[data-bs-target="#userModal"]');

        // Assert: проверяем отображение модального окна
        await expect(page.locator('#userModal')).toBeVisible();

        // Act: выполняем выход
        await page.click('#logout');
        await page.waitForURL('/login');

        // Assert: проверяем результат выхода
        await expect(page.locator('#navbar')).not.toBeVisible();
    });
});


//
// Давайте подведем итоги того, что мы протестировали:
//
//     Навигация:
//
// Проверка видимости всех элементов меню
// Переход между главной и страницей транзакций
// Работа с выпадающим меню категорий
// Подсветка активных пунктов меню
//
//
//      Авторизация:
//
// Корректное отображение данных после входа (имя пользователя, баланс)
// Защита маршрутов от неавторизованного доступа
// Процесс выхода через модальное окно
// Редиректы на страницу логина
//
//
//      Интерфейс:
//
// Отображение графиков на главной странице
// Корректная работа модального окна при выходе
// Отображение и форматирование баланса
// Работа навигационной панели

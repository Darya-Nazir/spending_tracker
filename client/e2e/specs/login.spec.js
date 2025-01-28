import { expect } from '@playwright/test';

import { test } from './auth.setup.js';
import { createTestUser } from '../fixtures/users.js';

const validUser = createTestUser();

test.describe('Login success scenarios', () => {
    // Общий Arrange для всех тестов в describe блоке
    test.beforeEach(async ({ page }) => {
        // Arrange: подготовка тестового окружения
        await page.goto('/login');
        // Arrange: настройка мока для API
        await page.route('**/api/login', route => route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                tokens: { accessToken: 'mock-token', refreshToken: 'mock-refresh' },
                user: { id: 1, name: validUser.fullName }
            })
        }));
    });

    test('successful login', async ({ page }) => {
        // Arrange: заполнение формы валидными данными
        await page.fill('#email', validUser.email);
        await page.fill('#password', validUser.password);
        const responsePromise = page.waitForResponse(res => res.url().includes('/api/login'));

        // Act: отправка формы
        await page.click('button[type="submit"]');
        await responsePromise;

        // Assert: проверка успешного редиректа
        await expect(page).toHaveURL('/');
    });

    test('remember me functionality', async ({ page }) => {
        // Arrange: заполнение формы с включением "запомнить меня"
        await page.fill('#email', validUser.email);
        await page.fill('#password', validUser.password);
        await page.check('#rememberMe');
        const responsePromise = page.waitForResponse(res => res.url().includes('/api/login'));

        // Act: отправка формы
        await page.click('button[type="submit"]');
        await responsePromise;

        // Assert: проверка успешного редиректа
        await expect(page).toHaveURL('/');
    });

    test('email validation', async ({ page }) => {
        // Arrange: заполнение формы невалидным email
        await page.fill('#email', 'invalid-email');

        // Act: попытка отправки формы
        await page.click('button[type="submit"]');

        // Assert: проверка появления класса валидации
        await expect(page.locator('#email')).toHaveClass(/is-invalid/);
    });

    test('empty form validation', async ({ page }) => {
        // Act: попытка отправки пустой формы
        await page.click('button[type="submit"]');

        // Assert: проверка появления класса валидации на форме
        await expect(page.locator('form')).toHaveClass(/was-validated/);
    });
});

test.describe('Login error scenarios', () => {
    test.beforeEach(async ({ page }) => {
        // Arrange: базовая подготовка страницы
        await page.goto('/login');
    });

    test('invalid credentials', async ({ page }) => {
        // Arrange: настройка мока для неуспешной авторизации
        await page.route('**/api/login', route => route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Пользователь с такими данными не зарегистрирован' })
        }));
        await page.fill('#email', 'wrong@email.com');
        await page.fill('#password', 'wrongpass');

        // Act: отправка формы
        await page.click('button[type="submit"]');

        // Assert: проверка появления и содержимого диалога ошибки
        const dialog = await page.waitForEvent('dialog');
        expect(dialog.message()).toBe('Пользователь с такими данными не зарегистрирован');
        await dialog.accept();
    });

    test('invalid credentials: should show only one alert', async ({ page }) => {
        // Arrange: настройка мока и подготовка отслеживания диалогов
        await page.route('**/api/login', route => route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Пользователь с такими данными не зарегистрирован' })
        }));
        await page.fill('#email', 'wrong@email.com');
        await page.fill('#password', 'wrongpass');
        let dialogCount = 0;
        const dialogHandler = dialog => {
            dialogCount++;
            dialog.accept();
        };
        page.on('dialog', dialogHandler);

        // Act: отправка формы и ожидание реакции
        await page.click('button[type="submit"]');
        await page.waitForEvent('dialog');
        await page.waitForTimeout(100);

        // Assert: проверка количества появившихся диалогов
        page.removeListener('dialog', dialogHandler);
        expect(dialogCount).toBe(1);
    });
});


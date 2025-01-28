import { expect } from '@playwright/test';

import { test } from './auth.setup.js';
import { createTestUser } from '../fixtures/users.js';

test.describe('Registration', () => {
    const validUser = createTestUser();

    // Arrange
    test.beforeEach(async ({ page }) => {
        await page.goto('/signup');
    });

    test('successful registration', async ({ page }) => {
        // Arrange. Мок для регистрации
        await page.route('**/api/signup', route => {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true })
            });
        });

        // Arrange. Мок для логина
        await page.route('**/api/login', route => {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    tokens: { accessToken: 'mock-token', refreshToken: 'mock-refresh' },
                    user: { id: 1, name: validUser.fullName }
                })
            });
        });

        // Arrange. Мок для GET запросов категорий - возвращаем пустые массивы,
        // чтобы сработало создание дефолтных категорий
        await page.route('**/api/categories/expense', route => {
            if (route.request().method() === 'GET') {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([])
                });
            }
            return route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
        });

        // Arrange
        await page.route('**/api/categories/income', route => {
            if (route.request().method() === 'GET') {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([])
                });
            }
            return route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
        });

        // Arrange. Заполняем форму
        await page.fill('#fullName', validUser.fullName);
        await page.fill('#email', validUser.email);
        await page.fill('#password', validUser.password);
        await page.fill('#confirmPassword', validUser.confirmPassword);

        // Act. Отправляем форму и ждем все запросы
        const signupPromise = page.waitForResponse(res => res.url().includes('/api/signup'));
        const loginPromise = page.waitForResponse(res => res.url().includes('/api/login'));
        const expenseCategoriesGetPromise = page.waitForResponse(
            res => res.url().includes('/api/categories/expense') && res.request().method() === 'GET'
        );
        const incomeCategoriesGetPromise = page.waitForResponse(
            res => res.url().includes('/api/categories/income') && res.request().method() === 'GET'
        );

        await page.click('button[type="submit"]');

        // Act. Ждем выполнения всех запросов
        await Promise.all([
            signupPromise,
            loginPromise,
            expenseCategoriesGetPromise,
            incomeCategoriesGetPromise
        ]);

        // Act. Ждем завершения POST запросов для создания категорий
        await page.waitForResponse(
            res => res.url().includes('/api/categories') && res.request().method() === 'POST'
        );

        // Assert. Проверяем редирект на главную
        await page.waitForURL('/');
        await expect(page).toHaveURL('/');
    });

    test('empty form validation', async ({ page }) => {
        // Act
        await page.click('button[type="submit"]');
        // Assert
        await expect(page.locator('form')).toHaveClass(/was-validated/);
        await expect(page.locator('#fullName')).toHaveClass(/is-invalid/);
    });

    // Arrange
    test('invalid email format', async ({ page }) => {
        await page.fill('#email', 'invalid-email');
        // Act
        await page.click('button[type="submit"]');
        // Assert
        await expect(page.locator('#email')).toHaveClass(/is-invalid/);
    });

    // Arrange
    test('password mismatch', async ({ page }) => {
        await page.fill('#password', validUser.password);
        await page.fill('#confirmPassword', 'DifferentPass123!');
        // Act
        await page.click('button[type="submit"]');
        // Assert
        await expect(page.locator('#confirmPassword')).toHaveClass(/is-invalid/);
    });
});


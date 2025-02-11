import { expect } from '@playwright/test';

import { test } from './auth.setup.js';
import { mockTokens } from "../fixtures/test-data.js";
import { createTestUser } from '../fixtures/users.js';

test.describe('Create income transaction', () => {
    const validUser = createTestUser();
    const tokens = mockTokens;

    test.beforeEach(async ({ page }) => {
        // Arrange - setup API mocks
        await page.route('**/api/**', route => {
            const url = route.request().url();

            if (url.includes('/api/login')) {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        tokens: tokens,
                        user: { id: 1, name: validUser.fullName }
                    })
                });
            }

            if (url.includes('/api/categories/income')) {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([
                        { id: 1, title: 'Зарплата' },
                        { id: 2, title: 'Фриланс' }
                    ])
                });
            }

            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([])
            });
        });

        // Login
        await page.goto('/login');
        await page.fill('#email', validUser.email);
        await page.fill('#password', validUser.password);
        await page.click('button[type="submit"]');
        await page.waitForURL('/');

        // Go to the page of transaction creation with specifying the transaction type
        await page.goto('/create-transaction?type=income');
        // Waiting for the form to load
        await page.waitForSelector('form', { state: 'visible' });
        await page.waitForLoadState('networkidle');
    });

    test('autocomplete transaction type', async ({ page }) => {
        // Wait for the type field to appear and check it
        const typeInput = page.locator('.form-control[placeholder="Тип..."]');
        await expect(typeInput).toBeVisible();
        await expect(typeInput).toHaveValue('Доход');
        await expect(typeInput).toHaveAttribute('readonly', '');

        // Checking background style
        const background = await typeInput.evaluate(el =>
            window.getComputedStyle(el).backgroundColor);
        expect(background).toBe('rgb(248, 249, 250)');
    });

    test('working with a drop-down list of categories', async ({ page }) => {
        const categoriesList = page.locator('#categoriesList');
        const categoryInput = page.locator('#categoryInput');

        // Check initial state (list hidden)
        await expect(categoriesList).toHaveCSS('display', 'none');

        // Opening the list
        await categoryInput.click();
        await expect(categoriesList).toBeVisible();

        // Checking the list of categories
        const items = await page.locator('#categoriesList .dropdown-item').all();
        expect(items.length).toBe(2);

        // Checking the category text
        await expect(items[0]).toHaveText('Зарплата');
        await expect(items[1]).toHaveText('Фриланс');

        // Choose a category
        await items[0].click();
        await expect(categoryInput).toHaveValue('Зарплата');
        await expect(categoriesList).toHaveCSS('display', 'none');
    });

    test('amount field validation', async ({ page }) => {
        const amountInput = page.locator('input[placeholder="Сумма в $..."]');

        let dialogMessage = '';
        page.on('dialog', dialog => {
            dialogMessage = dialog.message();
            dialog.accept();
        });

        await amountInput.fill('abc');
        await page.click('#create');
        expect(dialogMessage).toBe('Введите корректную сумму');

        await amountInput.fill('-100');
        await page.click('#create');
        expect(dialogMessage).toBe('Введите корректную сумму');

        await amountInput.fill('0');
        await page.click('#create');
        expect(dialogMessage).toBe('Введите корректную сумму');
    });

    test('datapicker operation', async ({ page }) => {
        const dateInput = page.locator('input[placeholder="Дата..."]');

        await dateInput.click();
        await page.waitForSelector('.datepicker-dropdown', { state: 'visible' });

        await page.locator('.datepicker-days .day:not(.old):not(.new)').first().click();

        const dateValue = await dateInput.inputValue();
        expect(dateValue).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
    });

    test('successful income creation', async ({ page }) => {
        await page.route('**/api/operations', route => {
            if (route.request().method() === 'POST') {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ success: true })
                });
            }
        });

        await page.click('#categoryInput');
        await page.locator('.dropdown-item', { hasText: 'Зарплата' }).click();
        await page.fill('input[placeholder="Сумма в $..."]', '1000');
        await page.click('input[placeholder="Дата..."]');
        await page.locator('.datepicker-days .day:not(.old):not(.new)').first().click();
        await page.fill('input[placeholder="Комментарий..."]', 'Зарплата за январь');

        const responsePromise = page.waitForResponse(res =>
            res.url().includes('/api/operations') &&
            res.request().method() === 'POST'
        );
        await page.click('#create');
        const response = await responsePromise;

        // Assert
        expect(response.ok()).toBeTruthy();
        await page.waitForURL('/transactions');
    });

    test('cancel income', async ({ page }) => {
        await page.click('#cancel');
        await page.waitForURL('/transactions');
    });
});


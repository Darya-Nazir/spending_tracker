import { expect } from '@playwright/test';

import { test } from './auth.setup.js';
import { mockTokens } from "../fixtures/test-data.js";
import { createTestUser } from '../fixtures/users.js';

test.describe('Create income transaction', () => {
    // Global Arrange
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

        // Arrange - perform login
        await page.goto('/login');
        await page.fill('#email', validUser.email);
        await page.fill('#password', validUser.password);
        await page.click('button[type="submit"]');
        await page.waitForURL('/');

        // Arrange - navigate to create transaction page
        await page.goto('/create-transaction?type=income');
        await page.waitForSelector('form', { state: 'visible' });
        await page.waitForLoadState('networkidle');
    });

    test('autocomplete transaction type', async ({ page }) => {
        // Arrange
        const typeInput = page.locator('.form-control[placeholder="Тип..."]');

        // Act - wait for element to be visible
        await expect(typeInput).toBeVisible();
        await expect(typeInput).toHaveValue('Доход');
        await expect(typeInput).toHaveAttribute('readonly', '');
    });

    test('income categories dropdown UI functionality', async ({ page }) => {
        // Arrange
        const categoriesList = page.locator('#categoriesList');
        const categoryInput = page.locator('#categoryInput');

        // Assert - initial state
        await expect(categoriesList).toHaveCSS('display', 'none');

        // Act - open dropdown
        await categoryInput.click();
        await expect(categoriesList).toBeVisible();

        // Act & Assert - check list content
        const items = await page.locator('#categoriesList .dropdown-item').all();
        expect(items.length).toBe(2);
        await expect(items[0]).toHaveText('Зарплата');
        await expect(items[1]).toHaveText('Фриланс');

        // Act - select category and verify selection
        await items[0].click();
        await expect(categoryInput).toHaveValue('Зарплата');
        await expect(categoriesList).toHaveCSS('display', 'none');
    });

    test('selected income category is correctly sent to backend', async ({ page }) => {
        // Arrange
        let requestSent = null;
        let selectedCategoryText = '';

        await page.route('**/api/operations', async route => {
            if (route.request().method() === 'POST') {
                requestSent = JSON.parse(route.request().postData());
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ success: true })
                });
            }
        });

        // Act - select category and fill form
        await page.click('#categoryInput');
        const categoryElement = page.locator('#categoriesList .dropdown-item').first();

        // Get the category text before clicking
        selectedCategoryText = (await categoryElement.textContent()).trim();
        await categoryElement.click();

        await page.fill('input[placeholder="Сумма в $..."]', '1000');
        await page.click('input[placeholder="Дата..."]');
        await page.locator('.datepicker-days .day:not(.old):not(.new)').first().click();

        // Submit form and wait for response
        const responsePromise = page.waitForResponse(res =>
            res.url().includes('/api/operations') &&
            res.request().method() === 'POST'
        );
        await page.click('#create');
        await responsePromise;

        // Assert
        expect(requestSent.category_id).toBe(1);
        expect(selectedCategoryText).toBe('Зарплата'); // Verify that ID 1 corresponds to "Зарплата"

        // Double check that the input field shows the correct category
        const categoryInputValue = await page.locator('#categoryInput').inputValue();
        expect(categoryInputValue).toBe('Зарплата');
    });

    test('amount field validation', async ({ page }) => {
        // Arrange
        const amountInput = page.locator('input[placeholder="Сумма в $..."]');

        let dialogMessage = '';
        page.on('dialog', dialog => {
            dialogMessage = dialog.message();
            dialog.accept();
        });

        // Act & Assert - test invalid inputs
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
        // Arrange
        const dateInput = page.locator('input[placeholder="Дата..."]');

        // Act - open datepicker and select date
        await dateInput.click();
        await page.waitForSelector('.datepicker-dropdown', { state: 'visible' });
        await page.locator('.datepicker-days .day:not(.old):not(.new)').first().click();

        // Assert - check date format
        const dateValue = await dateInput.inputValue();
        expect(dateValue).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
    });

    test('successful income creation', async ({ page }) => {
        // Arrange - setup success response mock
        await page.route('**/api/operations', route => {
            if (route.request().method() === 'POST') {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ success: true })
                });
            }
        });

        // Act
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
        // Act - click cancel button
        await page.click('#cancel');

        // Assert - check navigation
        await page.waitForURL('/transactions');
    });
});


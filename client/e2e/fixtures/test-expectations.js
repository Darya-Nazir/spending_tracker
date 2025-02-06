import { expect } from '@playwright/test';

export const commonExpectations = {
    async expectUnauthorizedRedirect(page) {
        await page.waitForURL('/login');
        await expect(page).toHaveURL('/login');
    },

    async expectModalDialog(page, expectedMessage) {
        const dialog = await page.waitForEvent('dialog');
        expect(dialog.message()).toBe(expectedMessage);
        await dialog.accept();
    }
};
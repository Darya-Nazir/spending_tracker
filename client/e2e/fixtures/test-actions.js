export const commonActions = {
    async login(page, user) {
        await page.goto('/login');
        await page.fill('#email', user.email);
        await page.fill('#password', user.password);
        await Promise.all([
            page.waitForResponse(res => res.url().includes('/api/login')),
            page.click('button[type="submit"]')
        ]);
        await page.waitForURL('/');
    },

    async navigateToIncomes(page) {
        await page.click('#dropdownMenuButton1');
        await page.click('#revenuesPage');
        await page.waitForURL('/incomes');
    }
};
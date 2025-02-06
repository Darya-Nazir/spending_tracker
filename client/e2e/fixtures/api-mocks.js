import { mockTokens } from './test-data';

export const setupCommonMocks = async (page, user) => {
    await page.route('**/api/**', route => {
        const url = route.request().url();

        if (url.includes('/api/login')) {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    tokens: mockTokens,
                    user: { id: 1, name: user.fullName }
                })
            });
        }

        return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([])
        });
    });
};

export const setupCategoryMocks = async (page, categories) => {
    await page.route('**/api/categories/**', route => {
        const url = route.request().url();
        const method = route.request().method();

        if (url.includes('/income') && method === 'GET') {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(categories.income)
            });
        }

        if (url.includes('/expense') && method === 'GET') {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(categories.expense)
            });
        }
    });
};
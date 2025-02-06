import { setupCommonMocks } from './api-mocks';
import { commonActions } from './test-actions';
import { createTestUser } from './users';

export const setupAuthenticatedTest = (test) => {
    let user;

    test.beforeEach(async ({ page }) => {
        user = createTestUser();
        await setupCommonMocks(page, user);
        await commonActions.login(page, user);
    });

    return () => user;
};
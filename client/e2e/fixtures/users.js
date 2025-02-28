export function createTestUser() {
    return {
        fullName: 'Test Profile',
        email: `test${Date.now()}@example.com`,
        password: 'Password123!',
        confirmPassword: 'Password123!'
    };
}


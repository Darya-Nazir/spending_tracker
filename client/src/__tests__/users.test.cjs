import { users } from '../../mocks/data/users.js';

test('fetches users successfully', async () => {
    const response = await fetch('/api/users');
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(users);
});
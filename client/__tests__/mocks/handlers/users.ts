import { http, HttpResponse } from 'msw';
import { users } from '../../fixtures/data/users';

export const userHandlers = [
    http.get('/api/users', () => {
        return HttpResponse.json(users, { status: 200 });
    })
];
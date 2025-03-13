import { rest } from 'msw';
import { users } from '../../fixtures/data/users';

export const userHandlers = [
    rest.get('/api/users', (req, res, ctx) => {
        return res(
            ctx.json(users),
            ctx.status(200)
        );
    })
];
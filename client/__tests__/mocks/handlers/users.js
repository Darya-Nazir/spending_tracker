import { rest } from 'msw';

import { users } from '../../fixtures/data/users.js'

export const userHandlers = [
    rest.get('/api/users', async (req, res, ctx) => {
        return res(
            ctx.status(200),
            ctx.json(users)
        );
    })
];
import { setupServer } from 'msw/node';

import { userHandlers } from './handlers/users.js';

export const server = setupServer(
    ...userHandlers
);
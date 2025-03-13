import { setupServer } from 'msw/node';

import { userHandlers } from './handlers/users';

export const server = setupServer(...userHandlers);
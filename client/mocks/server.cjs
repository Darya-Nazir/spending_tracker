const { setupServer } = require('msw/node');

const { userHandlers } = require('./handlers/users.cjs');  // изменили .js на .cjs

const server = setupServer(
    ...userHandlers
);

module.exports = { server };
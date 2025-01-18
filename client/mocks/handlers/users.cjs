const { rest } = require('msw');

const { users } = require('../data/users.cjs');
const { createResponse } = require('../utils/response.cjs');

const userHandlers = [
    rest.get('/api/users', async (req, res, ctx) => {
        return createResponse(users);
    })
];

module.exports = { userHandlers };
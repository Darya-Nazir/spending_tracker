"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = void 0;
const node_1 = require("msw/node");
const users_js_1 = require("./handlers/users.js");
exports.server = (0, node_1.setupServer)(...users_js_1.userHandlers);

"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userHandlers = void 0;
const msw_1 = require("msw");
const users_js_1 = require("../../fixtures/data/users.js");
exports.userHandlers = [
    msw_1.rest.get('/api/users', (req, res, ctx) => __awaiter(void 0, void 0, void 0, function* () {
        return res(ctx.status(200), ctx.json(users_js_1.users));
    }))
];

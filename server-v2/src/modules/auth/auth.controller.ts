import type { Request, Response } from 'express';

import type { SignupInput } from './auth.schemas.ts';
import type { AuthService, PublicUser } from './auth.service.ts';

type SignupResponse = {
    user: PublicUser;
};

export class AuthController {
    readonly #service: AuthService;

    constructor(service: AuthService) {
        this.#service = service;
    }

    readonly signup = async (
        req: Request<Record<string, never>, SignupResponse, SignupInput>,
        res: Response<SignupResponse>,
    ): Promise<void> => {
        const user = await this.#service.signup(req.body);

        res.status(201).json({ user });
    };
}

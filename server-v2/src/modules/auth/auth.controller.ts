import type { Request, Response } from 'express';

import type { LoginInput, RefreshInput, SignupInput } from './auth.schemas.ts';
import type { AuthService, LoginResult, PublicUser } from './auth.service.ts';
import type { TokenPair } from './token.service.ts';

type SignupResponse = {
    user: PublicUser;
};

export class AuthController {
    private readonly service: AuthService;

    constructor(service: AuthService) {
        this.service = service;
    }

    readonly signup = async (
        req: Request<Record<string, never>, SignupResponse, SignupInput>,
        res: Response<SignupResponse>,
    ): Promise<void> => {
        const user = await this.service.signup(req.body);

        res.status(201).json({ user });
    };

    readonly login = async (
        req: Request<Record<string, never>, LoginResult, LoginInput>,
        res: Response<LoginResult>,
    ): Promise<void> => {
        const result = await this.service.login(req.body, req.get('user-agent'));
        req.log.info({ userId: result.user.id }, 'user logged in');
        res.status(200).json(result);
    };

    readonly refresh = async (
        req: Request<Record<string, never>, { tokens: TokenPair }, RefreshInput>,
        res: Response<{ tokens: TokenPair }>,
    ): Promise<void> => {
        const tokens = await this.service.refresh(req.body);
        res.status(200).json({ tokens });
    };

    readonly logout = async (
        req: Request<Record<string, never>, { error: boolean; message: string }, RefreshInput>,
        res: Response<{ error: boolean; message: string }>,
    ): Promise<void> => {
        await this.service.logout(req.body);
        res.status(200).json({ error: false, message: 'Logged out successfully' });
    };
}

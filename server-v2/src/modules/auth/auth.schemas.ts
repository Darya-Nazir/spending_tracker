import { z } from 'zod';

export const signupSchema = z
    .object({
        name: z.string().min(2, 'name must contain at least 2 characters'),
        email: z.string().email('email must be valid'),
        password: z.string().min(6, 'password must contain at least 6 characters'),
        passwordRepeat: z.string(),
    })
    .strict()
    .refine(({ password, passwordRepeat }) => password === passwordRepeat, {
        message: 'passwordRepeat must match password',
        path: ['passwordRepeat'],
    });

export type SignupInput = z.infer<typeof signupSchema>;

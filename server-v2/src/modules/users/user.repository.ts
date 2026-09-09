import type { QueryExecutor } from '../../db/database.ts';
import { ConflictError } from '../../errors/app-error.ts';
import type { NormalizedEmail } from './email.service.ts';

type UserRow = {
    id: number;
    email: string;
    name: string;
    password_hash: string;
    created_at: Date;
};

export type User = {
    id: number;
    email: string;
    name: string;
    passwordHash: string;
    createdAt: Date;
};

export type CreateUserInput = {
    email: NormalizedEmail;
    name: string;
    passwordHash: string;
};

const isUniqueViolation = (error: unknown): boolean => {
    return typeof error === 'object'
        && error !== null
        && 'code' in error
        && error.code === '23505';
};

export class UserRepository {
    readonly #database: QueryExecutor;

    constructor(database: QueryExecutor) {
        this.#database = database;
    }

    async create(input: CreateUserInput): Promise<User> {
        try {
            const { rows } = await this.#database.query<UserRow>(
                `insert into users (email, name, password_hash)
                 values ($1, $2, $3)
                 returning id, email, name, password_hash, created_at`,
                [input.email, input.name, input.passwordHash],
            );
            const row = rows[0];

            if (row === undefined) {
                throw new Error('PostgreSQL did not return the created user');
            }

            return UserRepository.#map(row);
        } catch (error) {
            if (isUniqueViolation(error)) {
                throw new ConflictError('Profile with given email already exists');
            }

            throw error;
        }
    }

    async findByEmail(email: NormalizedEmail): Promise<User | null> {
        const { rows } = await this.#database.query<UserRow>(
            `select id, email, name, password_hash, created_at
               from users
              where email = $1`,
            [email],
        );
        const row = rows[0];

        if (row === undefined) {
            return null;
        }

        return UserRepository.#map(row);
    }

    static #map(row: UserRow): User {
        return {
            id: row.id,
            email: row.email,
            name: row.name,
            passwordHash: row.password_hash,
            createdAt: row.created_at,
        };
    }
}

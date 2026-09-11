import type { Database, QueryExecutor } from '../../../db/database.ts';
import type { UserRegisteredEvent } from '../../identity/contracts.ts';
import { CategoryTitleService } from '../categories/category-title.service.ts';
import { CategoryRepository, type Category, type CategoryType } from '../categories/category.repository.ts';
import { CATEGORY_TYPES, DEFAULT_CATEGORY_TITLES, SYSTEM_CATEGORY_TITLE } from '../categories/default-categories.ts';
import { AccountRepository } from './account.repository.ts';

const titles = new CategoryTitleService();

const keyOf = (type: CategoryType, normalizedTitle: string): string => `${type}|${normalizedTitle}`;

const normalizedTitleOf = (category: Category): string => (
    category.titleNormalized ?? titles.normalize(category.title)
);
// вставляет стандартные категории
class CategorySeeder {
    readonly #userId: number;
    readonly #categories: CategoryRepository;
    #existing: Category[] = [];
    #byKey: Map<string, Category> = new Map();

    constructor(userId: number, executor: QueryExecutor) {
        this.#userId = userId;
        this.#categories = new CategoryRepository(executor);
    }

    async seed(): Promise<void> {
        this.#existing = await this.#categories.findAllByUserId(this.#userId);
        this.#byKey = new Map(this.#existing.map(
            category => [keyOf(category.type, normalizedTitleOf(category)), category],
        ));

        for (const type of CATEGORY_TYPES) {
            await this.#createMissing(type);
            await this.#markSystem(type);
        }
    }

    async #createMissing(type: CategoryType): Promise<void> {
        for (const title of DEFAULT_CATEGORY_TITLES[type]) {
            const titleNormalized = titles.normalize(title);
            const key = keyOf(type, titleNormalized);

            if (this.#byKey.has(key)) {
                continue;
            }

            const id = await this.#categories.create(this.#userId, { type, title, titleNormalized });
            this.#byKey.set(key, { id, type, title, titleNormalized, isDefault: false });
        }
    }

    async #markSystem(type: CategoryType): Promise<void> {
        const system = this.#byKey.get(keyOf(type, titles.normalize(SYSTEM_CATEGORY_TITLE)));

        if (system === undefined || system.isDefault) {
            return;
        }

        const conflicting = this.#existing.find(
            category => category.type === type && category.isDefault && category.id !== system.id,
        );

        if (conflicting !== undefined) {
            throw new Error(
                `User ${this.#userId} already has a system ${type} category "${conflicting.title}" `
                + `(id ${conflicting.id}) that differs from "${SYSTEM_CATEGORY_TITLE}": `
                + 'the data needs a manual review',
            );
        }

        await this.#categories.markSystem(this.#userId, system.id);
    }
}

export async function handleUserRegistered(event: UserRegisteredEvent, finance: Database): Promise<void> {
    await finance.transaction(async executor => {
        const accounts = new AccountRepository(executor);

        if (await accounts.createAndLock(event.userId) === 'ready') {
            return;
        }

        await new CategorySeeder(event.userId, executor).seed();
        await accounts.markReady(event.userId);
    });
}

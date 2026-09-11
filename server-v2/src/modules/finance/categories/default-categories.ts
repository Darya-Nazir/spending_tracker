import type { CategoryType } from './category.repository.ts';

export const SYSTEM_CATEGORY_TITLE = 'Общее';

export const DEFAULT_CATEGORY_TITLES: Readonly<Record<CategoryType, readonly string[]>> = Object.freeze({
    expense: Object.freeze([
        SYSTEM_CATEGORY_TITLE, 'Еда', 'Жильё', 'Здоровье', 'Кафе',
        'Авто', 'Одежда', 'Развлечения', 'Счета', 'Спорт',
    ]),
    income: Object.freeze([
        SYSTEM_CATEGORY_TITLE, 'Депозиты', 'Зарплата', 'Сбережения', 'Инвестиции',
    ]),
});

export const CATEGORY_TYPES: readonly CategoryType[] = ['expense', 'income'];

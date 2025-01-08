import { Http } from "./http.js";

export class DefaultCategoriesManager {
    static expenseCategories = [
        'Еда',
        'Жильё',
        'Здоровье',
        'Кафе',
        'Авто',
        'Одежда',
        'Развлечения',
        'Счета',
        'Спорт'
    ];

    static incomeCategories = [
        'Депозиты',
        'Зарплата',
        'Сбережения',
        'Инвестиции'
    ];

    static async createIfEmpty(apiUrl, categories) {
        try {
            const existingCategories = await Http.request(apiUrl, 'GET');

            if (existingCategories.length === 0) {
                for (const title of categories) {
                    await Http.request(apiUrl, 'POST', { title });
                }
            }
        } catch (error) {
            console.error('Ошибка при создании категорий:', error);
        }
    }
}


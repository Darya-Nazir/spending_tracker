import { Http } from "./http.js";
// import { Auth } from "./auth.js";

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

    // async sendCategoriesToBackend() {
    //     const loginPath = 'http://localhost:3000/api/login';
    //     const loginResult = await Http.request(loginPath, 'POST', loginData, false);
    //
    //     if (loginResult && loginResult.tokens) {
    //         const userInfo = {
    //             id: loginResult.user.id,
    //             name: loginResult.user.name,
    //         };
    //
    //         // Сохраняем токены и информацию о пользователе
    //         Auth.setTokens(loginResult.tokens.accessToken, loginResult.tokens.refreshToken);
    //         Auth.setUserInfo(userInfo);
    //
    //         // 3. Создаем шаблонные категории
    //         await Promise.all([
    //             DefaultCategoriesManager.createIfEmpty(
    //                 'http://localhost:3000/api/categories/expense',
    //                 DefaultCategoriesManager.expenseCategories
    //             ),
    //             DefaultCategoriesManager.createIfEmpty(
    //                 'http://localhost:3000/api/categories/income',
    //                 DefaultCategoriesManager.incomeCategories
    //             )
    //         ]);
    //
    //     }
    // }
}


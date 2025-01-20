import { Http } from "./http.js";
import { Auth } from "./auth.js";

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

    static async processLogin(loginData) {
        try {
            const loginPath = 'http://localhost:3000/api/login';
            const loginResult = await Http.request(loginPath, 'POST', loginData, false);

            if (!loginResult || !loginResult.tokens) {
                return false;
            }

            const userInfo = {
                id: loginResult.user.id,
                name: loginResult.user.name,
            };

            Auth.setTokens(loginResult.tokens.accessToken, loginResult.tokens.refreshToken);
            Auth.setUserInfo(userInfo);

            return true;

        } catch (error) {
            console.error('Ошибка при входе:', error);
            return false;
        }
    }

    static async setupDefaultCategories() {
        try {
            await Promise.all([
                this.createIfEmpty(
                    'http://localhost:3000/api/categories/expense',
                    this.expenseCategories
                ),
                this.createIfEmpty(
                    'http://localhost:3000/api/categories/income',
                    this.incomeCategories
                )
            ]);
            return true;
        } catch (error) {
            console.error('Созданиe категорий:', error);
            return false;
        }
    }

    static async createIfEmpty(apiUrl, categories) {
        try {
            const existingCategories = await Http.request(apiUrl, 'GET');

            if (existingCategories.length === 0) {
                for (const title of categories) {
                    await Http.request(apiUrl, 'POST', { title });
                }
            }
        } catch (error) {
            console.error('Созданиe категорий:', error);
            throw error;
        }
    }
}


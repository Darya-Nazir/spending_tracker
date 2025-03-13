import { Auth } from "./auth";
import { Http } from "./http";
import {UserInfo} from "../types/user-info-type";
import {LoginData, LoginResponse} from "../types/login-type";
import {Category} from "../types/category-type";

export class DefaultCategoriesManager {
    static expenseCategories: string[] = [
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

    static incomeCategories: string[] = [
        'Депозиты',
        'Зарплата',
        'Сбережения',
        'Инвестиции'
    ];

    public static async processLogin(loginData: LoginData): Promise<boolean> {
        try {
            const loginPath: string = 'http://localhost:3000/api/login';
            const loginResult = await Http.request<LoginResponse>(loginPath, 'POST', loginData, false);

            if (!loginResult || !loginResult.tokens) {
                return false;
            }

            const userInfo: UserInfo = {
                id: loginResult.user.id,
                name: loginResult.user.name,
            };

            Auth.setTokens(loginResult.tokens.accessToken, loginResult.tokens.refreshToken);
            Auth.setUserInfo(userInfo);

            return true;

        } catch (error) {
            console.error('Login error:', error);
            return false;
        }
    }

    public static async setupDefaultCategories(): Promise<boolean> {
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
            console.error('Creating categories:', error);
            return false;
        }
    }

    public static async createIfEmpty(apiUrl: string, categories: string[]): Promise<void> {
        try {
            const existingCategories = await Http.request<Category[]>(apiUrl, 'GET');

            if (existingCategories.length === 0) {
                for (const title of categories) {
                    await Http.request<Category[]>(apiUrl, 'POST', { title });
                }
            }
        } catch (error) {
            console.error('Creating categories:', error);
            throw error;
        }
    }
}


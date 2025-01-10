import { Http } from "../services/http.js";
import { Validation } from "./base-class/validation.js";
import { DefaultCategoriesManager } from "../services/default_categories.js";
import { Auth } from "../services/auth.js";

export class Signup extends Validation {
    constructor(navigateTo) {
        super(navigateTo);
        this.fullNameInput = document.getElementById('fullName');
        this.confirmPasswordInput = document.getElementById('confirmPassword');
        // this.login = new Login(navigateTo);
    }

    initializeEventListeners() {
        this.form.addEventListener('submit', this.handleSubmit.bind(this));
    }

    handleSubmit(event) {
        event.preventDefault();
        this.form.classList.remove('was-validated');

        let isValid = true;
        isValid = this.validateField(this.fullNameInput, value => value.trim() !== '', 'Пожалуйста, введите полное имя') && isValid;
        isValid = this.validateEmail() && isValid;
        isValid = this.validatePassword() && isValid;
        isValid = this.validateField(this.confirmPasswordInput, value => value === this.passwordInput.value, 'Пароли не совпадают') && isValid;

        this.form.classList.add('was-validated');

        if (isValid) {
            this.submitForm({
                name: this.fullNameInput.value.trim(),
                email: this.emailInput.value.trim(),
                password: this.passwordInput.value,
                passwordRepeat: this.confirmPasswordInput.value
            });
        }
    }

    validateField(field, validationFn, errorMessage) {
        if (!validationFn(field.value)) {
            field.classList.add('is-invalid');
            field.setCustomValidity(errorMessage);
            return false;
        }
        field.classList.remove('is-invalid');
        field.classList.add('is-valid');
        field.setCustomValidity('');
        return true;
    }

    async submitForm(data) {
        try {
            // 1. Регистрация
            const signupPath = 'http://localhost:3000/api/signup';
            const signupResult = await Http.request(signupPath, 'POST', data, false);

            if (signupResult) {
                // 2. Автоматический логин
                const loginData = {
                    email: data.email,
                    password: data.password,
                    rememberMe: false
                };

                const loginPath = 'http://localhost:3000/api/login';
                const loginResult = await Http.request(loginPath, 'POST', loginData, false);

                if (loginResult && loginResult.tokens) {
                    const userInfo = {
                        id: loginResult.user.id,
                        name: loginResult.user.name,
                    };

                    // Сохраняем токены и информацию о пользователе
                    Auth.setTokens(loginResult.tokens.accessToken, loginResult.tokens.refreshToken);
                    Auth.setUserInfo(userInfo);

                    // 3. Создаем шаблонные категории
                    await Promise.all([
                        DefaultCategoriesManager.createIfEmpty(
                            'http://localhost:3000/api/categories/expense',
                            DefaultCategoriesManager.expenseCategories
                        ),
                        DefaultCategoriesManager.createIfEmpty(
                            'http://localhost:3000/api/categories/income',
                            DefaultCategoriesManager.incomeCategories
                        )
                    ]);

                    this.navigateToPath('/');
                }
            }
        } catch (error) {
            console.error('Ошибка при отправке:', error);
            alert('Произошла ошибка при регистрации. Пожалуйста, попробуйте позже.');
        }
    }
}


import {Auth} from "../../scripts/services/auth.js";
import {Http} from "../../scripts/services/http.js";
import {Validation} from "./base-class/validation.js";

export class Login extends Validation {
    constructor(navigateTo) {
        super(navigateTo);
        this.rememberMeElement = document.getElementById('rememberMe');
        Auth.initialize(navigateTo);
    }

    initializeEventListeners() {
        this.form.addEventListener('submit', this.handleSubmit.bind(this));
    }

    handleSubmit(event) {
        event.preventDefault();
        this.form.classList.remove('was-validated');

        const isValid = this.validateEmail() && this.validatePassword();
        this.form.classList.add('was-validated');

        if (isValid) {
            this.submitForm();
        }
    }

    jumpIntoApp() {
        this.navigateToPath('/analytics');
    }

    async submitForm() {
        const emailValue = this.emailInput.value.trim();
        const passwordValue = this.passwordInput.value;

        try {
            const dataObject = {
                email: emailValue,
                password: passwordValue,
                rememberMe: this.rememberMeElement.checked,
            };

            const path = 'http://localhost:3000/api/login';
            // Указываем false для requiresAuth
            const result = await Http.request(path, 'POST', dataObject, false);

            const userInfo = {
                id: result.user.id,
                name: result.user.name,
            }

            Auth.setTokens(result.tokens.accessToken, result.tokens.refreshToken);
            Auth.setUserInfo(userInfo);
            this.jumpIntoApp();
        } catch (error) {
            console.error('Ошибка при отправке:', error);
            // Здесь можно добавить обработку ошибки для пользователя
            // например, показать сообщение о неверном логине/пароле
        }
    }
}


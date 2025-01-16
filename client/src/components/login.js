import { Validation } from "./base-class/validation.js";
import { Auth } from "../services/auth.js";
import { Http } from "../services/http.js";

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
        this.navigateToPath('/');
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
            
            const statusMatch = error.message.match(/HTTP: (\d+)/);
            if (statusMatch.length !== 0 && parseInt(statusMatch[1]) === 401) {
                alert('Пользователь с такими данными не зарегистрирован');
            }

            if (error.toString().includes('email or password')) {
                alert('Неверная электронная почта или пароль');
                return;
            }

            alert('Произошла ошибка при входе. Пожалуйста, попробуйте позже.');
        }
    }
}


import {Auth} from "../../scripts/services/auth.js";
import {Http} from "../../scripts/services/http.js";
import {Validation} from "../../scripts/base-class/validation.js";

export class Login {
    constructor() {
        this.form = document.getElementById('registrationForm');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    }

    init() {
        this.initEventListeners();
    }

    initEventListeners() {
        this.form.addEventListener('submit', this.handleSubmit.bind(this));
    }

    handleSubmit(event) {
        event.preventDefault();
        this.form.classList.remove('was-validated');

        const isValid = this.validateForm();
        this.form.classList.add('was-validated');

        if (isValid) {
            this.submitForm();
        }
    }

    validateForm() {
        let isValid = true;

        // Валидация email
        if (!this.emailRegex.test(this.emailInput.value.trim())) {
            this.markInputAsInvalid(this.emailInput);
            isValid = false;
        } else {
            this.markInputAsValid(this.emailInput);
        }

        // Валидация пароля
        if (this.passwordInput.value.length < 6) {
            this.markInputAsInvalid(this.passwordInput);
            isValid = false;
        } else {
            this.markInputAsValid(this.passwordInput);
        }

        return isValid;
    }

    markInputAsInvalid(inputElement) {
        inputElement.classList.remove('is-valid');
        inputElement.classList.add('is-invalid');
    }

    markInputAsValid(inputElement) {
        inputElement.classList.remove('is-invalid');
        inputElement.classList.add('is-valid');
    }

    async submitForm() {
        const emailValue = this.emailInput.value.trim();
        const passwordValue = this.passwordInput.value;

        try {
            const dataObject = {
                email: emailValue,
                password: passwordValue,
                rememberMe: true
            };

            const path = 'http://localhost:3000/api/login';
            const result = await Http.response(path, dataObject);

            Auth.setTokens(result.tokens.accessToken, result.tokens.refreshToken);
            Auth.setUserInfo({email: emailValue, password: passwordValue});

           Validation.jumpIntoApp();
        } catch (error) {
            console.error('Ошибка при отправке:', error);
        }
    }
}
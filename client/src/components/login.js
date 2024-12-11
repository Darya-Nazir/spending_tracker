import {Auth} from "../../scripts/services/auth.js";
import {Http} from "../../scripts/services/http.js";
import {Validation} from "../../scripts/base-class/validation.js";

export class Login extends Validation {
    constructor(navigateTo) {
        super(navigateTo);
        this.rememberMeElement = document.getElementById('rememberMe');
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
            const result = await Http.response(path, dataObject);

            Auth.setTokens(result.tokens.accessToken, result.tokens.refreshToken);
            Auth.setUserInfo({email: emailValue, password: passwordValue});
            console.log('Everything all right!');
            this.jumpIntoApp();
        } catch (error) {
            console.error('Ошибка при отправке:', error);
        }
    }
}
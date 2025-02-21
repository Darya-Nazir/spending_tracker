import { Http } from "../services/http.js";
import { Validation } from "./base-class/validation.js";
import { DefaultCategoriesManager } from "../services/default-categories.js";

export class Signup extends Validation {
    constructor(navigateTo) {
        super(navigateTo);
        this.fullNameInput = document.getElementById('fullName');
        this.confirmPasswordInput = document.getElementById('confirmPassword');
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
            const signupPath = 'http://localhost:3000/api/signup';
            const signupResult = await Http.request(signupPath, 'POST', data, false);

            if (signupResult) {
                const loginData = {
                    email: data.email,
                    password: data.password,
                    rememberMe: false
                };

                const loginSuccess = await DefaultCategoriesManager.processLogin(loginData);

                if (loginSuccess) {
                    await DefaultCategoriesManager.setupDefaultCategories();
                    this.navigateToPath('/');
                }
            }
        } catch (error) {
            console.error('Ошибка при отправке:', error);
            alert('Произошла ошибка при регистрации. Пожалуйста, попробуйте позже.');
        }
    }
}


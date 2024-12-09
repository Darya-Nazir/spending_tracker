export class Validation {
    constructor() {
        this.form = document.getElementById('registrationForm');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    }
    static init() {
        this.initializeEventListeners();
        this.validateForm();
    }

    static initializeEventListeners() {
        if (!this.form) {
            console.error(`Форма не найдена`);
            return;
        }
    }

    static validateForm() {
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
    static markInputAsInvalid(inputElement) {
        inputElement.classList.remove('is-valid');
        inputElement.classList.add('is-invalid');
    }

    static markInputAsValid(inputElement) {
        inputElement.classList.remove('is-invalid');
        inputElement.classList.add('is-valid');
    }

    static jumpIntoApp() {
        window.location.href = '/analytics';
    }
}
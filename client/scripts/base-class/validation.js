export class Validation {
    constructor() {
        this.form = document.getElementById('registrationForm');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    }

    init() {
        if (this.form) {
            this.initializeEventListeners();
        }
    }

    initializeEventListeners() {
        // Метод для наследования, можно переопределить в дочерних классах
    }

    validateEmail() {
        if (!this.emailRegex.test(this.emailInput.value.trim())) {
            this.markInputAsInvalid(this.emailInput);
            return false;
        }
        this.markInputAsValid(this.emailInput);
        return true;
    }

    validatePassword(minLength = 6) {
        if (this.passwordInput.value.length < minLength) {
            this.markInputAsInvalid(this.passwordInput);
            return false;
        }
        this.markInputAsValid(this.passwordInput);
        return true;
    }

    markInputAsInvalid(inputElement) {
        inputElement.classList.remove('is-valid');
        inputElement.classList.add('is-invalid');
    }

    markInputAsValid(inputElement) {
        inputElement.classList.remove('is-invalid');
        inputElement.classList.add('is-valid');
    }

    jumpIntoApp() {
        window.location.href = '/analytics';
    }
}
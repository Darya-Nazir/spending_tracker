import {Auth} from "../../scripts/services/auth";
import {Http} from "../../scripts/services/http.js";
import {Validation} from "../../scripts/base-class/validation";



export class Signup {
    form = null;

    constructor() {
        this.form = document.getElementById('registrationForm');
    }

    init() {
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        if (!this.form) {
            console.error(`Форма не найдена`);
            return;
        }

        this.form.addEventListener('submit', async (event) => {
            event.preventDefault();
            this.validateAndSubmit();
        });
    }

    validateAndSubmit() {
        // Получаем все поля формы
        const fullName = document.getElementById('fullName');
        const email = document.getElementById('email');
        const password = document.getElementById('password');
        const confirmPassword = document.getElementById('confirmPassword');

        // Убираем предыдущие состояния валидации
        this.form.classList.remove('was-validated');

        // Флаг валидности формы
        let isValid = true;

        // Валидация ФИО
        isValid = this.validateField(fullName,
            value => value.trim() !== '',
            'Пожалуйста, введите полное имя'
        ) && isValid;

        // Валидация email
        isValid = this.validateField(email,
            value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()),
            'Пожалуйста, введите корректный email'
        ) && isValid;

        // Валидация пароля
        isValid = this.validateField(password,
            value => value.length >= 6,
            'Пароль должен содержать не менее 6 символов'
        ) && isValid;

        // Валидация подтверждения пароля
        isValid = this.validateField(confirmPassword,
            value => value === password.value,
            'Пароли не совпадают'
        ) && isValid;

        // Добавляем класс для визуализации валидации
        this.form.classList.add('was-validated');

        // Если форма валидна, отправляем данные
        if (isValid) {
            this.submitForm({
                name: fullName.value.trim(),
                email: email.value.trim(),
                password: password.value,
                passwordRepeat: confirmPassword.value
            });
        }
    }

    validateField(field, validationFn, errorMessage) {
        if (!validationFn(field.value)) {
            field.classList.add('is-invalid');
            // Можно добавить вывод пользовательского сообщения об ошибке
            return false;
        } else {
            field.classList.remove('is-invalid');
            field.classList.add('is-valid');
            return true;
        }
    }

    async submitForm(data) {
        try {
            const path = 'http://localhost:3000/api/signup';
            const result = await Http.response(path, data);

            if (result) {
                Validation.jumpIntoApp();
            }

        } catch (error) {
            console.error('Ошибка при отправке:', error);
        }
    }
}


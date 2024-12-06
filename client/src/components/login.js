import {Auth} from "../../scripts/services/auth.js";

// const form = document.getElementById('registrationForm');
// form.addEventListener('submit', async function (event) {
//     event.preventDefault();
//
//     // Получаем все поля формы
//     const email = document.getElementById('email');
//     const password = document.getElementById('password');
//
//     // Убираем предыдущие ошибки
//     this.classList.remove('was-validated');
//
//     // Проверяем валидность каждого поля
//     let isValid = true;
//
//     // Проверка email
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(email.value.trim())) {
//         isValid = false;
//         email.classList.add('is-invalid');
//     } else {
//         email.classList.remove('is-invalid');
//         email.classList.add('is-valid');
//     }
//
//     // Проверка пароля
//     if (password.value.length < 6) {
//         isValid = false;
//         password.classList.add('is-invalid');
//     } else {
//         password.classList.remove('is-invalid');
//         password.classList.add('is-valid');
//     }
//
//     // Добавляем класс was-validated для отображения состояния валидации
//     this.classList.add('was-validated');
//
//     // Если форма валидна, можно отправлять данные
//
//     const emailValue = email.value.trim();
//         const passwordValue = password.value;
//
//     if (isValid) {
//
//         try {
//             const dataObject = {
//                 email: emailValue,
//                 password: passwordValue,
//                 rememberMe: true
//             };
//
//             const response = await fetch('http://localhost:3000/api/login', {
//                 method: 'POST',
//                 body: JSON.stringify(dataObject),
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Accept': 'application/json'
//                 }
//             });
//
//             if (!response.ok) {
//                 const errorData = await response.json();
//                 console.error('Ошибка:', errorData);
//                 return;
//             }
//             const result = await response.json();
//             console.log('Успешно:', result);
//
//             console.log(result);
//             Auth.setTokens(result.tokens.accessToken, result.tokens.refreshToken);
//             Auth.setUserInfo({
//                 email: emailValue,
//                 password: passwordValue
//             });
//
//         } catch (error) {
//             console.error('Ошибка при отправке:', error);
//         }
//     }
// });

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

            const response = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                body: JSON.stringify(dataObject),
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Ошибка:', errorData);
                return;
            }

            const result = await response.json();
            console.log('Успешно:', result);

            Auth.setTokens(result.tokens.accessToken, result.tokens.refreshToken);
            Auth.setUserInfo({email: emailValue, password: passwordValue});

            this.jumpIntoApp();
        } catch (error) {
            console.error('Ошибка при отправке:', error);
        }
    }
    jumpIntoApp() {
        window.location.href = '/costs';
    }
}
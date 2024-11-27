import {Auth} from "../../scripts/services/auth";


// const form = document.getElementById('registrationForm');
//
// // if (form) {
// //     return;
// // }
//     form.addEventListener('submit', async function (event) {
//     event.preventDefault();
//
//     // Получаем все поля формы
//     const fullName = document.getElementById('fullName');
//     const email = document.getElementById('email');
//     const password = document.getElementById('password');
//     const confirmPassword = document.getElementById('confirmPassword');
//
//     // Убираем предыдущие ошибки
//     this.classList.remove('was-validated');
//
//     // Проверяем валидность каждого поля
//     let isValid = true;
//
//     // Проверка ФИО
//     if (!fullName.value.trim()) {
//         isValid = false;
//         fullName.classList.add('is-invalid');
//     } else {
//         fullName.classList.remove('is-invalid');
//         fullName.classList.add('is-valid');
//     }
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
//     // Проверка подтверждения пароля
//     if (password.value !== confirmPassword.value) {
//         isValid = false;
//         confirmPassword.classList.add('is-invalid');
//     } else {
//         confirmPassword.classList.remove('is-invalid');
//         confirmPassword.classList.add('is-valid');
//     }
//
//     // Добавляем класс was-validated для отображения состояния валидации
//     this.classList.add('was-validated');
//
//     // Если форма валидна, можно отправлять данные
//     if (isValid) {
//         const dataObject = {
//             name: fullName.value.trim(),
//             email: email.value.trim(),
//             password: password.value,
//             passwordRepeat: confirmPassword.value
//         };
//
//         try {
//             const response = await fetch('http://localhost:3000/api/signup', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Accept': 'application/json'
//                 },
//                 body: JSON.stringify(dataObject)
//             });
//
//             if (!response.ok) {
//                 const errorData = await response.json();
//                 console.error('Ошибка:', errorData);
//             } else {
//                 const result = await response.json();
//                 console.log('Успешно:', result);
//             }
//         } catch (error) {
//             console.error('Ошибка при отправке:', error);
//         }
//     }
// });

export class Signup {
    constructor() {
        this.form = document.getElementById('registrationForm');

        if (!this.form) {
            console.error(`Форма не найдена`);
            return;
        }

        this.initializeEventListeners();
    }

    initializeEventListeners() {
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
            const response = await fetch('http://localhost:3000/api/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Ошибка:', errorData);
                // Можно добавить обработку ошибок, например, вывод сообщения пользователю
            } else {
                const result = await response.json();
                console.log('Успешно:', result);
                // Можно добавить обработку успешной регистрации, например, редирект
                this.jumpIntoApp();
            }
        } catch (error) {
            console.error('Ошибка при отправке:', error);
        }
    }
    jumpIntoApp() {
        window.location.href = '/costs';
    }
}


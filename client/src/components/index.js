import {Auth} from "./services/auth.js";

const form = document.getElementById('registrationForm');
form.addEventListener('submit', async function (event) {
    event.preventDefault();

    // Получаем все поля формы
    const email = document.getElementById('email');
    const password = document.getElementById('password');

    // Убираем предыдущие ошибки
    this.classList.remove('was-validated');

    // Проверяем валидность каждого поля
    let isValid = true;

    // Проверка email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.value.trim())) {
        isValid = false;
        email.classList.add('is-invalid');
    } else {
        email.classList.remove('is-invalid');
        email.classList.add('is-valid');
    }

    // Проверка пароля
    if (password.value.length < 6) {
        isValid = false;
        password.classList.add('is-invalid');
    } else {
        password.classList.remove('is-invalid');
        password.classList.add('is-valid');
    }

    // Добавляем класс was-validated для отображения состояния валидации
    this.classList.add('was-validated');

    // Если форма валидна, можно отправлять данные

    const emailValue = email.value.trim();
        const passwordValue = password.value;

    if (isValid) {

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

            console.log(result);
            Auth.setTokens(result.tokens.accessToken, result.tokens.refreshToken);
            Auth.setUserInfo({
                email: emailValue,
                password: passwordValue
            });

        } catch (error) {
            console.error('Ошибка при отправке:', error);
        }
    }
});


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
    if (isValid) {
        try {
            const dataObject = {
                email: email.value.trim(),
                password: password.value,
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
            } else {
                const result = await response.json();
                console.log('Успешно:', result);
            }

        } catch (error) {
            console.error('Ошибка при отправке:', error);
        }
    }
});


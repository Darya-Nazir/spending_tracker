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
        console.log('Форма валидна, можно отправлять');

        // Создаем объект formData с данными из формы
        const formData = new FormData(form);

        // Создаем объект с данными из formData
        const dataObject = Object.fromEntries(formData.entries());
        console.log(dataObject);

        // Отправляем данные на сервер
        const response = await fetch('https://webhook.site/7a62e4f2-8643-49d1-92f7-2d8d90b1e667', {
            method: 'POST',
            body: JSON.stringify(dataObject),
            mode: "no-cors",
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        })
        console.log(response)
    }
});

// Переписать fetch на асинк-эвейт.
//     Из formData надо достать данные и положить их в объект для отправки.
//     Посмотреть, как Роман отправляет.
document.getElementById('registrationForm').addEventListener('submit', function(event) {
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
        // Здесь можно добавить код для отправки формы
        const formData = new FormData(this);

        fetch('https://webhook.site/7a62e4f2-8643-49d1-92f7-2d8d90b1e667', {
            method: 'POST',
            body: formData,
            mode: 'no-cors',
            headers: {
                "Content-Type": "application/json",
            }
        })
            .then(response => {
                if (response.status === 200) {
                    console.log('Данные успешно отправлены');
                } else {
                    console.error('Ошибка отправки данных', response);
                }
                console.log(formData)
            })
            .catch(error => console.error('Ошибка:', error));

    }
});

// Переписать fetch на асинк-эвейт.
//     Из formData надо достать данные и положить их в объект для отправки.
//     Посмотреть, как Роман отправляет.
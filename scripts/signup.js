document.getElementById('registrationForm').addEventListener('submit', function(event) {
    event.preventDefault();

    // Получаем все поля формы
    const fullName = document.getElementById('fullName');
    const email = document.getElementById('email');
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirmPassword');

    // Убираем предыдущие ошибки
    this.classList.remove('was-validated');

    // Проверяем валидность каждого поля
    let isValid = true;

    // Проверка ФИО
    if (!fullName.value.trim()) {
        isValid = false;
        fullName.classList.add('is-invalid');
    } else {
        fullName.classList.remove('is-invalid');
        fullName.classList.add('is-valid');
    }

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

    // Проверка подтверждения пароля
    if (password.value !== confirmPassword.value) {
        isValid = false;
        confirmPassword.classList.add('is-invalid');
    } else {
        confirmPassword.classList.remove('is-invalid');
        confirmPassword.classList.add('is-valid');
    }

    // Добавляем класс was-validated для отображения состояния валидации
    this.classList.add('was-validated');

    // Если форма валидна, можно отправлять данные
    if (isValid) {
        console.log('Форма валидна, можно отправлять');
        // Здесь можно добавить код для отправки формы
    }
});


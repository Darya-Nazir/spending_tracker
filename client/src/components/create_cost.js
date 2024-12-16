import {Auth} from "../../scripts/services/auth.js";

export class NewCost {
    constructor(navigateTo) {
        this.navigateToPath = navigateTo;
        this.categoryName = null;

    }
    init() {
        this. addCategoryConfirmListener();
        this.cancelCategoryButtonListener();
    }
    addCategoryConfirmListener() {
        // debugger;
        document.getElementById('create').addEventListener('click', async (event) => {
            event.preventDefault(); // Предотвращаем отправку формы

            const input = document.querySelector('.form-control');
            this.categoryName = input.value.trim();

            if (this.categoryName === '') {
                alert('Введите название категории!');
                return;
            }

            // Получаем accessToken из localStorage
            const accessToken = localStorage.getItem(Auth.accessTokenKey);

            if (!accessToken) {
                alert('Вы не авторизованы! Пожалуйста, войдите в систему.');
                return;
            }

            try {
                const response = await fetch('http://localhost:3000/api/categories/expense', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`, // Добавляем accessToken в заголовок Authorization
                    },
                    body: JSON.stringify({ title: this.categoryName}), // Тело запроса
                });

                if (!response.ok) {
                    throw new Error('Ошибка при добавлении категории');
                }

                // Если категория успешно добавлена, переходим на страницу создания затрат
                console.log(response)
                // this.navigateToPath('/costs');

            } catch (error) {
                console.error('Ошибка при отправке запроса:', error);
                alert('Не удалось добавить категорию. Попробуйте еще раз.');
            }
        });
    }

    cancelCategoryButtonListener() {
        document.getElementById('cancel').addEventListener('click', (event) => {
            event.preventDefault(); // Предотвращаем стандартное поведение кнопки
            this.navigateToPath('/costs');
        });
    }
}


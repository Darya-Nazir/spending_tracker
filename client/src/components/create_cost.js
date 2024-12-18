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
        document.getElementById('create').addEventListener('click', async (event) => {
            event.preventDefault(); // Предотвращаем отправку формы

            const input = document.querySelector('.form-control');
            this.categoryName = input.value.trim();

            if (this.categoryName === '') {
                alert('Введите название категории!');
                return;
            }

            // Получаем accessToken из localStorage
            const accessToken = localStorage.getItem('accessToken');
            // const accessToken = tokens?.accessToken;

            if (accessToken === 'undefined') {
                Auth.processUnauthorizedResponse(this.navigateToPath);
                // alert('Вы не авторизованы! Пожалуйста, войдите в систему.');
                // return;
            }

            try {
                debugger;
                const response = await fetch('http://localhost:3000/api/categories/expense', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`, // Добавляем accessToken в заголовок Authorization
                    },
                    body: JSON.stringify({ title: this.categoryName}), // Тело запроса
                });

                const jsonResponse = await response.json();

                if (!response.ok) {
                    throw new Error(jsonResponse.message);
                }

                // Если категория успешно добавлена, переходим на страницу создания затрат
                this.navigateToPath('/costs');

            } catch (error) {
                console.error('Category addition: ', error);
                alert('Не удалось добавить категорию, попробуйте еще раз. ' +
                    'Если категория уже существует, она не будет добавлена.');
            }
        });
    }

    cancelCategoryButtonListener() {
        document.getElementById('cancel').addEventListener('click', (event) => {
            event.preventDefault();
            this.navigateToPath('/costs');
        });
    }
}


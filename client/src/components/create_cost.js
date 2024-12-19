import {Auth} from "../../scripts/services/auth.js";

export class NewCost {
    constructor(navigateTo) {
        this.navigateToPath = navigateTo;
    }

    init() {
        this.addCategoryConfirmListener();
        this.cancelCategoryButtonListener();
    }

    addCategoryConfirmListener() {
        document.getElementById('create').addEventListener('click',
            (event) => this.handleCategoryCreation(event));
    }

    async handleCategoryCreation(event) {
        event.preventDefault(); // Предотвращаем отправку формы

        const categoryName = this.getCategoryName();
        if (!categoryName) {
            alert('Введите название категории!');
            return;
        }

        try {
            const accessToken = this.getAccessToken();
            let response = await this.sendCategoryToServer(categoryName, accessToken);

            if (response.status === 401) {
                console.log('Going to get a new token')
                await this.handleUnauthorizedAccess();

                // Получаем новый токен после обработки неавторизованного доступа
                const newAccessToken = this.getAccessToken();

                // После обновления токена повторно отправляем запрос
                if (newAccessToken) {
                    response = await this.sendCategoryToServer(categoryName, newAccessToken);
                } else {
                    throw new Error('Не удалось получить новый токен.');
                }
            }

            const jsonResponse = await response.json();
            if (!response.ok) {
                throw new Error(jsonResponse.message);
            }

            this.navigateToPath('/costs'); // Успешное добавление
        } catch (error) {
            this.handleCategoryCreationError(error);
        }
    }

    getCategoryName() {
        const input = document.querySelector('.form-control');
        return input.value.trim();
    }

    getAccessToken() {
        return localStorage.getItem('accessToken');
    }

    async sendCategoryToServer(categoryName, accessToken) {
        return await fetch('http://localhost:3000/api/categories/expense', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({title: categoryName}),
        });
    }

    async handleUnauthorizedAccess() {
        await Auth.processUnauthorizedResponse(this.navigateToPath);
    }

    handleCategoryCreationError(error) {
        console.error('Category addition: ', error);
        alert('Не удалось добавить категорию, попробуйте еще раз. ' +
            'Если категория уже существует, она не будет добавлена.');
    }

    cancelCategoryButtonListener() {
        document.getElementById('cancel').addEventListener('click', (event) => {
            event.preventDefault();
            this.navigateToPath('/costs');
        });
    }
}


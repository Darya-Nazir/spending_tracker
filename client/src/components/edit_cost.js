import { Http } from "../../scripts/services/http.js";

export class EditCost {
    constructor(navigateTo) {
        this.navigateToPath = navigateTo;
        this.apiUrl = 'http://localhost:3000/api/categories/expense'; // Базовый URL API
    }

    async init() {
        const categoryId = this.getCategoryIdFromUrl();
        if (!categoryId) {
            alert('Идентификатор категории не найден!');
            this.navigateToPath('/costs');
            return;
        }

        this.categoryId = categoryId;
        await this.loadCategoryData(categoryId);
        this.saveCategoryButtonListener();
        this.cancelCategoryButtonListener();
    }

    getCategoryIdFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('id'); // Извлекаем ID из URL
    }

    async loadCategoryData(categoryId) {
        try {
            const category = await Http.request(`${this.apiUrl}/${categoryId}`, 'GET');
            this.fillFormWithCategoryData(category);
        } catch (error) {
            console.error('Error loading category data:', error);
            alert('Не удалось загрузить данные категории!');
            this.navigateToPath('/costs');
        }
    }

    fillFormWithCategoryData(category) {
        const input = document.querySelector('.form-control');
        input.value = category.title; // Заполняем поле ввода текущим названием категории
    }

    saveCategoryButtonListener() {
        document.getElementById('save').addEventListener('click', (event) => {
            this.handleCategoryEdit(event);
        });
    }

    async handleCategoryEdit(event) {
        event.preventDefault(); // Предотвращаем отправку формы

        const updatedName = this.getCategoryName();
        if (!updatedName) {
            alert('Введите название категории!');
            return;
        }

        try {
            await Http.request(
                `${this.apiUrl}/${this.categoryId}`,
                'PUT',
                { title: updatedName }
            );

            this.navigateToPath('/costs'); // Успешное редактирование
        } catch (error) {
            this.handleCategoryEditError(error);
        }
    }

    getCategoryName() {
        const input = document.querySelector('.form-control');
        return input.value.trim();
    }

    handleCategoryEditError(error) {
        console.error('Category editing: ', error);
        alert('Не удалось обновить категорию, попробуйте еще раз.');
    }

    cancelCategoryButtonListener() {
        document.getElementById('cancel').addEventListener('click', (event) => {
            event.preventDefault();
            this.navigateToPath('/costs');
        });
    }
}


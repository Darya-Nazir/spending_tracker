import {Http} from "../../../scripts/services/http.js";

export class EditCard {
    constructor(navigateTo, apiUrl, redirectPath) {
        this.navigateToPath = navigateTo;
        this.apiUrl = apiUrl; // Базовый URL API
        this.redirectPath = redirectPath; // Путь перенаправления после действий
    }

    async init() {
        const categoryId = this.getCategoryIdFromUrl();
        if (!categoryId) {
            alert('Идентификатор категории не найден!');
            this.navigateToPath(this.redirectPath);
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
            this.navigateToPath(this.redirectPath);
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

            this.navigateToPath(this.redirectPath); // Успешное редактирование
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
            this.navigateToPath(this.redirectPath);
        });
    }
}


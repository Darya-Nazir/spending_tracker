import { Http } from "../../services/http.js";

export class New_card {
    constructor(navigateTo, apiUrl, redirectPath) {
        this.navigateToPath = navigateTo;
        this.apiUrl = apiUrl;
        this.redirectPath = redirectPath;
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
            await Http.request(this.apiUrl, 'POST', { title: categoryName });
            this.navigateToPath(this.redirectPath); // Успешное добавление
        } catch (error) {
            this.handleCategoryCreationError(error);
        }
    }

    getCategoryName() {
        const input = document.querySelector('.form-control');
        return input.value.trim();
    }

    handleCategoryCreationError(error) {
        if (error.toString().includes('already exist')) {
            alert('Такая категория уже существует');
            return;
        }
        alert('Не удалось добавить категорию, попробуйте еще раз.');
    }

    cancelCategoryButtonListener() {
        document.getElementById('cancel').addEventListener('click', (event) => {
            event.preventDefault();
            this.navigateToPath(this.redirectPath);
        });
    }
}


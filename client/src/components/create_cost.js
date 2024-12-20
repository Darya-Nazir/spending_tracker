import {Auth} from "../../scripts/services/auth.js";
import {Http} from "../../scripts/services/http.js";

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
            const response = await Http.request(
                'http://localhost:3000/api/categories/expense',
                'POST',
                { title: categoryName }
            );

            this.navigateToPath('/costs'); // Успешное добавление
        } catch (error) {
            this.handleCategoryCreationError(error);
        }
    }

    getCategoryName() {
        const input = document.querySelector('.form-control');
        return input.value.trim();
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


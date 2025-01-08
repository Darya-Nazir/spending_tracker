import { CardPage } from "./base-class/card-page.js";

export class Incomes extends CardPage {
    constructor(navigateTo) {
        const defaultCategories = [
            'Депозиты',
            'Зарплата',
            'Сбережения',
            'Инвестиции'
        ];

        super(
            navigateTo,
            'incomesContainer',
            'http://localhost:3000/api/categories/income',
            '/create-income',
            '/edit-income',
            defaultCategories
        );
    }

    highlightPage() {
        const categoriesElement = document.getElementById('dropdownMenuButton1');
        const revenuesElement = document.getElementById('revenuesPage');

        categoriesElement.classList.add('btn-primary', 'text-white');
        revenuesElement.classList.add('bg-primary', 'text-white');
    }
}


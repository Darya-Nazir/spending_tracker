import { Card_page } from "./base-class/card_page.js";

export class Incomes extends Card_page {
    constructor(navigateTo) {
        super(
            navigateTo,
            'incomesContainer',
            'http://localhost:3000/api/categories/income',
            '/create-income',
            '/edit-income',
        );
    }

    highlightPage() {
        const categoriesElement = document.getElementById('dropdownMenuButton1');
        const revenuesElement = document.getElementById('revenuesPage');

        categoriesElement.classList.add('btn-primary', 'text-white');
        revenuesElement.classList.add('bg-primary', 'text-white');
    }
}


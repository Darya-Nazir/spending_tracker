import { CardPage } from "./base-class/card-page.js";

export class Costs extends CardPage {
    constructor(navigateTo) {
        super(
            navigateTo,
            'costsContainer',
            'http://localhost:3000/api/categories/expense',
            '/create-cost',
            '/edit-cost'
        );
    }

    highlightPage() {
        const categoriesElement = document.getElementById('dropdownMenuButton1');
        const costsElement = document.getElementById('costsPage');

        categoriesElement.classList.add('btn-primary', 'text-white');
        costsElement.classList.add('bg-primary', 'text-white');
    }
}


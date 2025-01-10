import { Card_page } from "./base-class/card_page.js";

export class Costs extends Card_page {
    constructor(navigateTo) {
        super(
            navigateTo,
            'costsContainer',
            'http://localhost:3000/api/categories/expense',
            '/create-cost',
            '/edit-cost',
        );
    }

    highlightPage() {
        const categoriesElement = document.getElementById('dropdownMenuButton1');
        const costsElement = document.getElementById('costsPage');

        categoriesElement.classList.add('btn-primary', 'text-white');
        costsElement.classList.add('bg-primary', 'text-white');
    }
}


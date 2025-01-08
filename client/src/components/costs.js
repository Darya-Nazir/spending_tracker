import { CardPage } from "./base-class/card-page.js";

export class Costs extends CardPage {
    constructor(navigateTo) {
        const defaultCategories = [
            'Еда',
            'Жильё',
            'Здоровье',
            'Кафе',
            'Авто',
            'Одежда',
            'Развлечения',
            'Счета',
            'Спорт'
        ];

        super(
            navigateTo,
            'costsContainer',
            'http://localhost:3000/api/categories/expense',
            '/create-cost',
            '/edit-cost',
            defaultCategories
        );
    }

    highlightPage() {
        const categoriesElement = document.getElementById('dropdownMenuButton1');
        const costsElement = document.getElementById('costsPage');

        categoriesElement.classList.add('btn-primary', 'text-white');
        costsElement.classList.add('bg-primary', 'text-white');
    }
}


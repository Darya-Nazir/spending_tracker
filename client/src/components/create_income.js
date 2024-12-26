import {NewCard} from "./base-class/new-card.js";

export class NewIncome extends NewCard {
    constructor(navigateTo) {
        super(navigateTo, 'http://localhost:3000/api/categories/income', '/incomes');
    }
}


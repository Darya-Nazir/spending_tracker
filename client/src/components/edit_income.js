import {EditCard} from "./base-class/edit-card.js";

export class EditIncome extends EditCard {
    constructor(navigateTo) {
        super(navigateTo, 'http://localhost:3000/api/categories/income', '/incomes');
    }
}


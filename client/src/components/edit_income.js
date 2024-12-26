import {ModifiedCard} from "./base-class/modified-card.js";

export class EditIncome extends ModifiedCard {
    constructor(navigateTo) {
        super(navigateTo, 'http://localhost:3000/api/categories/income', '/incomes');
    }
}


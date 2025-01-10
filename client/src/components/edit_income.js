import { Edit_card } from "./base-class/edit_card.js";

export class EditIncome extends Edit_card {
    constructor(navigateTo) {
        super(navigateTo, 'http://localhost:3000/api/categories/income', '/incomes');
    }
}


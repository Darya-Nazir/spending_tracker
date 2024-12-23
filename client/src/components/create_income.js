import {Http} from "../../scripts/services/http.js";
import {NewCard} from "../../scripts/base-class/new-card.js";

export class NewIncome extends NewCard {
    constructor(navigateTo) {
        super(navigateTo, 'http://localhost:3000/api/categories/income', '/incomes');
    }
}


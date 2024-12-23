import {Http} from "../../scripts/services/http.js";
import {CreatingCard} from "../../scripts/base-class/creating-card.js";

export class NewIncome extends CreatingCard {
    constructor(navigateTo) {
        super(navigateTo, 'http://localhost:3000/api/categories/income', '/incomes');
    }
}


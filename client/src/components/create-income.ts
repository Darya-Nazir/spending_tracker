import { NewCard } from "./base-class/new-card.js";
import {RoutePath} from "../types/route-type";

export class NewIncome extends NewCard {
    constructor(navigateTo: (path: RoutePath) => void) {
        super(navigateTo, 'http://localhost:3000/api/categories/income', '/incomes');
    }
}


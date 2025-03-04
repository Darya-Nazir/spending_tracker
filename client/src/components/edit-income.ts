import { EditCard } from "./base-class/edit-card.js";
import {RoutePath} from "../types/route-type";

export class EditIncome extends EditCard {
    constructor(navigateTo: (path: RoutePath) => void) {
        super(navigateTo, 'http://localhost:3000/api/categories/income', '/incomes');
    }
}


import { New_card } from "./base-class/new_card.js";

export class NewCost extends New_card {
    constructor(navigateTo) {
        super(navigateTo, 'http://localhost:3000/api/categories/expense', '/costs');
    }
}


import {EditCard} from "./base-class/edit-card.js";

export class EditCost extends EditCard {
    constructor(navigateTo) {
        super(navigateTo, 'http://localhost:3000/api/categories/expense', '/costs');
    }
}


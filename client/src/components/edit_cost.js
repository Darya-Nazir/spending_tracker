import {ModifiedCard} from "../../scripts/base-class/modified-card.js";

export class EditCost extends ModifiedCard {
    constructor(navigateTo) {
        super(navigateTo, 'http://localhost:3000/api/categories/expense', '/costs');
    }
}


import {Unselect} from "../../scripts/services/unselect.js";

export class Costs {
    constructor() {
    }
    init() {
        new Unselect().init();
        this.selectCosts();
    }

    selectCosts() {
        const categoriesElement = document.getElementById('dropdownMenuButton1');
        const costsElement = document.getElementById('costsPage');

        categoriesElement.classList.add('btn-primary', 'text-white');
        costsElement.classList.add('bg-primary', 'text-white');
    }
}


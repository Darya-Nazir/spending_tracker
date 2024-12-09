import {Unselect} from "../../scripts/services/unselect.js";

export class Revenue {
    constructor() {
    }

    init() {
        new Unselect().init();
        this.selectRevenues();
    }

    selectRevenues() {
        const categoriesElement = document.getElementById('dropdownMenuButton1');
        const revenuesElement = document.getElementById('revenuesPage');

        categoriesElement.classList.add('btn-primary', 'text-white');
        revenuesElement.classList.add('bg-primary', 'text-white');
    }
}


import {Unselect} from "../../scripts/services/unselect.js";

export class Transaction {
    constructor() {
    }

    init() {
        new Unselect().init();
        this.selectTransactions();
    }

    selectTransactions() {
        document.getElementById('transactionsPage').classList.add('bg-primary', 'text-white');
    }
}


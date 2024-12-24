import {Unselect} from "../../scripts/services/unselect.js";

export class Transaction {
    constructor() {
    }

    init() {
        new Unselect().init();
        this.selectTransactions();
        this.turnOnDatePicker();
    }

    selectTransactions() {
        document.getElementById('transactionsPage').classList.add('bg-primary', 'text-white');
    }

    turnOnDatePicker() {
            $(document).ready(function(){
            $('.datepicker').datepicker({
                format: 'dd.mm.yyyy',
                language: 'ru',
                autoclose: true,
                todayHighlight: true
            });
        });
        console.log('DatePicker working')
    }
}


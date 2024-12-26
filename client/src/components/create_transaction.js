import {NewCard} from "./base-class/new-card.js";
import {Http} from "../../scripts/services/http.js";


export class NewTransaction extends NewCard {
    constructor(navigateTo) {
        super(
            navigateTo,
            'http://localhost:3000/api/operations',
            'transactions'
        );
        this.typeInput = document.querySelector('input[placeholder="Тип..."]');
        this.categoryInput = document.querySelector('input[placeholder="Категория..."]');
        this.amountInput = document.querySelector('input[placeholder="Сумма в $..."]');
        this.dateInput = document.querySelector('input[placeholder="Дата..."]');
        this.commentInput = document.querySelector('input[placeholder="Комментарий..."]');
        this.createButton = document.querySelector('.btn-success');
        this.cancelButton = document.querySelector('.btn-danger');
    }

    init() {
        this.setupDatePicker();
        this.addCreateTransactionListener();
        this.addCancelButtonListener();
    }

    setupDatePicker() {
        $(this.dateInput).datepicker({
            format: 'dd.mm.yyyy',
            language: 'ru',
            autoclose: true,
            todayHighlight: true
        });
    }

    addCreateTransactionListener() {
        this.createButton.addEventListener('click', (event) => this.handleTransactionCreation(event));
    }

    addCancelButtonListener() {
        this.cancelButton.addEventListener('click', () => {
            this.navigateToPath('transactions');
        });
    }

    async handleTransactionCreation(event) {
        event.preventDefault();

        const transactionData = this.getTransactionData();
        if (!this.validateTransactionData(transactionData)) {
            return;
        }

        try {
            await Http.request(this.apiUrl, 'POST', transactionData);
            this.navigateToPath('transactions');
        } catch (error) {
            this.handleTransactionCreationError(error);
        }
    }

    getTransactionData() {
        return {
            type: this.typeInput.value.toLowerCase(),
            amount: parseFloat(this.amountInput.value),
            date: this.formatDateForAPI(this.dateInput.value),
            comment: this.commentInput.value.trim(),
            category_id: parseInt(this.categoryInput.value) || null
        };
    }

    validateTransactionData(data) {
        if (!['income', 'expense'].includes(data.type)) {
            alert('Тип должен быть "income" или "expense"');
            return false;
        }

        if (isNaN(data.amount) || data.amount <= 0) {
            alert('Введите корректную сумму');
            return false;
        }

        if (!this.dateInput.value) {
            alert('Выберите дату');
            return false;
        }

        return true;
    }

    formatDateForAPI(dateString) {
        if (!dateString) return '';

        const parts = dateString.split('.');
        if (parts.length !== 3) return '';

        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    handleTransactionCreationError(error) {
        console.error('Transaction creation error:', error);
        alert('Не удалось создать операцию. Пожалуйста, проверьте введенные данные и попробуйте снова.');
    }
}


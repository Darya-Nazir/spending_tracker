import {Unselect} from "../../scripts/services/unselect.js";
import {CardPage} from "./base-class/card-page.js";
import {Http} from "../../scripts/services/http";

export class Transaction extends CardPage {
    constructor(navigateTo) {
        super(
            navigateTo,
            'transactionsTable',
            'http://localhost:3000/api/operations',
            '',
            ''
        );
        this.container = document.querySelector('.table tbody');
    }

    init() {
        new Unselect().init();
        this.highlightPage();
        this.turnOnDatePicker();
        this.renderTransactions();
        this.setupDeleteListener();
        this.redirectToCreateOperation();

    }

    highlightPage() {
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
    }

    async fetchTransactions() {
        return await Http.request(this.apiUrl + '?period=all&type=income', 'GET');
    }

    createTableRow(transaction) {
        const row = document.createElement('tr');
        row.dataset.id = transaction.id;

        const typeClass = transaction.type === 'income' ? 'text-success' : 'text-danger';
        const typeText = transaction.type === 'income' ? 'доход' : 'расход';

        row.innerHTML = `
            <td>${transaction.number}</td>
            <td class="${typeClass}">${typeText}</td>
            <td>${transaction.category || '-'}</td>
            <td>${transaction.amount}$</td>
            <td>${this.formatDate(transaction.date)}</td>
            <td><input type="text" class="form-control border-0" value="${transaction.comment || ''}"></td>
            <td>
                <button class="btn btn-sm btn-light me-1">
                    <i class="bi bi-pencil">
                        <img src="images/pen-icon.svg" alt="Pen icon">
                    </i>
                </button>
                <button class="btn btn-sm btn-light delete-transaction">
                    <i class="bi bi-trash">
                        <img src="images/trash-icon.svg" alt="Trash icon">
                    </i>
                </button>
            </td>
        `;

        return row;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    async renderTransactions() {
        try {
            const transactions = await this.fetchTransactions();

            // Сортируем операции по дате (по возрастанию)
            transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

            // Очищаем существующие строки в таблице
            this.container.innerHTML = '';

            // Присваиваем номера по порядку и создаём строки
            transactions.forEach((transaction, index) => {
                transaction.number = index + 1;
                const row = this.createTableRow(transaction);
                this.container.appendChild(row);
            });
        } catch (error) {
            console.error('Ошибка при загрузке транзакций:', error);
        }
    }

    setupDeleteListener() {
        let rowToDelete = null;
        let transactionIdToDelete = null;

        // Слушаем клики на таблице
        this.container.addEventListener('click', (event) => {
            const deleteButton = event.target.closest('.delete-transaction');
            if (!deleteButton) return;

            rowToDelete = deleteButton.closest('tr');
            transactionIdToDelete = rowToDelete.dataset.id;

            if (transactionIdToDelete) {
                const deleteModal = new bootstrap.Modal(document.getElementById('deleteCategoryModal'));
                deleteModal.show();
            }
        });

        // Обработчик подтверждения удаления
        const confirmButton = document.getElementById('confirmDeleteBtn');
        confirmButton.addEventListener('click', async () => {
            if (rowToDelete && transactionIdToDelete) {
                try {
                    await this.deleteTransaction(transactionIdToDelete);
                    rowToDelete.remove();
                    rowToDelete = null;
                    transactionIdToDelete = null;
                } catch (error) {
                    console.error('Ошибка при удалении операции:', error);
                }
            }
        });
    }

    async deleteTransaction(transactionId) {
        const url = `${this.apiUrl}/${transactionId}`;
        return await Http.request(url, 'DELETE');
    }
    redirectToCreateOperation() {
        const createIncomeButton = document.getElementById('createIncome');
        const createExpenseButton = document.getElementById('createExpense');

        createIncomeButton.addEventListener("click", () => {
            this.navigateToPath('create-transaction');
        })
        createExpenseButton.addEventListener("click", () => {
            this.navigateToPath('create-transaction');
        })
    }
}


import {Unselect} from "../../scripts/services/unselect.js";
import {Http} from "../../scripts/services/http";
import {Filter} from "../../scripts/services/filter.js";
import {BaseOperations} from "./base-class/base_operations.js";

export class Transaction extends BaseOperations {
    constructor(navigateTo) {
        super(navigateTo);
        document.querySelectorAll('.datepicker').forEach((input) => {
            this.datePickerManager.init(input);
        });
    }

    init() {
        new Unselect().init();
        this.highlightPage();
        this.renderTransactions();
        this.setupDeleteListener();
        this.redirectToCreateOperation();
        this.setupEditListener();
        this.updateBalance();
        this.filterOperations();
    }

    highlightPage() {
        document.getElementById('transactionsPage')
            .classList.add('bg-primary', 'text-white');
    }

    async fetchTransactions() {
        return await Http.request(this.apiUrl + '?period=all&type=income', 'GET');
    }

    async renderTransactions() {
        try {
            const transactions = await this.fetchTransactions();

            transactions.sort((a, b) => {
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                return dateA - dateB;
            });

            this.renderOperations(transactions);
        } catch (error) {
            console.error('Ошибка при загрузке транзакций:', error);
        }
    }

    setupDeleteListener() {
        let rowToDelete = null;
        let transactionIdToDelete = null;

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

        const confirmButton = document.getElementById('confirmDeleteBtn');
        confirmButton.addEventListener('click', async () => {
            if (rowToDelete && transactionIdToDelete) {
                try {
                    await this.deleteTransaction(transactionIdToDelete);
                    rowToDelete.remove();
                    rowToDelete = null;
                    transactionIdToDelete = null;
                } catch (error) {
                    console.error('Ошибка при подтверждении удаления:', error);
                }
            }
        });
    }

    async deleteTransaction(transactionId) {
        const url = `${this.apiUrl}/${transactionId}`;
        try {
            await Http.request(url, 'DELETE');
            await this.updateBalance();
        } catch (error) {
            console.error('Ошибка при удалении транзакции и обновлении баланса:', error);
        }
    }

    redirectToCreateOperation() {
        const createIncomeButton = document.getElementById('createIncome');
        const createExpenseButton = document.getElementById('createExpense');

        createIncomeButton.addEventListener("click", () => {
            this.navigateToPath('create-transaction?type=income');
        });

        createExpenseButton.addEventListener("click", () => {
            this.navigateToPath('create-transaction?type=expense');
        });
    }

    setupEditListener() {
        this.container.addEventListener('click', (event) => {
            const editButton = event.target.closest('.edit-transaction');
            if (!editButton) return;

            const row = editButton.closest('tr');
            const transactionId = row.dataset.id;

            if (transactionId) {
                this.navigateToPath(`edit-transaction?id=${transactionId}`);
            }
        });
    }

    filterOperations() {
        new Filter(this.navigateTo);
    }
}


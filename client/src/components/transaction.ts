import { Http } from "../services/http";
import { BaseOperations } from "./base-class/base-operations";
import { DefaultCategoriesManager } from "../services/default-categories";
import { Filter } from "../services/filter";
import { Unselect } from "../services/unselect";
import {RoutePath} from "../types/route-type";

export class Transaction extends BaseOperations {
    constructor(navigateTo: (path: RoutePath) => void) {
        super(navigateTo);
        document.querySelectorAll('.datepicker').forEach((input) => {
            this.datePickerManager.init(input);
        });
    }

    public init(): void {
        new Unselect().init();
        this.highlightPage();
        this.renderTransactions();
        this.setupDeleteListener();
        this.redirectToCreateOperation();
        this.setupEditListener();
        this.updateBalance();
        this.filterOperations();
    }

    private highlightPage(): void {
        document.getElementById('transactionsPage')
            .classList.add('bg-primary', 'text-white');
    }

    private async fetchTransactions(): Promise<> {
        return await Http.request(this.apiUrl + '?period=all&type=income', 'GET');
    }

    private async renderTransactions(): Promise<void> {
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

    private setupDeleteListener(): void {
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

    private async deleteTransaction(transactionId): Promise<void> {
        const url = `${this.apiUrl}/${transactionId}`;
        try {
            await Http.request(url, 'DELETE');
            await this.updateBalance();
        } catch (error) {
            console.error('Ошибка при удалении транзакции и обновлении баланса:', error);
        }
    }

    private redirectToCreateOperation(): void {
        const createIncomeButton = document.getElementById('createIncome');
        const createExpenseButton = document.getElementById('createExpense');

        createIncomeButton.addEventListener("click", async () => {
            await DefaultCategoriesManager.createIfEmpty(
                'http://localhost:3000/api/categories/income',
                DefaultCategoriesManager.incomeCategories
            );
            this.navigateToPath('create-transaction?type=income');
        });

        createExpenseButton.addEventListener("click", async () => {
            await DefaultCategoriesManager.createIfEmpty(
                'http://localhost:3000/api/categories/expense',
                DefaultCategoriesManager.expenseCategories
            );
            this.navigateToPath('create-transaction?type=expense');
        });
    }

    private setupEditListener(): void {
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

    private filterOperations(): void {
        new Filter(this.navigateTo);
    }
}


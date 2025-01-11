import { User } from "../user.js";
import { DatePickerManager } from "../../services/date-picker.js";

export class BaseOperations {
    constructor(navigateTo) {
        this.apiUrl = 'http://localhost:3000/api/operations';
        this.container = document.querySelector('.table tbody');
        this.datePickerManager = new DatePickerManager();
        this.balanceManager = new User(navigateTo);
        this.navigateTo = navigateTo;
    }

    navigateToPath(path) {
        this.navigateTo(path);
    }

    createTableRow(operation) {
        const row = document.createElement('tr');
        row.dataset.id = operation.id;

        const typeClass = operation.type === 'income' ? 'text-success' : 'text-danger';
        const typeText = operation.type === 'income' ? 'доход' : 'расход';

        const formattedDate = this.datePickerManager.formatDate(operation.date);

        row.innerHTML = `
            <td>${operation.number}</td>
            <td class="${typeClass}">${typeText}</td>
            <td>${operation.category || '-'}</td>
            <td>${operation.amount}$</td>
            <td><input type="text" class="datepicker form-control border-0" value="${formattedDate}" readonly></td>
            <td><input type="text" class="form-control border-0" value="${operation.comment || ''}"></td>
            <td>
                <button class="btn btn-sm btn-light me-1 edit-transaction">
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

    async updateBalance() {
        await this.balanceManager.showBalance();
    }

    renderOperations(operations) {
        if (!this.container) {
            if (typeof this.navigateTo === 'function') {
                this.navigateTo(operations);
            }
            return;
        }

        this.container.innerHTML = '';
        operations.forEach((operation, index) => {
            operation.number = index + 1;
            const row = this.createTableRow(operation);
            this.container.appendChild(row);

            const dateInput = row.querySelector('.datepicker');
            if (dateInput) {
                this.datePickerManager.init(dateInput);
            }
        });
    }
}


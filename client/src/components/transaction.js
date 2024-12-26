import {Unselect} from "../../scripts/services/unselect.js";
import {CardPage} from "./base-class/card-page.js";



export class Transaction extends CardPage {
    constructor() {
        // Вызываем конструктор родителя с нужными параметрами
        super(
            () => {}, // navigateTo не нужен для этой страницы
            'transactionsTable', // id контейнера с таблицей
            'http://localhost:3000/api/operations?period=all&type=income', // apiUrl
            // 'http://localhost:3000/api/operations', // apiUrl
            '', // addCategoryPath не нужен
            '' // editCategoryPath не нужен
        );

        this.container = document.querySelector('.table tbody');
    }

    init() {
        new Unselect().init();
        this.highlightPage();
        this.turnOnDatePicker();
        this.renderTransactions();
    }

    // Переопределяем метод из родительского класса
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

    // Используем родительский метод fetchCategories, но переименовываем для ясности
    async fetchTransactions() {
        return await this.fetchCategories();
    }

    createTableRow(transaction) {
        const row = document.createElement('tr');

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
                    <img src="images/trash-icon.svg" alt="Trash icon">
                </i>
            </button>
            <button class="btn btn-sm btn-light">
                <i class="bi bi-trash">
                    <img src="images/pen-icon.svg" alt="Pen icon">
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
                transaction.number = index + 1; // Присваиваем порядковый номер
                const row = this.createTableRow(transaction);
                this.container.appendChild(row);
            });
        } catch (error) {
            console.error('Ошибка при загрузке транзакций:', error);
        }
    }
}


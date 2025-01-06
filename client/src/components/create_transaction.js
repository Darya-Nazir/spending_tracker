import { NewCard } from "./base-class/new-card.js";
import { DatePickerManager } from "../services/datePicker.js";
import { Http } from "../services/http.js";


export class NewTransaction extends NewCard {
    constructor(navigateTo) {
        super(
            navigateTo,
            'http://localhost:3000/api/operations',
            'transactions'
        );

        // Инициализация всех элементов формы
        this.typeInput = document.querySelector('input[placeholder="Тип..."]');
        this.categoryInput = document.getElementById('categoryInput');
        this.amountInput = document.querySelector('input[placeholder="Сумма в $..."]');
        this.dateInput = document.querySelector('input[placeholder="Дата..."]');
        this.commentInput = document.querySelector('input[placeholder="Комментарий..."]');
        this.createButton = document.getElementById('create');
        this.cancelButton = document.getElementById('cancel');
        this.categoriesList = document.getElementById('categoriesList');

        this.datePickerManager = new DatePickerManager();
    }

    async init() {
        this.setInitialType();
        // this.setupDatePicker();
        this.datePickerManager.init(this.dateInput);
        await this.loadCategories();

        // Установка обработчиков событий
        this.createButton.addEventListener('click', (event) => this.handleTransactionCreation(event));
        this.cancelButton.addEventListener('click', () => this.handleCancel());
        this.categoryInput.addEventListener('focus', () => this.showCategories());
        this.categoryInput.addEventListener('blur', () => setTimeout(() => this.hideCategories(), 150));
    }

    // Обработка нажатия кнопки отмены
    handleCancel() {
        this.navigateToPath('transactions');
    }

    // Обработка создания новой транзакции
    async handleTransactionCreation(event) {
        event.preventDefault();

        const transactionData = this.getTransactionData();
        // console.log(transactionData);
        // return;
        if (!this.validateTransactionData(transactionData)) {
            return;
        }

        try {
            await Http.request(this.apiUrl, 'POST', transactionData);
            this.navigateToPath('transactions');
        } catch (error) {
            console.error('Ошибка создания транзакции:', error);
            alert('Не удалось создать операцию. Пожалуйста, проверьте введенные данные и попробуйте снова.');
        }
    }

    // Сбор данных из формы
    getTransactionData() {
        const typeMapping = {
            'Доход': 'income',
            'Расход': 'expense'
        };

        return {
            type: typeMapping[this.typeInput.value] || this.typeInput.value.toLowerCase(),
            amount: parseFloat(this.amountInput.value) || 0, // Указываем 0, если значение некорректное
            date: this.datePickerManager.formatDateForAPI(this.dateInput.value), // Форматируем дату для сервера
            comment: this.commentInput.value.trim() || '', // Указываем пустую строку, если комментарий не указан
            category_id: this.selectedCategoryId ? parseInt(this.selectedCategoryId, 10) : null // Приводим ID категории к числу
        };
    }

    // Валидация данных формы
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

        if (!this.selectedCategoryId) {
            alert('Выберите категорию');
            return false;
        }

        return true;
    }

    // Загрузка категорий с сервера
    async loadCategories() {
        const type = this.typeInput.value === 'Доход' ? 'income' : 'expense';
        const apiUrl = `http://localhost:3000/api/categories/${type}`;
        try {
            const categories = await Http.request(apiUrl, 'GET');
            this.renderCategories(categories);
        } catch (error) {
            console.error('Ошибка загрузки категорий:', error);
        }
    }

    // Отрисовка списка категорий
    renderCategories(categories) {
        this.categoriesList.innerHTML = categories.map(category => `
            <li>
                <button
                    type="button"
                    class="dropdown-item"
                    data-id="${category.id}">
                    ${category.title}
                </button>
            </li>
        `).join('');

        this.categoriesList.querySelectorAll('.dropdown-item')
            .forEach(item => {
                item.addEventListener('click', (event) => this.handleCategorySelect(event));
            });
    }

    // Обработка выбора категории
    handleCategorySelect(event) {
        const button = event.target;
        this.selectedCategoryId = button.getAttribute('data-id');
        this.categoryInput.value = button.textContent.trim();
        this.hideCategories();
    }

    // Показать список категорий
    showCategories() {
        this.categoriesList.style.display = 'block';
    }

    // Скрыть список категорий
    hideCategories() {
        this.categoriesList.style.display = 'none';
    }

    // Установка начального типа транзакции из URL
    setInitialType() {
        const urlParams = new URLSearchParams(window.location.search);
        const type = urlParams.get('type');

        if (type === 'income' || type === 'expense') {
            this.typeInput.value = type === 'income' ? 'Доход' : 'Расход';
            this.typeInput.readOnly = true;
            this.typeInput.style.backgroundColor = '#f8f9fa';
        }
    }

    // Форматирование даты для API
    formatDateForAPI(dateString) {
        if (!dateString) return '';
        const parts = dateString.split('.');
        if (parts.length !== 3) return '';
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    // Настройка выбора даты
    setupDatePicker() {
        $(this.dateInput).datepicker({
            format: 'dd.mm.yyyy',
            language: 'ru',
            autoclose: true,
            todayHighlight: true
        });
    }
}


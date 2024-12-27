import {EditCard} from "./base-class/edit-card.js";
import {Http} from "../../scripts/services/http.js";
export class EditTransaction extends EditCard {
    constructor(navigateTo) {
        super(
            navigateTo,
            'http://localhost:3000/api/operations',
            'transactions'
        );

        // Инициализируем элементы как null
        this.typeInput = null;
        this.categoryInput = null;
        this.amountInput = null;
        this.dateInput = null;
        this.commentInput = null;
        this.categoriesList = null;
        this.selectedCategoryId = null;
    }

    async init() {
        const transactionId = this.getCategoryIdFromUrl();
        if (!transactionId) {
            alert('Идентификатор транзакции не найден!');
            this.navigateToPath(this.redirectPath);
            return;
        }

        this.transactionId = transactionId;

        // Инициализация элементов формы после загрузки DOM
        if (!this.initializeFormElements()) {
            alert('Ошибка инициализации формы!');
            this.navigateToPath(this.redirectPath);
            return;
        }

        this.setupDatePicker();
        await this.loadTransactionData(transactionId);
        this.setupEventListeners();
        this.renderTypes(['income', 'expense']);
    }

    initializeFormElements() {
        try {
            this.typeInput = document.querySelector('input[name="type"]');
            this.categoryInput = document.querySelector('input[name="category"]');
            this.amountInput = document.querySelector('input[name="amount"]');
            this.dateInput = document.querySelector('input[name="date"]');
            this.commentInput = document.querySelector('input[name="comment"]');
            this.categoriesList = document.querySelector('.categories-list');
            this.saveButton = document.querySelector('button[type="submit"]');
            this.cancelButton = document.getElementById('cancel');
            this.typesList = document.querySelector('.type-list');

            // Проверяем, что все необходимые элементы найдены
            return !!(this.typeInput && this.categoryInput && this.amountInput &&
                this.dateInput && this.commentInput && this.categoriesList &&
                this.saveButton && this.cancelButton);
        } catch (error) {
            console.error('Ошибка инициализации элементов формы:', error);
            return false;
        }
    }

    setupEventListeners() {
        if (this.saveButton) {
            this.saveButton.addEventListener('click', (event) => this.handleTransactionEdit(event));
        }

        if (this.cancelButton) {
            this.cancelButton.addEventListener('click', () => this.navigateToPath(this.redirectPath));
        }

        if (this.categoryInput && this.categoriesList) {
            this.categoryInput.addEventListener('focus', () => this.showCategories());
            this.categoryInput.addEventListener('blur', () => setTimeout(() => this.hideCategories(), 150));
        }

        if (this.typeInput && this.typesList) {
            this.typeInput.addEventListener('focus', () => this.showTypes());
            this.typeInput.addEventListener('blur', () => setTimeout(() => this.hideTypes(), 150));
        }
    }

    async loadTransactionData(transactionId) {
        try {
            const transaction = await Http.request(`${this.apiUrl}/${transactionId}`, 'GET');
            await this.loadCategories(transaction.type);
            this.fillFormWithTransactionData(transaction);
        } catch (error) {
            console.error('Ошибка загрузки данных транзакции:', error);
            alert('Не удалось загрузить данные транзакции!');
            this.navigateToPath(this.redirectPath);
        }
    }

    async loadCategories(type) {
        if (!this.categoriesList) return;

        try {
            const apiUrl = `http://localhost:3000/api/categories/${type}`;
            const categories = await Http.request(apiUrl, 'GET');
            this.renderCategories(categories);
        } catch (error) {
            console.error('Ошибка загрузки категорий:', error);
        }
    }

    renderCategories(categories) {
        if (!this.categoriesList) return;

        try {
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
        } catch (error) {
            console.error('Ошибка рендеринга категорий:', error);
        }
    }

    fillFormWithTransactionData(transaction) {
        if (!this.typeInput || !this.amountInput || !this.dateInput ||
            !this.commentInput || !this.categoryInput) return;

        try {
            this.typeInput.value = transaction.type === 'income' ? 'Доход' : 'Расход';
            this.typeInput.readOnly = true;
            this.typeInput.style.backgroundColor = '#f8f9fa';

            this.amountInput.value = transaction.amount;
            this.dateInput.value = this.formatDateForDisplay(transaction.date);
            this.commentInput.value = transaction.comment || '';

            if (this.categoriesList) {
                const categoryButton = Array.from(this.categoriesList.querySelectorAll('.dropdown-item'))
                    .find(item => item.textContent.trim() === transaction.category);

                if (categoryButton) {
                    this.selectedCategoryId = categoryButton.getAttribute('data-id');
                    this.categoryInput.value = categoryButton.textContent.trim();
                }
            }
        } catch (error) {
            console.error('Ошибка заполнения формы данными:', error);
        }
    }

    formatDateForDisplay(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }).split('.').join('.');
    }

    formatDateForAPI(dateString) {
        if (!dateString) return '';
        const parts = dateString.split('.');
        if (parts.length !== 3) return '';
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    setupDatePicker() {
        $(this.dateInput).datepicker({
            format: 'dd.mm.yyyy',
            language: 'ru',
            autoclose: true,
            todayHighlight: true
        });
    }

    handleCategorySelect(event) {
        const button = event.target;
        this.selectedCategoryId = button.getAttribute('data-id');
        this.categoryInput.value = button.textContent.trim();
        this.hideCategories();
    }

    showCategories() {
        this.categoriesList.style.display = 'block';
    }

    hideCategories() {
        this.categoriesList.style.display = 'none';
    }

    async handleTransactionEdit(event) {
        event.preventDefault();

        const transactionData = this.getTransactionData();
        if (!this.validateTransactionData(transactionData)) {
            return;
        }

        try {
            await Http.request(
                `${this.apiUrl}/${this.transactionId}`,
                'PUT',
                transactionData
            );
            this.navigateToPath(this.redirectPath);
        } catch (error) {
            console.error('Ошибка обновления транзакции:', error);
            alert('Не удалось обновить транзакцию. Пожалуйста, проверьте введенные данные и попробуйте снова.');
        }
    }

    getTransactionData() {
        const typeMapping = {
            'Доход': 'income',
            'Расход': 'expense'
        };

        return {
            type: typeMapping[this.typeInput.value] || this.typeInput.value.toLowerCase(),
            amount: parseFloat(this.amountInput.value) || 0,
            date: this.formatDateForAPI(this.dateInput.value),
            comment: this.commentInput.value.trim() || '',
            category_id: this.selectedCategoryId ? parseInt(this.selectedCategoryId, 10) : null
        };
    }

    validateTransactionData(data) {
        if (!['income', 'expense'].includes(data.type)) {
            alert('Тип должен быть "доход" или "расход"');
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
    renderTypes(types) {
        if (!this.typesList) return;

        try {
            this.typesList.innerHTML = types.map(type => `
            <li>
                <button
                    type="button"
                    class="dropdown-item"
                    data-type="${type}">
                    ${type === 'income' ? 'Доход' : 'Расход'}
                </button>
            </li>
        `).join('');

            this.typesList.querySelectorAll('.dropdown-item').forEach(item => {
                item.addEventListener('click', (event) => this.handleTypeSelect(event));
            });
        } catch (error) {
            console.error('Ошибка рендеринга типов:', error);
        }
    }

    handleTypeSelect(event) {
        const button = event.target;
        const selectedType = button.getAttribute('data-type');
        this.typeInput.value = selectedType === 'income' ? 'Доход' : 'Расход';
        this.typeInput.setAttribute('data-type', selectedType); // Сохраняем текущий тип

        this.selectedCategoryId = null; // Сбрасываем выбранную категорию
        this.categoryInput.value = ''; // Очищаем поле категории
        this.loadCategories(selectedType); // Подгружаем категории нового типа
        this.hideTypes();
    }

    showTypes() {
        this.typesList.style.display = 'block';
    }

    hideTypes() {
        this.typesList.style.display = 'none';
    }
}


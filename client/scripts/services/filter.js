import { Http } from './http.js';
import {Transaction} from "../../src/components/transaction.js";
import {BaseOperations} from "../../src/components/base-class/base_operations.js";
//
// export class Filter extends Transaction {
//     constructor(navigateTo) {
//         super(navigateTo);
//         this.bindFilterButtons();
//         this.bindDateRangeInputs();
//
//         // По умолчанию показываем все операции
//         this.setActiveFilter('all');
//     }
//
//     bindFilterButtons() {
//         const filterButtons = {
//             'today': this.findButtonByText("Сегодня"),
//             'week': this.findButtonByText("Неделя"),
//             'month': this.findButtonByText("Месяц"),
//             'year': this.findButtonByText("Год"),
//             'all': this.findButtonByText("Все"),
//             'range': this.findButtonByText("Интервал")
//         };
//
//         Object.entries(filterButtons).forEach(([period, button]) => {
//             if (button) {
//                 button.addEventListener('click', () => this.handleFilterClick(period, button));
//             }
//         });
//     }
//
//     findButtonByText(text) {
//         const buttons = document.querySelectorAll('button');
//         return Array.from(buttons).find(button => button.textContent.trim() === text);
//     }
//
//     bindDateRangeInputs() {
//         const dateFromInput = document.querySelector('.datepicker:first-of-type');
//         const dateToInput = document.querySelector('.datepicker:last-of-type');
//
//         if (dateFromInput && dateToInput) {
//             dateFromInput.addEventListener('change', () => this.handleDateRangeChange(dateFromInput, dateToInput));
//             dateToInput.addEventListener('change', () => this.handleDateRangeChange(dateFromInput, dateToInput));
//         }
//     }
//
//     handleFilterClick(period, button) {
//         this.setActiveFilter(period);
//         this.fetchFilteredOperations(period);
//
//         // Если выбран интервал, показываем поля выбора дат
//         const dateInputs = document.querySelectorAll('.datepicker');
//         dateInputs.forEach(input => {
//             input.style.display = period === 'range' ? 'block' : 'none';
//         });
//     }
//
//     setActiveFilter(period) {
//         // Сбрасываем активный класс у всех кнопок
//         document.querySelectorAll('.btn').forEach(btn => {
//             btn.classList.remove('btn-secondary');
//             btn.classList.add('btn-light');
//         });
//
//         // Находим текст для текущего периода
//         const periodText = this.getPeriodText(period);
//
//         // Ищем кнопку по тексту
//         const activeButton = this.findButtonByText(periodText);
//         if (activeButton) {
//             activeButton.classList.remove('btn-light');
//             activeButton.classList.add('btn-secondary');
//         }
//     }
//
//     getPeriodText(period) {
//         const periodMap = {
//             'today': 'Сегодня',
//             'week': 'Неделя',
//             'month': 'Месяц',
//             'year': 'Год',
//             'all': 'Все',
//             'range': 'Интервал'
//         };
//         return periodMap[period] || period;
//     }
//
//     async handleDateRangeChange(dateFromInput, dateToInput) {
//         const dateFrom = dateFromInput.value;
//         const dateTo = dateToInput.value;
//
//         if (dateFrom && dateTo) {
//             await this.fetchFilteredOperations('range', { dateFrom, dateTo });
//         }
//     }
//
//     async fetchFilteredOperations(period, dateRange = null) {
//         try {
//             let url = `${this.apiUrl}?period=${period}`;
//
//             if (period === 'range' && dateRange) {
//                 url += `&dateFrom=${dateRange.dateFrom}&dateTo=${dateRange.dateTo}`;
//             }
//
//             const operations = await Http.request(url);
//
//             if (operations) {
//                 // Используем родительский метод для отображения операций
//                 this.container.innerHTML = '';
//                 operations.forEach((operation, index) => {
//                     operation.number = index + 1;
//                     const row = this.createTableRow(operation);
//                     this.container.appendChild(row);
//
//                     // Инициализируем датапикер после добавления строки в DOM
//                     const dateInput = row.querySelector('.datepicker');
//                     if (dateInput) {
//                         this.datePickerManager.init(dateInput);
//                     }
//                 });
//             }
//         } catch (error) {
//             console.error('Ошибка при получении операций:', error);
//         }
//     }
// }

export class Filter extends BaseOperations {
    constructor(navigateTo) {
        super(navigateTo);
        this.bindFilterButtons();
        this.bindDateRangeInputs();
        this.setActiveFilter('all');
    }

    bindFilterButtons() {
        const filterButtons = {
            'today': this.findButtonByText("Сегодня"),
            'week': this.findButtonByText("Неделя"),
            'month': this.findButtonByText("Месяц"),
            'year': this.findButtonByText("Год"),
            'all': this.findButtonByText("Все"),
            'range': this.findButtonByText("Интервал")
        };

        Object.entries(filterButtons).forEach(([period, button]) => {
            if (button) {
                button.addEventListener('click', () => this.handleFilterClick(period, button));
            }
        });
    }

    findButtonByText(text) {
        const buttons = document.querySelectorAll('.filter-button');
        return Array.from(buttons).find(button => button.textContent.trim() === text);
    }

    bindDateRangeInputs() {
        const dateFromInput = document.querySelector('.datepicker:first-of-type');
        const dateToInput = document.querySelector('.datepicker:last-of-type');

        if (dateFromInput && dateToInput) {
            dateFromInput.addEventListener('change', () => this.handleDateRangeChange(dateFromInput, dateToInput));
            dateToInput.addEventListener('change', () => this.handleDateRangeChange(dateFromInput, dateToInput));
        }
    }

    handleFilterClick(period, button) {
        this.setActiveFilter(period);
        this.fetchFilteredOperations(period);

        const dateInputs = document.querySelectorAll('.datepicker');
        dateInputs.forEach(input => {
            input.style.display = period === 'range' ? 'block' : 'none';
        });
    }

    setActiveFilter(period) {
        // Теперь выбираем только кнопки фильтров, а не все кнопки на странице
        document.querySelectorAll('.filter-button').forEach(btn => {
            btn.classList.remove('btn-secondary');
            btn.classList.add('btn-light');
        });

        const periodText = this.getPeriodText(period);
        const activeButton = this.findButtonByText(periodText);
        if (activeButton) {
            activeButton.classList.remove('btn-light');
            activeButton.classList.add('btn-secondary');
        }
    }

    getPeriodText(period) {
        const periodMap = {
            'today': 'Сегодня',
            'week': 'Неделя',
            'month': 'Месяц',
            'year': 'Год',
            'all': 'Все',
            'range': 'Интервал'
        };
        return periodMap[period] || period;
    }

    async handleDateRangeChange(dateFromInput, dateToInput) {
        const dateFrom = dateFromInput.value;
        const dateTo = dateToInput.value;

        if (dateFrom && dateTo) {
            await this.fetchFilteredOperations('range', { dateFrom, dateTo });
        }
    }

    async fetchFilteredOperations(period, dateRange = null) {
        try {
            let url = `${this.apiUrl}?period=${period}`;

            if (period === 'range' && dateRange) {
                url += `&dateFrom=${dateRange.dateFrom}&dateTo=${dateRange.dateTo}`;
            }

            const operations = await Http.request(url);

            if (operations) {
                this.renderOperations(operations);
            }
        } catch (error) {
            console.error('Ошибка при получении операций:', error);
        }
    }
}


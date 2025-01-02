import {Http} from './http.js';
import {BaseOperations} from "../../src/components/base-class/base_operations.js";
import {DatePickerManager} from "./datePicker.js";

export class Filter extends BaseOperations {
    constructor(navigateTo) {
        super(navigateTo);
        this.bindFilterButtons();
        this.bindDateRangeInputs();
        this.setActiveFilter('all');
        const datePicker = new DatePickerManager();
        datePicker.init('.datepicker');
    }

    bindFilterButtons() {
        const filterButtons = {
            'today': this.findButtonByText("Сегодня"),
            'week': this.findButtonByText("Неделя"),
            'month': this.findButtonByText("Месяц"),
            'year': this.findButtonByText("Год"),
            'all': this.findButtonByText("Все"),
            'interval': this.findButtonByText("Интервал")
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
            dateFromInput.addEventListener('focus', () => this.activateRangeFilter());
            dateToInput.addEventListener('focus', () => this.activateRangeFilter());
            dateFromInput.addEventListener('change', () => this.handleDateRangeChange(dateFromInput, dateToInput));
            dateToInput.addEventListener('change', () => this.handleDateRangeChange(dateFromInput, dateToInput));
        }
    }

    handleFilterClick(period, button) {
        this.setActiveFilter(period);
        this.fetchFilteredOperations(period);
    }

    activateRangeFilter() {
        const rangeButton = this.findButtonByText('Интервал');
        if (rangeButton) {
            this.setActiveFilter('interval');
        }
    }

    setActiveFilter(period) {
        // Обновляем только кнопки фильтров
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
            'interval': 'Интервал'
        };
        return periodMap[period] || period;
    }

    async handleDateRangeChange(dateFromInput, dateToInput) {
        const dateFrom = dateFromInput.value;
        const dateTo = dateToInput.value;

        if (dateFrom && dateTo) {
            const formattedDateFrom = this.datePickerManager.formatDateForAPI(dateFrom);
            const formattedDateTo = this.datePickerManager.formatDateForAPI(dateTo);

            await this.fetchFilteredOperations('interval',
                {dateFrom: formattedDateFrom, dateTo: formattedDateTo});
        }
    }

    async fetchFilteredOperations(period, dateRange = null) {
        try {
            let url = `${this.apiUrl}?period=${period}`;

            if (period === 'interval' && dateRange) {
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


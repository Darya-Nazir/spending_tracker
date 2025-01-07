import { Http } from './http.js';
import { DatePickerManager } from "./datePicker.js";
import { BaseOperations } from "../components/base-class/base_operations.js";

const PERIOD_MAP = {
    today: 'Сегодня',
    week: 'Неделя',
    month: 'Месяц',
    year: 'Год',
    all: 'Все',
    interval: 'Интервал'
};

export class Filter extends BaseOperations {
    constructor(navigateTo) {
        super(navigateTo);
        this.dateInputsState = {
            from: null,
            to: null,
            hadInitialSelection: false
        };
        this.datePicker = new DatePickerManager();
        this.filterButtons = this.initFilterButtons();
        this.initDatePickers();
        this.setActiveFilter('all');
    }

    initFilterButtons() {
        const buttons = {};
        document.querySelectorAll('.filter-button').forEach(button => {
            const text = button.textContent?.trim();
            const period = Object.entries(PERIOD_MAP).find(([_, value]) => value === text)?.[0];

            if (period) {
                buttons[period] = button;
                button.addEventListener('click', () => this.handleFilterClick(period, button));
            }
        });
        return buttons;
    }

    initDatePickers() {
        const [dateFromInput, dateToInput] = Array.from(document.querySelectorAll('.datepicker'));

        if (!dateFromInput || !dateToInput) return;

        this.datePicker.init('.datepicker');

        const setupDatePicker = (input, type) => {
            $(input).on('changeDate', (e) => {
                this.handleDateSelect($(e.target).val(), type);
            });
            input.addEventListener('focus', () => this.activateRangeFilter());
        };

        setupDatePicker(dateFromInput, 'from');
        setupDatePicker(dateToInput, 'to');
    }

    handleDateSelect(date, inputType) {
        const formattedDate = this.datePicker.formatDateForAPI(date);
        this.dateInputsState[inputType] = { value: date, formatted: formattedDate };

        if (!this.dateInputsState.hadInitialSelection) {
            if (this.dateInputsState.from && this.dateInputsState.to) {
                this.dateInputsState.hadInitialSelection = true;
                this.processDateRange();
            }
        } else {
            this.processDateRange();
        }
    }

    processDateRange() {
        const { from, to } = this.dateInputsState;
        if (!from || !to) return;

        const [fromDate, toDate] = [from.value, to.value].map(this.parseDate);
        const [dateFrom, dateTo] = fromDate <= toDate
            ? [from.formatted, to.formatted]
            : [to.formatted, from.formatted];

        this.fetchFilteredOperations('interval', { dateFrom, dateTo });
    }

    parseDate(dateString) {
        const [day, month, year] = dateString.split('.').map(Number);
        return new Date(year, month - 1, day, 0, 0, 0, 0);
    }

    handleFilterClick(period, button) {
        if (period !== 'interval') {
            this.dateInputsState = { from: null, to: null, hadInitialSelection: false };
            document.querySelectorAll('.datepicker').forEach(input => input.value = '');
        }
        this.setActiveFilter(period);
        this.fetchFilteredOperations(period);
    }

    activateRangeFilter() {
        const rangeButton = this.filterButtons['interval'];
        if (rangeButton) {
            this.setActiveFilter('interval');
        }
    }

    setActiveFilter(period) {
        Object.values(this.filterButtons).forEach(btn => {
            btn.classList.remove('btn-secondary');
            btn.classList.add('btn-light');
        });

        const activeButton = this.filterButtons[period];
        if (activeButton) {
            activeButton.classList.remove('btn-light');
            activeButton.classList.add('btn-secondary');
        }
    }

    async fetchFilteredOperations(period, dateRange) {
        try {
            const params = new URLSearchParams({ period });

            if (period === 'interval' && dateRange) {
                const { dateFrom, dateTo } = dateRange;
                params.append('dateFrom', `${dateFrom}T00:00:00`);
                params.append('dateTo', `${dateTo}T23:59:59`);
            }

            const operations = await Http.request(`${this.apiUrl}?${params}`);
            if (operations) {
                this.renderOperations(operations);
            }
        } catch (error) {
            console.error('Ошибка при получении операций:', error);
        }
    }
}


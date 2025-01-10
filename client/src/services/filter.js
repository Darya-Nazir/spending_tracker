import { Http } from './http.js';
import { DatePickerManager } from "./date_picker.js";
import { BaseOperations } from "../components/base-class/base_operations.js";

export class Filter extends BaseOperations {
    dateInputsState;
    periodMap = {
        'today': 'Сегодня',
        'week': 'Неделя',
        'month': 'Месяц',
        'year': 'Год',
        'all': 'Все',
        'interval': 'Интервал'
    };

    constructor(navigateTo) {
        super(navigateTo);
        this.dateInputsState = {
            from: null,
            to: null,
            hadInitialSelection: false
        };
        this.datePicker = new DatePickerManager();
        this.bindFilterButtons();
        this.initDatePickers();
        this.setActiveFilter('all');
    }

    findButtonByText(text) {
        const buttons = document.querySelectorAll('.filter-button');
        return Array.from(buttons).find(button => button.textContent.trim() === text);
    }

    bindFilterButtons() {
        const filterButtons = {
            'today': this.findButtonByText(this.periodMap.today),
            'week': this.findButtonByText(this.periodMap.week),
            'month': this.findButtonByText(this.periodMap.month),
            'year': this.findButtonByText(this.periodMap.year),
            'all': this.findButtonByText(this.periodMap.all),
            'interval': this.findButtonByText(this.periodMap.interval)
        };

        Object.entries(filterButtons).forEach(([period, button]) => {
            if (button) {
                button.addEventListener('click', () => this.handleFilterClick(period, button));
            }
        });
    }

    initDatePickers() {
        const dateFromInput = document.querySelector('.datepicker:first-of-type');
        const dateToInput = document.querySelector('.datepicker:last-of-type');

        if (dateFromInput && dateToInput) {
            this.datePicker.init('.datepicker');

            $(dateFromInput).on('changeDate', (e) => {
                this.handleDateSelect($(e.target).val(), 'from');
            });

            $(dateToInput).on('changeDate', (e) => {
                this.handleDateSelect($(e.target).val(), 'to');
            });

            dateFromInput.addEventListener('focus', () => this.activateRangeFilter());
            dateToInput.addEventListener('focus', () => this.activateRangeFilter());
        }
    }

    handleDateSelect(date, inputType) {
        const formattedDate = this.datePicker.formatDateForAPI(date);

        this.dateInputsState[inputType] = {
            value: date,
            formatted: formattedDate
        };

        if (!this.dateInputsState.hadInitialSelection) {
            if (this.dateInputsState.from?.value && this.dateInputsState.to?.value) {
                this.dateInputsState.hadInitialSelection = true;
                this.processDateRange();
            }
        } else {
            this.processDateRange();
        }
    }

    processDateRange() {
        if (!this.dateInputsState.from?.value || !this.dateInputsState.to?.value) return;

        const fromDate = this.parseDate(this.dateInputsState.from.value);
        const toDate = this.parseDate(this.dateInputsState.to.value);

        if (!fromDate || !toDate) return;

        let dateFrom, dateTo;

        if (fromDate.getTime() <= toDate.getTime()) {
            dateFrom = this.dateInputsState.from.formatted;
            dateTo = this.dateInputsState.to.formatted;
        } else {
            dateFrom = this.dateInputsState.to.formatted;
            dateTo = this.dateInputsState.from.formatted;
        }

        this.fetchFilteredOperations('interval', {
            dateFrom,
            dateTo
        });
    }

    parseDate(dateString) {
        if (!dateString) return null;
        const [day, month, year] = dateString.split('.');
        const date = new Date(year, month - 1, day);
        date.setHours(0, 0, 0, 0);
        return date;
    }

    handleFilterClick(period, button) {
        if (period !== 'interval') {
            this.dateInputsState = {
                from: {
                    value: null,
                    formatted: null
                },
                to: {
                    value: null,
                    formatted: null
                },
                hadInitialSelection: false
            };

            const dateInputs = document.querySelectorAll('.datepicker');
            dateInputs.forEach(input => {
                input.value = '';
            });
        }
        this.setActiveFilter(period);
        this.fetchFilteredOperations(period);
    }

    activateRangeFilter() {
        const rangeButton = this.findButtonByText(this.periodMap.interval);
        if (rangeButton) {
            this.setActiveFilter('interval');
        }
    }

    setActiveFilter(period) {
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
        return this.periodMap[period] || period;
    }

    async fetchFilteredOperations(period, dateRange = null) {
        try {
            let url = `${this.apiUrl}?period=${period}`;

            if (period === 'interval' && dateRange) {
                const { dateFrom, dateTo } = dateRange;
                url += `&dateFrom=${dateFrom}T00:00:00&dateTo=${dateTo}T23:59:59`;
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


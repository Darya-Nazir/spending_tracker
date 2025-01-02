import {Http} from './http.js';
import {BaseOperations} from "../../src/components/base-class/base_operations.js";
import {DatePickerManager} from "./datePicker.js";

export class Filter extends BaseOperations {
    findButtonByText(text) {
        const buttons = document.querySelectorAll('.filter-button');
        return Array.from(buttons).find(button => button.textContent.trim() === text);
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

    handleDateSelect(date, inputType) {
        // Сразу форматируем дату для API при выборе
        const formattedDate = this.datePicker.formatDateForAPI(date);

        // Сохраняем новое значение в соответствующее поле
        this.dateInputsState[inputType] = {
            value: date,
            formatted: formattedDate
        };

        // Проверяем условия для запуска фильтрации
        if (!this.dateInputsState.hadInitialSelection) {
            // Если это первый выбор дат, нужны оба значения
            if (this.dateInputsState.from && this.dateInputsState.to) {
                this.dateInputsState.hadInitialSelection = true;
                this.processDateRange();
            }
        } else {
            // После первого выбора фильтруем при любом изменении
            this.processDateRange();
        }
    }

    processDateRange() {
        // Проверяем наличие обеих дат
        if (this.dateInputsState.from && this.dateInputsState.to) {
            const fromDate = this.parseDate(this.dateInputsState.from.value);
            const toDate = this.parseDate(this.dateInputsState.to.value);

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
    }

    parseDate(dateString) {
        const [day, month, year] = dateString.split('.');
        // Устанавливаем время в полночь по местному времени
        const date = new Date(year, month - 1, day);
        date.setHours(0, 0, 0, 0);
        return date;
    }

    handleFilterClick(period, button) {
        if (period !== 'interval') {
            // Сбрасываем состояние дат при выборе другого фильтра
            this.dateInputsState = {
                from: null,
                to: null,
                hadInitialSelection: false
            };
            // Очищаем значения в полях ввода дат
            const dateInputs = document.querySelectorAll('.datepicker');
            dateInputs.forEach(input => {
                input.value = '';
            });
        }
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

    async fetchFilteredOperations(period, dateRange = null) {
        try {
            let url = `${this.apiUrl}?period=${period}`;

            if (period === 'interval' && dateRange) {
                // Добавляем время к датам для корректного включения граничных дней
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


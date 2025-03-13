import {DatePickerManager} from "./date-picker";
import {Http} from './http';
import {BaseOperations} from "../components/base-class/base-operations";
import {RoutePath} from "../types/route-type";
import {DateInputKey, DateInputsState, DateInputStateItem, periodMap} from "../types/filter-type";
import {Operation} from "../types/operations-type";

export class Filter extends BaseOperations {
    private datePicker: DatePickerManager;
    private onUpdateCallback?: (operations: Operation[]) => void;

    private dateInputsState: DateInputsState = {
        from: null,
        to: null,
        hadInitialSelection: false
    };

    private periodMap: periodMap = {
        'today': 'Сегодня',
        'week': 'Неделя',
        'month': 'Месяц',
        'year': 'Год',
        'all': 'Все',
        'interval': 'Интервал'
    };

    constructor(navigateTo: (path: RoutePath) => void, updateCallback?: (operations: Operation[]) => void) {
        super(navigateTo);
        this.onUpdateCallback = updateCallback;
        this.datePicker = new DatePickerManager();
        this.bindFilterButtons();
        this.initDatePickers();
        this.setActiveFilter('all');
    }

    public findButtonByText(text: string): Element | undefined {
        const buttons = document.querySelectorAll('.filter-button');
        if (buttons) {
        return Array.from(buttons).find((button: Element) =>
            button.textContent !== null && button.textContent.trim() === text);

        }
    }

    public bindFilterButtons(): void {
        const filterButtons: Record<(keyof periodMap), Element | undefined> = {
            'today': this.findButtonByText(this.periodMap.today),
            'week': this.findButtonByText(this.periodMap.week),
            'month': this.findButtonByText(this.periodMap.month),
            'year': this.findButtonByText(this.periodMap.year),
            'all': this.findButtonByText(this.periodMap.all),
            'interval': this.findButtonByText(this.periodMap.interval)
        };

        Object.entries(filterButtons).forEach(([period, button]: [string, Element | undefined]): void => {
            if (button) {
                button.addEventListener('click', (): void => this.handleFilterClick(period));
            }
        });
    }

    public initDatePickers(): void {
        const dateFromInput = document.querySelector('.datepicker:first-of-type') as HTMLInputElement;
        const dateToInput = document.querySelector('.datepicker:last-of-type') as HTMLInputElement;

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

    public handleDateSelect(date: string, inputType: DateInputKey): void {
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

    public processDateRange(): void {
        if (!this.dateInputsState.from || !this.dateInputsState.to ||
            !this.dateInputsState.from.value || !this.dateInputsState.to.value ||
            !this.dateInputsState.from.formatted || !this.dateInputsState.to.formatted) {
            return;
        }

        const fromDate: Date | null = this.parseDate(this.dateInputsState.from.value);
        const toDate: Date | null = this.parseDate(this.dateInputsState.to.value);

        if (!fromDate || !toDate) return;

        let dateFrom: string, dateTo: string;

        if (fromDate.getTime() <= toDate.getTime()) {
            dateFrom = this.dateInputsState.from.formatted;
            dateTo = this.dateInputsState.to.formatted;
        } else {
            dateFrom = this.dateInputsState.to.formatted;
            dateTo = this.dateInputsState.from.formatted;
        }

        let url: string = `${this.apiUrl}?period=interval&dateFrom=${dateFrom}T00:00:00&dateTo=${dateTo}T23:59:59`;
        this.fetchFilteredOperations('interval', null, url);
    }

    public parseDate(dateString: string) : Date | null {
        if (!dateString) return null;
        const [day, month, year] = dateString.split('.');
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        date.setHours(0, 0, 0, 0);
        return date;
    }

    public handleFilterClick(period: string): void {
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

            const dateInputs: NodeListOf<Element> = document.querySelectorAll('.datepicker');
            dateInputs.forEach(input => {
                (input as HTMLInputElement).value = '';
            });
        }
        this.setActiveFilter(period);
        this.fetchFilteredOperations(period);
    }

    public activateRangeFilter(): void {
        const rangeButton: Element | undefined = this.findButtonByText(this.periodMap.interval);
        if (rangeButton) {
            this.setActiveFilter('interval');
        }
    }

    public setActiveFilter(period: string): void {
        document.querySelectorAll('.filter-button').forEach((btn: Element) => {
            btn.classList.remove('btn-secondary');
            btn.classList.add('btn-light');
        });

        const periodText: string = this.getPeriodText(period);
        const activeButton = this.findButtonByText(periodText);
        if (activeButton) {
            activeButton.classList.remove('btn-light');
            activeButton.classList.add('btn-secondary');
        }
    }

    public getPeriodText(period: string): string {
        return this.periodMap[period as keyof periodMap] || period;
    }

    public async fetchFilteredOperations(period: string, dateRange: any = null, customUrl?: string): Promise<void> {
        try {
            let url: string;

            if (customUrl) {
                url = customUrl;
            } else {
                url = `${this.apiUrl}?period=${period}`;

                if (period === 'interval' && dateRange) {
                    const {dateFrom, dateTo} = dateRange;
                    url += `&dateFrom=${dateFrom}T00:00:00&dateTo=${dateTo}T23:59:59`;
                }
            }

            const operations = await Http.request<Operation[]>(url);

            if (operations) {
                this.renderOperations(operations);

                // Вызываем функцию обратного вызова, если она определена
                if (this.onUpdateCallback) {
                    this.onUpdateCallback(operations);
                }
            }
        } catch (error) {
            console.error('Error when receiving transactions:', error);
        }
    }
}


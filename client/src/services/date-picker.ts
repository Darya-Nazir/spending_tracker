import {DateFormatOptions, DatePickerElement, DatePickerOptions} from "../types/date-picker-type";

export class DatePickerManager {
    private options: DatePickerOptions;
    private dateFormatOptions: DateFormatOptions;

    constructor(options: DatePickerOptions = {}) {
        this.options = {
            format: 'dd.mm.yyyy',
            language: 'ru',
            autoclose: true,
            todayHighlight: true,
            ...options
        };

        this.dateFormatOptions = {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        };
    }

    public init(element: DatePickerElement): void {
        if (!(typeof element === 'string' || element instanceof HTMLElement)) {
            console.error('Элемент для датапикера не определен');
            return;
        }

        $(element).datepicker(this.options);
    }

    public formatDate(dateString: string): string {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', this.dateFormatOptions);
    }

    public formatDateForAPI(dateString: string): string {
        if (!dateString) return '';
        const parts = dateString.split('.');
        if (parts.length !== 3) return '';
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    public setValue(element: DatePickerElement, date: Date | string | null): void {
        $(element).datepicker('setDate', date);
    }

    public update(element: DatePickerElement, newOptions: DatePickerOptions): void {
        $(element).datepicker('update', newOptions);
    }
}


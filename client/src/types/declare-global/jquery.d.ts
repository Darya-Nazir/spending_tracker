import { DatePickerOptions } from '../date-picker-type';

declare global {
    interface JQuery {
        datepicker(options?: DatePickerOptions): JQuery;
        datepicker(action: string, value?: any): any;
        on(eventType: string, handler: (eventObject: any) => void): JQuery;
        val(): string;
        val(value: string | number | string[]): JQuery;
    }

    // Дополнение для JQueryStatic (объект $)
    interface JQueryStatic {
        datepicker(options?: DatePickerOptions): JQuery;
        datepicker(action: string, value?: any): any;
    }

    function $(selector: string | HTMLElement): JQuery;
    namespace $ {}
}

export {};
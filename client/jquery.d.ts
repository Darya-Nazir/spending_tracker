declare global {
    interface JQuery {
        datepicker(options: DatePickerOptions): JQuery;
        datepicker(action: string, value?: any): any;
        on(eventType: string, handler: (eventObject: any) => void): JQuery; // Метод для обработки событий
        val(): string; // Метод для получения значения
        val(value: string | number | string[]): JQuery;
    }

    // Объявление $ как функции
    function $(selector: string | HTMLElement): JQuery;
    namespace $ {
        // Дополнительные функции/методы jQuery
    }
}

// Экспорт пустого объекта, чтобы typescript воспринимал файл как модуль
export {};
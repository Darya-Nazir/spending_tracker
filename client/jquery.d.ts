// Объявление глобальной переменной $
declare global {
    interface JQuery {
        datepicker(options: DatePickerOptions): JQuery;
        datepicker(action: string, value?: any): any;
    }

    // Объявление $ как функции
    function $(selector: string | HTMLElement): JQuery;
    namespace $ {
        // Дополнительные функции/методы jQuery
    }
}

// Экспорт пустого объекта, чтобы typescript воспринимал файл как модуль
export {};
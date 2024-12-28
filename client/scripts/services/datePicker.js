export class DatePickerManager {
    constructor(options = {}) {
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

    init(selector = '.datepicker') {
        $(document).ready(() => {
            $(selector).datepicker(this.options);
        });
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', this.dateFormatOptions);
    }

    // Методы для дополнительной функциональности
    getValue(element) {
        return $(element).datepicker('getDate');
    }

    setValue(element, date) {
        $(element).datepicker('setDate', date);
    }

    destroy(element) {
        $(element).datepicker('destroy');
    }

    update(element, newOptions) {
        $(element).datepicker('update', newOptions);
    }
}
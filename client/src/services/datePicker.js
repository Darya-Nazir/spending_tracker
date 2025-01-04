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

    init(element) {
        if (typeof element === 'string') {
            $(element).datepicker(this.options);
        } else if (element instanceof HTMLElement) {
            $(element).datepicker(this.options);
        } else {
            console.error('Элемент для датапикера не определен');
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', this.dateFormatOptions);
    }

    formatDateForAPI(dateString) {
        if (!dateString) return '';
        const parts = dateString.split('.');
        if (parts.length !== 3) return '';
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

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


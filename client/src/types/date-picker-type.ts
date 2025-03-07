export type DatePickerOptions = {
    format?: string;
    language?: string;
    autoclose?: boolean;
    todayHighlight?: boolean;
    [key: string]: any;
};

export type DateFormatOptions = {
    day: 'numeric' | '2-digit';
    month: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow';
    year: 'numeric' | '2-digit';
};

export type DatePickerElement = string | HTMLElement | JQuery;
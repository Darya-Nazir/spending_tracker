export type periodMap = {
    'today': string,
    'week': string,
    'month': string,
    'year': string,
    'all': string,
    'interval': string
}

export type DateInputStateItem = {
    value: string | null;
    formatted: string | null;
};

export type DateInputsState = {
    from: DateInputStateItem | null;
    to: DateInputStateItem | null;
    hadInitialSelection: boolean;
};

export type DateInputKey = 'from' | 'to';
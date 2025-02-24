export type Operation = {
    id: string | number;
    type: 'income' | 'expense';
    date: string | Date;
    number: number;
    category?: string;
    amount: number;
    comment?: string;
}
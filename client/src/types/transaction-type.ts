export type TransactionData = {
    type: 'income' | 'expense';
    amount: number;
    date: string;
    comment: string;
    category_id: number | null;
};
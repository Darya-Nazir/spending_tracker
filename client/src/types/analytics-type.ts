export type Chart = {
    data: ChartData;
    update(): void;
}

export type ChartData = {
    labels: string[];
    datasets: {
        data: number[];
        backgroundColor: string[];
    }[];
}

// Создаем тип для диаграммы
export type ChartInstance = Chart | null;

// Тип для категорий данных
export type CategoryData = Record<string, number>;

import { Chart as ChartJS } from 'chart.js';

// Используем тип из библиотеки Chart.js
export type ChartInstance = ChartJS;

export type ChartData = {
    labels: string[];
    datasets: Array<{
        data: number[];
        backgroundColor: string[];
    }>;
};

export type ChartConfiguration = {
    type: 'pie' | 'bar' | 'line' | 'doughnut' | 'radar' | 'polarArea' | 'bubble' | 'scatter';
    data: ChartData;
    options: ChartOptions;
};

// Тип для опций графика
export type ChartOptions = {
    responsive: boolean;
    plugins: {
        legend: {
            position: 'top' | 'left' | 'right' | 'bottom' | 'center'
        };
        tooltip: {
            callbacks: {
                label: (context: ChartTooltipContext) => string;
            }
        }
    }
}

export type ChartTooltipContext = {
    // Метка данной точки данных (например, название категории)
    label?: string;

    // Значение данной точки данных
    parsed?: number;

    // Информация о наборе данных, к которому принадлежит точка
    dataset: {
        // Массив всех значений в наборе данных
        data: number[];

        // Другие свойства датасета
        backgroundColor?: string[];
        borderColor?: string[];
    };
};

export type CanvasElements = {
    incomeCanvas: HTMLCanvasElement,
    expensesCanvas: HTMLCanvasElement
}

export type EmptyChartData = {
    labels: string[];
    datasets: [{
        data: number[];
        backgroundColor: string[];
    }]
}

export type ChartDataset = {
    labels: string[];
    datasets: [{
        data: number[];
        backgroundColor: string[];
    }]
};

export type ProcessedOperationsData = {
    incomeData: ChartDataset;
    expensesData: ChartDataset;
};


import { Chart as ChartJS } from 'chart.js';

// Используем тип из библиотеки Chart.js
export type ChartInstance = ChartJS;

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


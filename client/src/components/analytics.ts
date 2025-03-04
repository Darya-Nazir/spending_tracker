import { DatePickerManager } from "../services/date-picker";
import { Filter } from "../services/filter";
import { Unselect } from "../services/unselect";
import {
    CanvasElements, ChartDataset,
    ChartInstance,
    EmptyChartData, ProcessedOperationsData
} from "../types/analytics-type";
import { Chart, ChartConfiguration, TooltipItem } from "chart.js";
import { Operation } from "../types/operations-type";
import { DatePickerElement } from "../types/date-picker-type";
import { RoutePath } from "../types/route-type";

export class Analytics {
    private charts: {
        income: ChartInstance | null;
        expenses: ChartInstance | null;
    };

    private filter: Filter;
    private datePickerManager: DatePickerManager;

    static CHART_COLORS = Object.freeze([
        '#dc3545', // red
        '#fd7e14', // orange
        '#ffc107', // yellow
        '#198754', // green
        '#0d6efd', // blue
        '#6610f2', // indigo
        '#6f42c1', // purple
        '#d63384', // pink
        '#20c997', // teal
        '#0dcaf0'  // cyan
    ]);

    constructor(navigateTo: (path: RoutePath) => void) {
        this.charts = {
            income: null,
            expenses: null
        };

        // Создаем экземпляр Filter и передаем метод обновления графиков как callback
        this.filter = new Filter(
            navigateTo,
            (operations: Operation[]) => {
                this.updateCharts(operations);
            }
        );

        this.datePickerManager = new DatePickerManager();
    }

    public async init(): Promise<void> {
        // Сначала инициализируем фильтры, так как они не зависят от графиков
        this.initFilters();

        // Загружаем библиотеку и ждем ее инициализации
        await this.loadChartLibrary();
    }

    private initFilters(): void {
        const filterButtons: NodeListOf<Element> = document.querySelectorAll('.btn-light, .btn-secondary');
        filterButtons.forEach((button: Element): void => {
            if (!button.classList.contains('filter-button')) {
                button.classList.add('filter-button');
            }
        });

        document.querySelectorAll('.datepicker').forEach((input: Element) => {
            this.datePickerManager = new DatePickerManager();
            this.datePickerManager.init(input as DatePickerElement);
        });
    }

    private loadChartLibrary(): Promise<void> {
        return new Promise<void>((resolve, reject): void => {
            const script: HTMLScriptElement = document.createElement('script');
            script.src = './scripts/lib/chart.js';
            script.async = true;

            script.onload = () => {
                if (typeof Chart === 'undefined') {
                    reject('Chart.js не загрузился корректно');
                    return;
                }

                // Ждем следующего тика для гарантии загрузки DOM
                requestAnimationFrame(() => {
                    if (this.tryInitializeCharts()) {
                        new Unselect().init();
                        this.selectMain();
                        this.filter.fetchFilteredOperations('all');
                        resolve();
                    } else {
                        reject('Не удалось инициализировать графики');
                    }
                });
            };

            script.onerror = () => reject('Ошибка загрузки Chart.js');
            document.body.appendChild(script);
        });
    }

    private createChartOptions() {
        return {
            responsive: true,
            plugins: {
                legend: { position: 'top' as const },
                tooltip: {
                    callbacks: {
                        label: function(context: TooltipItem<'pie'>): string {
                            const label: string = context.label || '';
                            const value: number = context.parsed || 0;
                            const total: number = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage: string = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
                            return `${label}: ${percentage}%`;
                        }
                    }
                }
            }
        };
    }

    private validateCanvasElements(): CanvasElements | null {
        const incomeCanvas: HTMLCanvasElement | null = document.getElementById('incomeChart') as HTMLCanvasElement;
        const expensesCanvas: HTMLCanvasElement | null = document.getElementById('expensesChart') as HTMLCanvasElement;

        if (!incomeCanvas || !expensesCanvas) {
            console.error('Canvas элементы не найдены');
            return null;
        }

        return { incomeCanvas, expensesCanvas };
    }

    private createCharts(canvasElements: CanvasElements): boolean {
        const { incomeCanvas, expensesCanvas } = canvasElements;
        const options = this.createChartOptions();

        try {
            const incomeConfig: ChartConfiguration<'pie', number[], string> = {
                type: 'pie',
                data: this.createEmptyChartData(),
                options: options
            };

            const expensesConfig: ChartConfiguration<'pie', number[], string> = {
                type: 'pie',
                data: this.createEmptyChartData(),
                options: options
            };

            this.charts.income = new Chart(incomeCanvas, incomeConfig);
            this.charts.expenses = new Chart(expensesCanvas, expensesConfig);

            return true;
        } catch (error) {
            console.error('Ошибка при инициализации графиков:', error);
            return false;
        }
    }

    tryInitializeCharts(): boolean {
        const canvasElements = this.validateCanvasElements();
        if (!canvasElements) return false;

        return this.createCharts(canvasElements);
    }

    createEmptyChartData(): EmptyChartData {
        return {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: []
            }]
        };
    }

    private updateCharts(operations: Operation[]): void {
        if (!operations || !Array.isArray(operations)) {
            console.error('Получены некорректные данные операций:', operations);
            return;
        }

        const { incomeData, expensesData } = this.processOperationsData(operations);

        this.updateChart(this.charts.income, incomeData);
        this.updateChart(this.charts.expenses, expensesData);
    }

    private processOperationsData(operations: Operation[]): ProcessedOperationsData {
        const incomeCategories: Record<string, number> = {};
        const expensesCategories: Record<string, number> = {};

        operations.forEach((operation: Operation) => {
            const categories: Record<string, number> = operation.type === 'income' ? incomeCategories : expensesCategories;
            const amount: number = operation.amount || 0;
            const categoryName: string = operation.category || 'Без категории';

            if (!categories[categoryName]) {
                categories[categoryName] = 0;
            }
            categories[categoryName] += amount;
        });

        return {
            incomeData: this.prepareChartData(incomeCategories),
            expensesData: this.prepareChartData(expensesCategories)
        };
    }

    private prepareChartData(categories: Record<string, number>): ChartDataset {
        const labels: string[] = Object.keys(categories);
        const data: number[] = Object.values(categories);
        const backgroundColors: string[] = labels.map((_: string, index: number): string =>
            // Используем остаток от деления для циклического повторения цветов
            Analytics.CHART_COLORS[index % Analytics.CHART_COLORS.length]
        );

        return {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors
            }]
        };
    }

    updateChart(chart: ChartInstance | null, newData: ChartDataset): void {
        if (!chart) return;

        chart.data.labels = newData.labels;
        chart.data.datasets[0].data = newData.datasets[0].data;
        chart.data.datasets[0].backgroundColor = newData.datasets[0].backgroundColor;
        chart.update();
    }

    selectMain(): void {
        const mainPage = document.getElementById('mainPage');
        if (mainPage) {
            mainPage.classList.add('bg-primary', 'text-white');
        }
    }
}
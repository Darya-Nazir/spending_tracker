import { DatePickerManager } from "../services/date-picker";
import { Filter } from "../services/filter";
import { Unselect } from "../services/unselect";
import {
    CanvasElements, ChartDataset,
    ChartInstance,
    EmptyChartData, ProcessedOperationsData
} from "../types/analytics-type";
import { Operation } from "../types/operations-type";
import { DatePickerElement } from "../types/date-picker-type";
import { RoutePath } from "../types/route-type";
// Импорт объявлен, но инициализация происходит динамически через скрипт
// Поэтому отдельно определяем тип для Chart
declare const Chart: any;

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
        try {
            // Сначала инициализируем фильтры, так как они не зависят от графиков
            this.initFilters();

            // Загружаем библиотеку и ждем ее инициализации
            await this.loadChartLibrary();
        } catch (error) {
            console.error('Error during Analytics initialization:', error);
            throw new Error('Failed to initialize charts');
        }
    }

    private initFilters(): void {
        const filterButtons: NodeListOf<Element> = document.querySelectorAll('.btn-light, .btn-secondary');
        filterButtons.forEach((button: Element): void => {
            if (!button.classList.contains('filter-button')) {
                button.classList.add('filter-button');
            }
        });

        document.querySelectorAll('.datepicker').forEach((input: Element) => {
            this.datePickerManager.init(input as DatePickerElement);
        });
    }

    private loadChartLibrary(): Promise<void> {
        return new Promise<void>((resolve, reject): void => {
            try {
                // Загружаем скрипт Chart.js
                const script: HTMLScriptElement = document.createElement('script');
                script.src = './scripts/lib/chart.js';
                script.async = true;

                script.onload = () => {
                    if (typeof Chart === 'undefined') {
                        reject(new Error('Chart.js did not load correctly'));
                        return;
                    }

                    // Ждем следующего тика для гарантии загрузки DOM
                    requestAnimationFrame(() => {
                        try {
                            // Необходимо убедиться, что Chart.js полностью инициализировался
                            this.registerChartComponents();

                            if (this.tryInitializeCharts()) {
                                new Unselect().init();
                                this.selectMain();
                                this.filter.fetchFilteredOperations('all');
                                resolve();
                            } else {
                                reject(new Error('Failed to initialize charts'));
                            }
                        } catch (error) {
                            console.error('Error during initialization of charts:', error);
                            reject(error);
                        }
                    });
                };

                script.onerror = () => reject(new Error('Chart.ts loading error'));
                document.body.appendChild(script);
            } catch (error) {
                reject(error);
            }
        });
    }

    private registerChartComponents(): void {
        try {
            // В Chart.js 3.x и 4.x нужно явно регистрировать компоненты
            // Проверяем версию Chart.js и в зависимости от этого регистрируем компоненты
            if (Chart.register) {
                // Chart.js v3.x или v4.x
                if (Chart.ArcElement && Chart.Tooltip && Chart.Legend) {
                    Chart.register(Chart.ArcElement, Chart.Tooltip, Chart.Legend);
                } else if (Chart.controllers && Chart.controllers.pie) {
                    // Ничего не делаем, контроллеры уже зарегистрированы
                } else {
                    // Используем альтернативный синтаксис для Chart.js v4
                    Chart.defaults.plugins.tooltip = Chart.defaults.plugins.tooltip || {};
                    Chart.defaults.plugins.legend = Chart.defaults.plugins.legend || {};

                    // Регистрируем контроллер pie вручную, если он существует
                    if (Chart.PieController) {
                        Chart.register(Chart.PieController);
                    }
                }
            } else if (Chart.controllers && !Chart.controllers.pie) {
                // Chart.js v2.x - регистрируем контроллер "pie" если он не зарегистрирован
                throw new Error('Chart.js v2.x requires pre-registration of controllers');
            }
        } catch (error) {
            console.warn('Failed to register Chart.js components:', error);
            // Продолжаем выполнение, возможно компоненты уже зарегистрированы
        }
    }

    private createChartOptions() {
        return {
            responsive: true,
            plugins: {
                legend: { position: 'top' as const },
                tooltip: {
                    callbacks: {
                        label: function(context: any): string {
                            const label: string = context.label || '';
                            const value: number = context.parsed || context.raw || 0;
                            const dataset = context.dataset;
                            const total: number = Array.isArray(dataset.data)
                                ? dataset.data.reduce((a: number, b: number) => a + b, 0)
                                : 0;
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
            console.error('Canvas elements not found');
            return null;
        }

        return { incomeCanvas, expensesCanvas };
    }

    private createCharts(canvasElements: CanvasElements): boolean {
        const { incomeCanvas, expensesCanvas } = canvasElements;
        const options = this.createChartOptions();

        try {
            // Используем упрощенную конфигурацию для совместимости с разными версиями Chart.js
            const incomeConfig = {
                type: 'pie',
                data: this.createEmptyChartData(),
                options: options
            };

            const expensesConfig = {
                type: 'pie',
                data: this.createEmptyChartData(),
                options: options
            };

            // Создаем диаграммы с проверкой ошибок
            try {
                this.charts.income = new Chart(incomeCanvas, incomeConfig);
            } catch (error) {
                console.error('Error when creating an income chart:', error);
                return false;
            }

            try {
                this.charts.expenses = new Chart(expensesCanvas, expensesConfig);
            } catch (error) {
                console.error('Error when creating an expense chart:', error);
                // Освобождаем ресурсы первой диаграммы, если она была создана
                if (this.charts.income) {
                    this.charts.income.destroy();
                    this.charts.income = null;
                }
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error during initialization of charts:', error);
            return false;
        }
    }

    public tryInitializeCharts(): boolean {
        const canvasElements = this.validateCanvasElements();
        if (!canvasElements) return false;

        return this.createCharts(canvasElements);
    }

    public createEmptyChartData(): EmptyChartData {
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
            console.error('Incorrect transaction data received:', operations);
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

    public updateChart(chart: ChartInstance | null, newData: ChartDataset): void {
        if (!chart) return;

        chart.data.labels = newData.labels;
        chart.data.datasets[0].data = newData.datasets[0].data;
        chart.data.datasets[0].backgroundColor = newData.datasets[0].backgroundColor;
        chart.update();
    }

    public selectMain(): void {
        const mainPage = document.getElementById('mainPage');
        if (mainPage) {
            mainPage.classList.add('bg-primary', 'text-white');
        }
    }
}
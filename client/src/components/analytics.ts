import { DatePickerManager } from "../services/date-picker";
import { Filter } from "../services/filter";
import { Unselect } from "../services/unselect";

export class Analytics {
    // Определяем статическое свойство с цветами и делаем его неизменяемым
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
    

    constructor() {
        this.charts = {
            income: null,
            expenses: null
        };
        // Создаем экземпляр Filter и передаем метод обновления графиков как callback
        this.filter = new Filter((operations) => {
            this.updateCharts(operations);
        });
    }

    async init() {
        // Сначала инициализируем фильтры, так как они не зависят от графиков
        this.initFilters();

        // Загружаем библиотеку и ждем ее инициализации
        await this.loadChartLibrary();
    }

    initFilters() {
        const filterButtons = document.querySelectorAll('.btn-light, .btn-secondary');
        filterButtons.forEach(button => {
            if (!button.classList.contains('filter-button')) {
                button.classList.add('filter-button');
            }
        });

        document.querySelectorAll('.datepicker').forEach((input) => {
            this.datePickerManager = new DatePickerManager();
            this.datePickerManager.init(input);
        });
    }

    loadChartLibrary() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
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

    createChartOptions() {
        return {
            responsive: true,
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${percentage}%`;
                        }
                    }
                }
            }
        };
    }

    validateCanvasElements() {
        const incomeCanvas = document.getElementById('incomeChart');
        const expensesCanvas = document.getElementById('expensesChart');

        if (!incomeCanvas || !expensesCanvas) {
            console.error('Canvas элементы не найдены');
            return null;
        }

        return { incomeCanvas, expensesCanvas };
    }

    createCharts(canvasElements) {
        const { incomeCanvas, expensesCanvas } = canvasElements;
        const options = this.createChartOptions();

        try {
            this.charts.income = new Chart(incomeCanvas, {
                type: 'pie',
                data: this.createEmptyChartData(),
                options: options
            });

            this.charts.expenses = new Chart(expensesCanvas, {
                type: 'pie',
                data: this.createEmptyChartData(),
                options: options
            });

            return true;
        } catch (error) {
            console.error('Ошибка при инициализации графиков:', error);
            return false;
        }
    }

    tryInitializeCharts() {
        const canvasElements = this.validateCanvasElements();
        if (!canvasElements) return false;

        return this.createCharts(canvasElements);
    }

    createEmptyChartData() {
        return {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: []
            }]
        };
    }

    updateCharts(operations) {
        if (!operations || !Array.isArray(operations)) {
            console.error('Получены некорректные данные операций:', operations);
            return;
        }

        const { incomeData, expensesData } = this.processOperationsData(operations);

        this.updateChart(this.charts.income, incomeData);
        this.updateChart(this.charts.expenses, expensesData);
    }

    processOperationsData(operations) {
        const incomeCategories = {};
        const expensesCategories = {};

        operations.forEach(operation => {
            const categories = operation.type === 'income' ? incomeCategories : expensesCategories;
            const amount = parseFloat(operation.amount) || 0;

            if (!categories[operation.category]) {
                categories[operation.category] = 0;
            }
            categories[operation.category] += amount;
        });

        return {
            incomeData: this.prepareChartData(incomeCategories),
            expensesData: this.prepareChartData(expensesCategories)
        };
    }

    prepareChartData(categories) {
        const labels = Object.keys(categories);
        const data = Object.values(categories);
        const backgroundColors = labels.map((_, index) =>
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

    updateChart(chart, newData) {
        if (!chart) return;

        chart.data.labels = newData.labels;
        chart.data.datasets[0].data = newData.datasets[0].data;
        chart.data.datasets[0].backgroundColor = newData.datasets[0].backgroundColor;
        chart.update();
    }

    selectMain() {
        const mainPage = document.getElementById('mainPage');
        if (mainPage) {
            mainPage.classList.add('bg-primary', 'text-white');
        }
    }
}


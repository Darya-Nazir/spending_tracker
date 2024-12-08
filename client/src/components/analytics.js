export class Analytics {
    constructor() {
    }

    init() {
        console.log('Analytics');
        this.startChart();
    }

    startChart() {
        // При использовании innerHTML браузеры не всегда выполняют добавленные теги <script>.
        // Предпочтительнее использовать document.createElement,
        //     так как это более надежно и безопасно.
        const script = document.createElement('script');
        script.src = './scripts/services/chart.js';
        script.async = true; // Загружается асинхронно

        document.body.appendChild(script);

        // Опционально: обработка события загрузки
        script.onload = () => {
            if (typeof Chart === 'undefined') {
                console.error('Chart.js не загрузился корректно');
            } else {
                console.log('Chart.js загружен');
                this.startDiagrams();
            }
        };
    }

    startDiagrams() {
        // Данные для графиков
        const incomeData = {
            labels: ['Red', 'Orange', 'Yellow', 'Green', 'Blue'],
            datasets: [{
                data: [30, 40, 15, 10, 5],
                backgroundColor: ['#dc3545', '#fd7e14', '#ffc107', '#198754', '#0d6efd']
            }]
        };

        const expensesData = {
            labels: ['Red', 'Orange', 'Yellow', 'Green', 'Blue'],
            datasets: [{
                data: [10, 20, 30, 35, 5],
                backgroundColor: ['#dc3545', '#fd7e14', '#ffc107', '#198754', '#0d6efd']
            }]
        };

        // Опции для графиков
        const options = {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                }
            }
        };

        // Создание графиков
        new Chart(document.getElementById('incomeChart'), {
            type: 'pie',
            data: incomeData,
            options: options
        });

        new Chart(document.getElementById('expensesChart'), {
            type: 'pie',
            data: expensesData,
            options: options
        });
    }
}


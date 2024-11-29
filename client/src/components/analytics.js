export class Analytics {
    constructor() {
        this.init();
    }
    async init() {
        console.log('Analytics');
         this.startChart();
        await this.startDiagrams();
    }
    startChart() {
// Создаём новый элемент <script>
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.7.0/chart.min.js';
        script.async = true; // Загружается асинхронно

        // Найдём скрипт Bootstrap на странице
        const bootstrapScript = document.querySelector('script[src*="bootstrap"]');

        if (bootstrapScript) {
            // Вставляем после Bootstrap
            bootstrapScript.parentNode.insertBefore(script, bootstrapScript.nextSibling);
        } else {
            // Если Bootstrap не найден, вставляем в конец <body>
            document.body.appendChild(script);
        }

        // Опционально: обработка события загрузки
        script.onload = () => {
            console.log('Chart.js загружен');
            // Здесь можно вызвать функцию инициализации графиков, если нужно
        };
        // <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.7.0/chart.min.js"></script>

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
        window.onload = function () {
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
        };
    }
}
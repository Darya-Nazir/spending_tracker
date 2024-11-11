class Router {
    constructor(routes) {
        this.routes = routes;
        window.addEventListener('hashchange', () => this.handleNavigation());
        window.addEventListener('load', () => this.handleNavigation());
    }

    navigateTo(route) {
        window.location.hash = route; // Изменение hash для отслеживания изменений URL
    }

    handleNavigation() {
        const path = window.location.hash.replace('#', '') || '/';
        const page = this.routes[path];

        if (page) {
            fetch(page)
                .then(response => response.text())
                .then(html => {
                    document.getElementById('app').innerHTML = html;
                })
                .catch(error => console.error('Ошибка при загрузке страницы:', error));
        } else {
            console.error('Маршрут не найден:', path);
        }
    }
}

// Инициализация роутера с маршрутами
const router = new Router({
    '/': 'index.html',
    '/signup': 'markups/signup.html',
    '/costs': 'markups/costs.html',
    '/revenues': 'markups/revenues.html',
    '/transactions': 'markups/transactions.html',
    '/analytics': 'markups/analytics.html',
    '/create-cost': 'markups/create_cost.html',
    '/create-revenue': 'markups/create_revenue.html',
    '/edit-cost': 'markups/edit_cost.html',
    '/edit-revenue': 'markups/edit_revenue.html',
    '/edit-transaction': 'markups/edit_transaction.html',
});

export default router;


<!--в роутере подключение массивом-->
<!--не в конструкторе-->
<!--логика именно по перемещению-->


// Делаем СПА. Отдельно компоненты разметки. Для начала: хедер и футер в основном шаблоне.
// Потом, со звездочкой: хедер и футер - отдельные компоненты. Не перезагружаются, если они те же.
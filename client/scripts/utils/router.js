export class Router {
    constructor(routes) {
        this.routes = routes;

        // Слушаем события загрузки страницы и изменения состояния истории
        window.addEventListener('DOMContentLoaded', this.handleNavigation.bind(this));
        window.addEventListener('popstate', this.handleNavigation.bind(this));
    }

    navigateTo(route) {
        // Изменение состояния истории без добавления в стек истории
        history.pushState(null, '', route); // Используем pushState для полноценного изменения истории
        this.handleNavigation();
    }

    handleNavigation() {
        const path = window.location.pathname || '/'; // Получаем путь из URL (без хэша)
        const page = this.routes[path];

        if (page) {
            fetch(page)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Страница не найдена');
                    }
                    return response.text();
                })
                .then(html => {
                    document.getElementById('app').innerHTML = html;
                })
                .catch(error => {
                    console.error('Ошибка при загрузке страницы:', error);
                    document.getElementById('app').innerHTML = '<h1>Страница не найдена</h1>';
                });
        } else {
            console.error('Маршрут не найден:', path);
            document.getElementById('app').innerHTML = '<h1>Маршрут не найден</h1>';
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

// export default router;


<!--в роутере подключение массивом-->
<!--не в конструкторе-->
<!--логика именно по перемещению-->


// Делаем СПА. Отдельно компоненты разметки. Для начала: хедер и футер в основном шаблоне.
// Потом, со звездочкой: хедер и футер - отдельные компоненты. Не перезагружаются, если они те же.
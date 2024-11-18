export class Router {
    constructor(routes) {
        this.routes = routes;
        this.initEvents();
        this.appElement = document.getElementById('app');
        this.titlePageElement = document.getElementById('title');
    }

    initEvents() {
        window.addEventListener('DOMContentLoaded', this.handleNavigation.bind(this));
        window.addEventListener('popstate', this.handleNavigation.bind(this));

        document.body.addEventListener('click', (event) => {
            const link = event.target.closest('a.route-link');
            if (link) {
                event.preventDefault(); // Предотвращает стандартный переход
                const path = link.getAttribute('href');
                this.navigateTo(path); // Вызов вашего метода для изменения маршрута
            }
        });
    }

    navigateTo(route) {
        // Изменение состояния истории без добавления в стек истории
        history.pushState(null, '', route); // Используем pushState для полноценного изменения истории
        this.handleNavigation();
    }

    async handleNavigation() {
        const path = window.location.pathname || '/'; // Получаем путь из URL (без хэша)
        const page = this.routes[path];

        if (page) {
           await fetch(page)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Страница не найдена');
                    }
                    return response.text();
                })
                .then(html => {
                    this.appElement.innerHTML = html;
                })
                .catch(error => {
                    console.error('Ошибка при загрузке страницы:', error);
                    this.appElement.innerHTML = '<h1>Страница не найдена</h1>';
                });
        } else {
            console.error('Маршрут не найден:', path);
            this.appElement.innerHTML = '<h1>Маршрут не найден</h1>';
        }
    }
}

// Инициализация роутера с маршрутами
const router = new Router({
    '/login': 'markups/login.html',
    '/signup': 'markups/signup.html',
    '/costs': 'markups/costs.html',
    // '/revenues': 'markups/revenues.html',
    // '/transactions': 'markups/transactions.html',
    // '/analytics': 'markups/analytics.html',
    // '/create-cost': 'markups/create_cost.html',
    // '/create-revenue': 'markups/create_revenue.html',
    // '/edit-cost': 'markups/edit_cost.html',
    // '/edit-revenue': 'markups/edit_revenue.html',
    // '/edit-transaction': 'markups/edit_transaction.html',
});


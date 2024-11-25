export class Router {
    constructor() {
        this.routes = routes;
        this.initEvents();
        this.appElement = document.getElementById('app');
        this.titlePageElement = document.getElementById('title');
        this.loadedStyles = new Set(); // Отслеживаем загруженные стили
        this.loadedScripts = new Set(); // Отслеживаем загруженные скрипты
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

    async loadStyle(href) {
        // Проверяем, не загружен ли уже этот стиль
        if (this.loadedStyles.has(href)) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = () => {
                this.loadedStyles.add(href);
                resolve();
            };
            link.onerror = reject;
            document.head.appendChild(link);
        });
    }

    // async loadScript(src) {
    //     // Проверяем, не загружен ли уже этот скрипт
    //     if (this.loadedScripts.has(src)) {
    //         return Promise.resolve();
    //     }
    //
    //     return new Promise((resolve, reject) => {
    //         const script = document.createElement('script');
    //         script.src = src;
    //         script.type = 'module';
    //         script.onload = () => {
    //             this.loadedScripts.add(src);
    //             resolve();
    //         };
    //         script.onerror = reject;
    //         document.body.appendChild(script);
    //     });
    // }

    async handleNavigation() {
        const path = window.location.pathname || '/';
        const page = this.routes[path] ?? null;

        if (page) {
            try {
                // Сначала загружаем HTML
                const html = await fetch(page.html).then(response => response.text());
                this.appElement.innerHTML = html;

            } catch (error) {
                console.error('Ошибка при загрузке страницы:', error);
                this.appElement.innerHTML = '<h1>Страница не найдена</h1>';
            }
        } else {
            console.error('Маршрут не найден:', path);
            this.appElement.innerHTML = '<h1>Маршрут не найден</h1>';
        }
    }
}

// Инициализация роутера с маршрутами
const routes = {
    // '/': 'index.html',
    '/': {
        html: 'templates/signup.html',
        // css: [
        //     '/bootstrap.min.css',
        //     '/common.css',
        // ],
    },
    '/login': {
        html: 'templates/login.html',
        // css: [
        //     '/bootstrap.min.css',
        //     '/common.css',
        // ],
    },
    '/costs': 'templates/costs.html',
    // '/revenues': 'markups/revenues.html',
    // '/transactions': 'markups/transactions.html',
    // '/analytics': 'markups/analytics.html',
    // '/create-cost': 'markups/create_cost.html',
    // '/create-revenue': 'markups/create_revenue.html',
    // '/edit-cost': 'markups/edit_cost.html',
    // '/edit-revenue': 'markups/edit_revenue.html',
    // '/edit-transaction': 'markups/edit_transaction.html',
};


// ***
// функция лоад подгружает импортированные классы, созд. инстанс
// всё отправить в дист
// переименовать индекс джс
// new CopyPlugin({
//     patterns: [
//         {from: "./src/markups", to: "templates"},
//         {from: "styles", to: "styles"},
//     ],
// }),
// хешмапы - ключи, в значении объект с информацией



// показывай мне, где я ответила правильно, а где неправильно.
// обращай внимание и смысл, и на мою формулировку.
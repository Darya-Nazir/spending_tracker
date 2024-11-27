import {Signup} from "./components/signup.js";
import {Login} from "./components/login.js";
import {Costs} from "./components/costs.js";

export class Router {
    constructor() {
        this.routes = routes;
        this.initEvents();
        this.appElement = document.getElementById('app');
        this.titlePageElement = document.getElementById('title');
        this.loadedStyles = new Set(); // Отслеживаем загруженные стили
        this.navbar = document.getElementById('navbar');

        this.path = window.location.pathname || '/';
        this.page = this.routes[this.path];
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

// На случай дополнительных стилей

    // async loadStyle(href) {
    //     // Проверяем, не загружен ли уже этот стиль
    //     if (this.loadedStyles.has(href)) {
    //         return Promise.resolve();
    //     }
    //
    //     return new Promise((resolve, reject) => {
    //         const link = document.createElement('link');
    //         link.rel = 'stylesheet';
    //         link.href = href;
    //         link.onload = () => {
    //             this.loadedStyles.add(href);
    //             resolve();
    //         };
    //         link.onerror = reject;
    //         document.head.appendChild(link);
    //     });
    // }

    startLoad() {

        if (this.page && typeof this.page.load === 'function') {
            this.page.load();
        }
    }

    addTitle() {
        if (this.page && typeof this.page.title === 'string') {
            document.title = this.page.title; // Устанавливаем текст для тега <title>
        } else {
            document.title = 'Lumincoin Finance'; // Значение по умолчанию
        }
    }

    async handleNavigation() {
        const handlePage = this.page ?? null;

        if (handlePage) {
            try {
                // Сначала загружаем HTML
                const html = await fetch(handlePage.html).then(response => response.text());

                // Создаем observer перед обновлением DOM
                const observer = new MutationObserver((mutations, obs) => {
                    this.startLoad();
                    this.addTitle();
                    obs.disconnect(); // Отключаем observer после первого срабатывания
                });

                // Начинаем наблюдение за изменениями
                observer.observe(this.appElement, {
                    childList: true
                });

                // Обновляем DOM
                this.appElement.innerHTML = html;

                this.canselNav();

            } catch (error) {
                console.error('Ошибка при загрузке страницы:', error);
                this.appElement.innerHTML = '<h1>Страница не найдена</h1>';
            }
        } else {
            console.error('Маршрут не найден:', this.path);
            this.appElement.innerHTML = '<h1>Маршрут не найден</h1>';
        }
    }

    canselNav() {
        // Скрываем или показываем навбар в зависимости от флага `showNavbar`
        if (this.page && this.page.showNavbar === false) {
            this.navbar.style.display = 'none'; // Скрыть навбар
        } else {
            this.navbar.style.display = 'block'; // Показать навбар
        }
    }
}

// Инициализация роутера с маршрутами
const routes = {
    // '/': 'index.html',
    '/': {
        html: 'templates/signup.html',
        title: 'Lumincoin Finance - Регистрация',
        showNavbar: false,
        load: () => {
            new Signup;
        }
    },
    '/login': {
        html: 'templates/login.html',
        title: 'Lumincoin Finance - Вход',
        showNavbar: false,
        load: () => {
            new Login;
        }
    },
    '/costs': {
        html: 'templates/costs.html',
        title: 'Категории доходов',
        css: [],
        showNavbar: true,
        load: () => {
            new Costs;
        }
    }
    // '/revenues': 'markups/revenues.html',
    // '/transactions': 'markups/transactions.html',
    // '/analytics': 'markups/analytics.html',
    // '/create-cost': 'markups/create_cost.html',
    // '/create-revenue': 'markups/create_revenue.html',
    // '/edit-cost': 'markups/edit_cost.html',
    // '/edit-revenue': 'markups/edit_revenue.html',
    // '/edit-transaction': 'markups/edit_transaction.html',
};


// всё отправить в дист
// new CopyPlugin({
//     patterns: [
//         {from: "./src/markups", to: "templates"},
//         {from: "styles", to: "styles"},
//     ],
// }),
// хешмапы - ключи, в значении объект с информацией


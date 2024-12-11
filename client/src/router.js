import {Signup} from "./components/signup.js";
import {Login} from "./components/login.js";
import {Costs} from "./components/costs.js";
import {Auth} from "../scripts/services/auth.js";
import {Analytics} from "./components/analytics.js";
import {Revenue} from "./components/revenue.js";
import {Transaction} from "./components/transaction.js";

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

    // для охраны от неавторизованных пользователей

    // isAuthenticated() {
    //     return localStorage.getItem(Auth.accessTokenKey) !== null;
    // }

    initEvents() {
        window.addEventListener('DOMContentLoaded', this.handleNavigation.bind(this));
        window.addEventListener('popstate', this.handleNavigation.bind(this));
        document.body.addEventListener('click', this.openNewRoute.bind(this));
    }

    openNewRoute(event) {
        const link = event.target.closest('a');

        if (link) {
            event.preventDefault(); // Предотвращает стандартный переход
            const path = link.getAttribute('href');
            this.navigateTo(path); // Вызов вашего метода для изменения маршрута
        }
    }

    navigateTo(route) {
        const normalizedCurrentPath = this.path.startsWith('/') ? this.path : `/${this.path}`;
        const normalizedRoute = route.startsWith('/') ? route : `/${route}`;

        if (normalizedCurrentPath === normalizedRoute) {
            return;
        }

        history.pushState(null, '', route); // Изменяем историю
        this.path = window.location.pathname; // Обновляем текущий путь
        this.page = this.routes[this.path]; // Обновляем текущую страницу
        this.handleNavigation(); // Загружаем новую страницу
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
        if (this.page && typeof this.page.component) {
            const componentInstance = new this.page.component();
            componentInstance.init();
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
        // для охраны от неавторизованных пользователей
        // if (this.page && this.page.requiresAuth && !this.isAuthenticated()) {
        //     this.navigateTo('/');
        //     return;
        // }

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

                this.toggleNav();

            } catch (error) {
                console.error('Ошибка при загрузке страницы:', error);
                this.appElement.innerHTML = '<h1>Страница не найдена</h1>';
            }
        } else {
            console.error('Маршрут не найден:', this.path);
            this.appElement.innerHTML = '<h1>Маршрут не найден</h1>';
        }
    }

    toggleNav() {
        // Скрываем или показываем навбар в зависимости от флага `showNavbar`
        if (this.page && this.page.showNavbar === false) {
            this.navbar.style.display = 'none'; // Скрыть навбар
            this.navbar.classList.remove('d-flex');
        } else {
            this.navbar.style.display = 'block'; // Показать навбар
            this.navbar.classList.add('d-flex');
        }
    }
}

const routes = {
    '/': {
        html: 'templates/login.html',
        title: 'Lumincoin Finance - Вход',
        showNavbar: false,
        component: Login,
    },
    '/signup': {
        html: 'templates/signup.html',
        title: 'Lumincoin Finance - Регистрация',
        showNavbar: false,
        component: Signup,
    },
    '/costs': {
        html: 'templates/costs.html',
        title: 'Категории расходов',
        css: [],
        showNavbar: true,
        requiresAuth: true,
        component: Costs
    },
    '/revenues': {
        html: 'templates/revenues.html',
        title: 'Категории доходов',
        css: [],
        requiresAuth: true,
        showNavbar: true,
        component: Revenue
    },
    '/transactions': {
        html: 'templates/transactions.html',
        title: 'Доходы и расходы',
        css: [],
        requiresAuth: true,
        showNavbar: true,
        component: Transaction
    },
    '/analytics': {
        html: 'templates/analytics.html',
        title: 'Главная',
        css: [],
        requiresAuth: true,
        showNavbar: true,
        component: Analytics
    },
    '/create-cost': {
        html: 'templates/create_cost.html',
        title: 'Создание категории расходов',
        css: [],
        requiresAuth: true,
        showNavbar: true,
        component: Costs
    },
    '/create-revenue': {
        html: 'templates/create_revenue.html',
        title: 'Создание категории доходов',
        css: [],
        requiresAuth: true,
        showNavbar: true,
        component: Costs
    },
    '/edit-cost': {
        html: 'templates/edit_cost.html',
        title: 'Редактирование категории расходов',
        css: [],
        requiresAuth: true,
        showNavbar: true,
        component: Costs
    },
    '/edit-revenue': {
        html: 'templates/edit_revenue.html',
        title: 'Редактирование категории доходов',
        css: [],
        requiresAuth: true,
        showNavbar: true,
        component: Costs
    },
    '/edit-transaction': {
        html: 'templates/edit_transaction.html',
        title: 'Редактирование дохода/расхода',
        css: [],
        requiresAuth: true,
        showNavbar: true,
        component: Costs
    },
};


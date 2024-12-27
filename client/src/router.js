import {Signup} from "./components/signup.js";
import {Login} from "./components/login.js";
import {Costs} from "./components/costs.js";
import {Auth} from "../scripts/services/auth.js";
import {Analytics} from "./components/analytics.js";
import {Incomes} from "./components/incomes.js";
import {Transaction} from "./components/transaction.js";
import {User} from "./components/user.js";
import {NewCost} from "./components/create_cost.js";
import {NewIncome} from "./components/create_income.js";
import {EditIncome} from "./components/edit_income.js";
import {EditCost} from "./components/edit_cost.js";
import {NewTransaction} from "./components/create_transaction.js";
import {EditTransaction} from "./components/edit_transaction.js";

const DEFAULT_PAGE_TITLE = 'Lumincoin Finance';

const states = {
    STATE_UNAUTHORIZED: 'unauthorized',
    STATE_AUTHORIZED: 'authorized',
}

export class Router {
    constructor() {
        this.routes = routes;

        this.initEvents();
        Auth.processUnauthorizedResponse.bind(this);

        this.appElement = document.getElementById('app');
        this.loadedStyles = new Set(); // Отслеживаем загруженные стили
        this.navbarElement = document.getElementById('navbar');

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

    startLoad() {
        if (this.page && typeof this.page.component) {
            const componentInstance = new this.page.component(this.navigateTo.bind(this));
            componentInstance.init();
        }
    }

    addTitle() {
        document.title = this.page.title ? this.page.title : DEFAULT_PAGE_TITLE;
    }

    async handleNavigation() {
        // для охраны от неавторизованных пользователей
        // if (handlePage.state === states.STATE_AUTHORIZED && !this.isAuthenticated()) {
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
        const showNavbar = this.page?.state === states.STATE_AUTHORIZED;

        if (showNavbar) {
            this.navbarElement.style.display = 'block';
            this.navbarElement.classList.add('d-flex');
            this.turnOnLogoutButton();
        } else {
            this.navbarElement.style.display = 'none';
            this.navbarElement.classList.remove('d-flex');
        }
    }

    turnOnLogoutButton() {
        new User(this.navigateTo.bind(this)).init();
    }
}

const routes = {
    '/': {
        html: 'templates/login.html',
        title: 'Lumincoin Finance - Вход',
        state: states.STATE_UNAUTHORIZED,
        component: Login,
    },
    '/signup': {
        html: 'templates/signup.html',
        title: 'Lumincoin Finance - Регистрация',
        state: states.STATE_UNAUTHORIZED,
        component: Signup,
    },
    '/costs': {
        html: 'templates/costs.html',
        title: 'Категории расходов',
        state: states.STATE_AUTHORIZED,
        component: Costs
    },
    '/incomes': {
        html: 'templates/incomes.html',
        title: 'Категории доходов',
        state: states.STATE_AUTHORIZED,
        component: Incomes
    },
    '/transactions': {
        html: 'templates/transactions.html',
        title: 'Доходы и расходы',
        state: states.STATE_AUTHORIZED,
        component: Transaction
    },
    '/analytics': {
        html: 'templates/analytics.html',
        title: 'Главная',
        state: states.STATE_AUTHORIZED,
        component: Analytics
    },
    '/create-cost': {
        html: 'templates/create_cost.html',
        title: 'Создание категории расходов',
        state: states.STATE_AUTHORIZED,
        component: NewCost
    },
    '/create-income': {
        html: 'templates/create_income.html',
        title: 'Создание категории доходов',
        state: states.STATE_AUTHORIZED,
        component: NewIncome
    },
    '/edit-cost': {
        html: 'templates/edit_cost.html',
        title: 'Редактирование категории расходов',
        state: states.STATE_AUTHORIZED,
        component: EditCost
    },
    '/edit-income': {
        html: 'templates/edit_income.html',
        title: 'Редактирование категории доходов',
        state: states.STATE_AUTHORIZED,
        component: EditIncome
    },
    '/create-transaction': {
        html: 'templates/create_transaction.html',
        title: 'Создание дохода/расхода',
        state: states.STATE_AUTHORIZED,
        component: NewTransaction
    },
    '/edit-transaction': {
        html: 'templates/edit_transaction.html',
        title: 'Редактирование дохода/расхода',
        state: states.STATE_AUTHORIZED,
        component: EditTransaction
    },
};


import {Analytics} from "./components/analytics";
import {Costs} from "./components/costs";
import {NewCost} from "./components/create-cost";
import {NewIncome} from "./components/create-income";
import {NewTransaction} from "./components/create-transaction";
import {EditCost} from "./components/edit-cost";
import {EditIncome} from "./components/edit-income";
import {EditTransaction} from "./components/edit-transaction";
import {Incomes} from "./components/incomes";
import {Login} from "./components/login";
import {Signup} from "./components/signup";
import {Transaction} from "./components/transaction";
import {User} from "./components/user";
import {Auth} from "./services/auth";
import {Route, Routes, RoutePath} from "./types/route-type";
import {states} from "./constants/states";


const DEFAULT_PAGE_TITLE = 'Lumincoin Finance';


export class Router {
    routes: Routes;
    private navbarElement: HTMLElement | null;
    private appElement: HTMLElement | null;
    private path;
    private page: Route | null;

    constructor() {
        this.routes = routes;

        this.initEvents();
        Auth.processUnauthorizedResponse.bind(this);

        this.appElement = document.getElementById('app');
        this.navbarElement = document.getElementById('navbar');

        this.path = window.location.pathname || '/';
        this.page = this.routes[this.path];
    }

    private isAuthenticated(): boolean {
        return localStorage.getItem(Auth.accessTokenKey) !== null;
    }

    private initEvents(): void {
        window.addEventListener('DOMContentLoaded', this.handleNavigation.bind(this));
        window.addEventListener('popstate', this.handleNavigation.bind(this));
        document.body.addEventListener('click', this.openNewRoute.bind(this));
    }

    private openNewRoute(event: MouseEvent): void {
        const target = event.target as HTMLElement;
        const link = event.target.closest('a') as HTMLAnchorElement | null;

        if (link) {
            event.preventDefault(); // Предотвращает стандартный переход
            const path = link.getAttribute('href');
            this.navigateTo(path); // Вызов вашего метода для изменения маршрута
        }
    }

    public navigateTo(route: string): void {
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

    private startLoad(): void {
        if (this.page && typeof this.page.component) {
            const componentInstance = new this.page.component(this.navigateTo.bind(this));
            componentInstance.init();
        }
    }

    addTitle() {
        document.title = this.page.title ? this.page.title : DEFAULT_PAGE_TITLE;
    }

    private async handleNavigation() {
        const handlePage = this.page ?? null;

        if (handlePage?.state === states.STATE_AUTHORIZED && !this.isAuthenticated()) {
            this.navigateTo('/login');
            return;
        }

        if (!handlePage) {
            console.error('Маршрут не найден:', this.path);
            this.appElement.innerHTML = '<h1>Маршрут не найден</h1>';
            return;
        }

        try {
            const html = await fetch(handlePage.html).then(response => response.text());

            // Создаем промис, который разрешится, когда DOM будет готов
            const domReadyPromise = new Promise(resolve => {
                requestAnimationFrame(() => {
                    this.appElement.innerHTML = html;
                    // Даем браузеру время на обработку DOM
                    setTimeout(resolve, 0);
                });
            });

            // Ждем, пока DOM будет готов
            await domReadyPromise;

            // Теперь можно безопасно инициализировать компонент
            this.startLoad();
            this.addTitle();
            this.toggleNav();

        } catch (error) {
            console.error('Ошибка при загрузке страницы:', error);
            this.appElement.innerHTML = '<h1>Страница не найдена</h1>';
        }
    }

    toggleNav() {
        if (!this.navbarElement) return;

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

const routes: Routes = {
    '/login': {
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
    '/': {
        html: 'templates/analytics.html',
        title: 'Главная',
        state: states.STATE_AUTHORIZED,
        component: Analytics
    },
    '/create-cost': {
        html: 'templates/create-cost.html',
        title: 'Создание категории расходов',
        state: states.STATE_AUTHORIZED,
        component: NewCost
    },
    '/create-income': {
        html: 'templates/create-income.html',
        title: 'Создание категории доходов',
        state: states.STATE_AUTHORIZED,
        component: NewIncome
    },
    '/edit-cost': {
        html: 'templates/edit-cost.html',
        title: 'Редактирование категории расходов',
        state: states.STATE_AUTHORIZED,
        component: EditCost
    },
    '/edit-income': {
        html: 'templates/edit-income.html',
        title: 'Редактирование категории доходов',
        state: states.STATE_AUTHORIZED,
        component: EditIncome
    },
    '/create-transaction': {
        html: 'templates/create-transaction.html',
        title: 'Создание дохода/расхода',
        state: states.STATE_AUTHORIZED,
        component: NewTransaction
    },
    '/edit-transaction': {
        html: 'templates/edit-transaction.html',
        title: 'Редактирование дохода/расхода',
        state: states.STATE_AUTHORIZED,
        component: EditTransaction
    },
};


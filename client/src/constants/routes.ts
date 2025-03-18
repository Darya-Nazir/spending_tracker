import {Routes} from "../types/route-type";
import {states} from "./states";
import {Login} from "../components/login";
import {Signup} from "../components/signup";
import {Costs} from "../components/costs";
import {Incomes} from "../components/incomes";
import {Transaction} from "../components/transaction";
import {Analytics} from "../components/analytics";
import {NewCost} from "../components/create-cost";
import {NewIncome} from "../components/create-income";
import {EditCost} from "../components/edit-cost";
import {EditIncome} from "../components/edit-income";
import {NewTransaction} from "../components/create-transaction";
import {EditTransaction} from "../components/edit-transaction";

export const routes: Routes = {
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


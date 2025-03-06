import {states} from "../constants/states";


export type Routes = Record<RoutePath, Route>;

export type NavigateFunction = (route: RoutePath) => void;

export type ComponentWithInit = {
    new (navigateTo: NavigateFunction): {
        init(): void;
    };
};

// Тип для компонентов, наследующих init от родительского класса
export type ComponentWithInheritedInit = {
    new ( navigateTo: (path: RoutePath) => void): any;
};

// Объединённый тип для любого компонента
export type ComponentConstructor = ComponentWithInit | ComponentWithInheritedInit;

export type Route = {
    html: string,
    title: string,
    state: typeof states[keyof typeof states],
    component: ComponentConstructor
};

export type RoutePathBase =
    | '/login'
    | '/signup'
    | '/costs'
    | '/incomes'
    | '/transactions'
    | '/'
    | '/create-cost'
    | '/create-income'
    | '/edit-cost'
    | '/edit-income'
    | '/create-transaction'
    | '/edit-transaction';

export type RoutePath = RoutePathBase | `${RoutePathBase}?id=${string}`;


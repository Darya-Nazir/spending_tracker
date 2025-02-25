import {states} from "../constants/states";


export type Routes = Record<RoutePath, Route>;

type NavigateFunction = (route: RoutePath) => void;

export type Route = {
    html: string,
    title: string,
    state: typeof states[keyof typeof states],
    component: new (navigateTo: NavigateFunction) => {
        init(): void;
    }
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
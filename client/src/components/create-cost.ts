import { NewCard } from "./base-class/new-card.js";
import {RoutePath} from "../types/route-type";

export class NewCost extends NewCard {
    constructor(navigateTo: (path: RoutePath) => void) {
        super(navigateTo, 'http://localhost:3000/api/categories/expense', '/costs');
    }
}


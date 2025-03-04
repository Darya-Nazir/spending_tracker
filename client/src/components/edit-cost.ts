import { EditCard } from "./base-class/edit-card";
import {RoutePath} from "../types/route-type";

export class EditCost extends EditCard {
    constructor(navigateTo: (path: RoutePath) => void) {
        super(navigateTo, 'http://localhost:3000/api/categories/expense', '/costs');
    }
}


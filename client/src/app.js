import 'jquery';
import '@popperjs/core';
import 'bootstrap';
import 'bootstrap-datepicker';
import 'bootstrap-datepicker/dist/locales/bootstrap-datepicker.ru.min.js';

import { Router } from "./router.js";

class App {
    constructor() {
        new Router();
    }
}

(new App());


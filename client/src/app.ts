// Импортируем глобальные типы для jQuery
/// <reference types="jquery" />
/// <reference types="bootstrap" />

// Импортируем библиотеки
import 'jquery';
import '@popperjs/core';
import 'bootstrap';

// Для bootstrap-datepicker может не быть типов, поэтому используем require
// или объявляем модуль самостоятельно
import 'bootstrap-datepicker';
import 'bootstrap-datepicker/dist/locales/bootstrap-datepicker.ru.min';

import { Router } from "./router";

class App {
    constructor() {
        new Router();
    }
}

(new App());


"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const path_1 = require("path");
const url_1 = require("url");
const globals_1 = require("@jest/globals");
require("@testing-library/jest-dom");
const signup_js_1 = require("../../src/components/signup.js");
const auth_js_1 = require("../../src/services/auth.js");
const default_categories_js_1 = require("../../src/services/default-categories.js");
const http_js_1 = require("../../src/services/http.js");
const http_js_2 = require("../mocks/handlers/http.js");
const event_js_1 = require("../mocks/utils/event.js");
// Определяем моки
const httpMock = (0, http_js_2.createHttpMock)();
const defaultCategoriesManagerMock = {
    processLogin: globals_1.jest.fn(),
    setupDefaultCategories: globals_1.jest.fn()
};
describe('Signup Component', () => {
    let signup;
    let mockNavigateTo;
    let signupFormHtml;
    // Объект, содержащий маппинг полей формы
    const formFields = {
        fullName: 'fullNameInput',
        email: 'emailInput',
        password: 'passwordInput',
        passwordRepeat: 'confirmPasswordInput'
    };
    // Тестовые данные пользователя
    const user = {
        fullName: 'Иван Иванов',
        email: 'test@example.com',
        password: 'Password123!',
        passwordRepeat: 'Password123!'
    };
    // Вспомогательная функция для заполнения формы
    const fillFormFields = (component, data) => {
        Object.entries(formFields).forEach(([dataKey, inputField]) => {
            component[inputField].value = data[dataKey];
        });
    };
    beforeAll(() => {
        http_js_1.Http.request = httpMock.request;
        default_categories_js_1.DefaultCategoriesManager.processLogin = defaultCategoriesManagerMock.processLogin;
        default_categories_js_1.DefaultCategoriesManager.setupDefaultCategories = defaultCategoriesManagerMock.setupDefaultCategories;
        signupFormHtml = (0, node_fs_1.readFileSync)((0, path_1.join)((0, path_1.dirname)((0, url_1.fileURLToPath)(import.meta.url)), '../fixtures/html/signup-form.html'), 'utf8');
    });
    beforeEach(() => {
        auth_js_1.Auth.accessTokenKey = 'test_access_token';
        document.body.innerHTML = signupFormHtml;
        mockNavigateTo = globals_1.jest.fn();
        signup = new signup_js_1.Signup(mockNavigateTo);
        signup.initializeEventListeners();
    });
    afterEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        document.body.innerHTML = '';
        globals_1.jest.clearAllMocks();
    });
    test('should successfully submit a registration form', () => __awaiter(void 0, void 0, void 0, function* () {
        // Заполняем форму используя вспомогательную функцию
        fillFormFields(signup, user);
        http_js_1.Http.request.mockResolvedValueOnce(true);
        default_categories_js_1.DefaultCategoriesManager.processLogin.mockResolvedValueOnce(true);
        default_categories_js_1.DefaultCategoriesManager.setupDefaultCategories.mockResolvedValueOnce();
        yield signup.submitForm(user);
        expect(http_js_1.Http.request).toHaveBeenCalledWith('http://localhost:3000/api/signup', 'POST', user, false);
        expect(default_categories_js_1.DefaultCategoriesManager.processLogin).toHaveBeenCalledWith({
            email: user.email,
            password: user.password,
            rememberMe: false
        });
        expect(mockNavigateTo).toHaveBeenCalledWith('/');
    }));
    test('should show validation errors with empty fields', () => {
        const mockEvent = (0, event_js_1.createMockEvent)();
        signup.handleSubmit(mockEvent);
        expect(mockEvent.preventDefault).toHaveBeenCalled();
        expect(signup.form.classList.contains('was-validated')).toBeTruthy();
        expect(signup.fullNameInput.classList.contains('is-invalid')).toBeTruthy();
    });
    test('should show an error if passwords do not match', () => {
        const invalidUser = Object.assign(Object.assign({}, user), { passwordRepeat: 'DifferentPassword123!' });
        fillFormFields(signup, invalidUser);
        const mockEvent = (0, event_js_1.createMockEvent)();
        signup.handleSubmit(mockEvent);
        expect(signup.confirmPasswordInput.classList.contains('is-invalid')).toBeTruthy();
        expect(signup.confirmPasswordInput.validationMessage).toBe('Пароли не совпадают');
    });
});

import { readFileSync } from 'node:fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { jest } from '@jest/globals';
import '@testing-library/jest-dom';

import { Signup } from '../../src/components/signup.js';
import { Auth } from "../../src/services/auth.js";
import { DefaultCategoriesManager } from '../../src/services/default-categories.js';
import { Http } from '../../src/services/http.js';
import { createHttpMock } from '../mocks/handlers/http.js';
import { createMockEvent } from '../mocks/utils/event.js';

Auth.accessTokenKey = 'test_access_token';
test.describe.configure({ mode: 'serial' });

// Определяем моки
const httpMock = createHttpMock();

const defaultCategoriesManagerMock = {
    processLogin: jest.fn(),
    setupDefaultCategories: jest.fn()
};

// Переопределяем методы
Http.request = httpMock.request;
DefaultCategoriesManager.processLogin = defaultCategoriesManagerMock.processLogin;
DefaultCategoriesManager.setupDefaultCategories = defaultCategoriesManagerMock.setupDefaultCategories;

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
        signupFormHtml = readFileSync(
            join(dirname(fileURLToPath(import.meta.url)), '../fixtures/html/signup-form.html'),
            'utf8'
        );
    });

    beforeEach(() => {
        document.body.innerHTML = signupFormHtml;
        mockNavigateTo = jest.fn();
        signup = new Signup(mockNavigateTo);
        signup.initializeEventListeners();
        jest.clearAllMocks();
    });

    afterEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    test('should successfully submit a registration form', async () => {
        // Заполняем форму используя вспомогательную функцию
        fillFormFields(signup, user);

        Http.request.mockResolvedValueOnce(true);
        DefaultCategoriesManager.processLogin.mockResolvedValueOnce(true);
        DefaultCategoriesManager.setupDefaultCategories.mockResolvedValueOnce();

        await signup.submitForm(user);

        expect(Http.request).toHaveBeenCalledWith(
            'http://localhost:3000/api/signup',
            'POST',
            user,
            false
        );

        expect(DefaultCategoriesManager.processLogin).toHaveBeenCalledWith({
            email: user.email,
            password: user.password,
            rememberMe: false
        });

        expect(mockNavigateTo).toHaveBeenCalledWith('/');
    });

    test('should show validation errors with empty fields', () => {
        const mockEvent = createMockEvent();
        signup.handleSubmit(mockEvent);

        expect(mockEvent.preventDefault).toHaveBeenCalled();
        expect(signup.form.classList.contains('was-validated')).toBeTruthy();
        expect(signup.fullNameInput.classList.contains('is-invalid')).toBeTruthy();
    });

    test('should show an error if passwords do not match', () => {
        const invalidUser = { ...user, passwordRepeat: 'DifferentPassword123!' };
        fillFormFields(signup, invalidUser);

        const mockEvent = createMockEvent();
        signup.handleSubmit(mockEvent);

        expect(signup.confirmPasswordInput.classList.contains('is-invalid')).toBeTruthy();
        expect(signup.confirmPasswordInput.validationMessage).toBe('Пароли не совпадают');
    });
});
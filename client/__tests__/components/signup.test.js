import { readFileSync } from 'node:fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { jest } from '@jest/globals';
import '@testing-library/jest-dom';

import { Signup } from '../../src/components/signup.js';
import { DefaultCategoriesManager } from '../../src/services/default-categories.js';
import { Http } from '../../src/services/http.js';
import { createHttpMock } from '../mocks/handlers/http.js';
import { createMockEvent } from '../mocks/utils/event.js';


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

    beforeAll(() => {
        signupFormHtml = readFileSync(
            join(dirname(fileURLToPath(import.meta.url)), '../fixtures/html/signup-form.html'),
            'utf8'
        );
    });

    // Выносим тестовые данные пользователя в общую область
    const user = {
        name: 'Иван Иванов',
        email: 'test@example.com',
        password: 'Password123!',
        passwordRepeat: 'Password123!'
    };

    beforeEach(() => {
        document.body.innerHTML = signupFormHtml;

        mockNavigateTo = jest.fn();
        signup = new Signup(mockNavigateTo);
        signup.initializeEventListeners();
        jest.clearAllMocks();
    });

    afterEach(() => {
        document.body.innerHTML = '';
        jest.restoreAllMocks();
    });

    test('should successfully submit a registration form', async () => {
        signup.fullNameInput.value = user.name;
        signup.emailInput.value = user.email;
        signup.passwordInput.value = user.password;
        signup.confirmPasswordInput.value = user.passwordRepeat;

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
        signup.fullNameInput.value = user.name;
        signup.emailInput.value = user.email;
        signup.passwordInput.value = user.password;
        signup.confirmPasswordInput.value = 'DifferentPassword123!';

        const mockEvent = createMockEvent();
        signup.handleSubmit(mockEvent);

        expect(signup.confirmPasswordInput.classList.contains('is-invalid')).toBeTruthy();
        expect(signup.confirmPasswordInput.validationMessage).toBe('Пароли не совпадают');
    });
});


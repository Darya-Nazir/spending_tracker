import { Http } from '../../src/services/http.js';
import { DefaultCategoriesManager } from '../../src/services/default-categories.js';
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';
import { Signup } from '../../src/components/signup.js';
import signupFormTemplate from '../fixtures/signup-form.html';

// Определяем моки
const httpMock = { request: jest.fn() };


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


    beforeEach(() => {
        // Создаём DOM с полной структурой из разметки
        document.body.innerHTML = `
           <div class="container">
               <form id="registrationForm" novalidate>
                   <div class="input-group has-validation">
                       <input type="text" class="form-control" id="fullName" required>
                       <div class="invalid-feedback"></div>
                   </div>
                   <div class="input-group has-validation">
                       <input type="email" class="form-control" id="email" required>
                       <div class="invalid-feedback"></div>
                   </div>
                   <div class="input-group has-validation">
                       <input type="password" class="form-control" id="password" required>
                       <div class="invalid-feedback"></div>
                   </div>
                   <div class="input-group has-validation">
                       <input type="password" class="form-control" id="confirmPassword" required>
                       <div class="invalid-feedback"></div>
                   </div>
               </form>
           </div>
       `;


        mockNavigateTo = jest.fn();


        // Инициализируем компонент
        signup = new Signup(mockNavigateTo);


        // Инициализируем обработчики событий
        signup.initializeEventListeners();


        // Очищаем все моки
        jest.clearAllMocks();
    });


    afterEach(() => {
        document.body.innerHTML = '';
        jest.restoreAllMocks();
    });


    test('должен успешно отправить форму регистрации', async () => {
        const testData = {
            name: 'Иван Иванов',
            email: 'test@example.com',
            password: 'Password123!',
            passwordRepeat: 'Password123!'
        };


        // Заполняем поля формы
        signup.fullNameInput.value = testData.name;
        signup.emailInput.value = testData.email;
        signup.passwordInput.value = testData.password;
        signup.confirmPasswordInput.value = testData.passwordRepeat;


        // Мокаем успешные ответы
        Http.request.mockResolvedValueOnce(true);
        DefaultCategoriesManager.processLogin.mockResolvedValueOnce(true);
        DefaultCategoriesManager.setupDefaultCategories.mockResolvedValueOnce();


        // Вызываем метод отправки формы
        await signup.submitForm(testData);


        // Проверяем, что запросы были вызваны корректно
        expect(Http.request).toHaveBeenCalledWith(
            'http://localhost:3000/api/signup',
            'POST',
            testData,
            false
        );


        expect(DefaultCategoriesManager.processLogin).toHaveBeenCalledWith({
            email: testData.email,
            password: testData.password,
            rememberMe: false
        });


        expect(mockNavigateTo).toHaveBeenCalledWith('/');
    });


    test('должен показать ошибки валидации при пустых полях', () => {
        // Создаем событие submit
        const mockEvent = { preventDefault: jest.fn() };


        // Вызываем обработчик отправки формы
        signup.handleSubmit(mockEvent);


        // Проверяем, что preventDefault был вызван
        expect(mockEvent.preventDefault).toHaveBeenCalled();


        // Проверяем, что форма помечена как провалидированная
        expect(signup.form.classList.contains('was-validated')).toBeTruthy();


        // Проверяем, что поля помечены как невалидные
        expect(signup.fullNameInput.classList.contains('is-invalid')).toBeTruthy();
    });


    test('должен показать ошибку при несовпадающих паролях', () => {
        // Заполняем форму с разными паролями
        signup.fullNameInput.value = 'Иван Иванов';
        signup.emailInput.value = 'test@example.com';
        signup.passwordInput.value = 'Password123!';
        signup.confirmPasswordInput.value = 'DifferentPassword123!';


        const mockEvent = { preventDefault: jest.fn() };


        signup.handleSubmit(mockEvent);


        // Проверяем, что поле подтверждения пароля помечено как невалидное
        expect(signup.confirmPasswordInput.classList.contains('is-invalid')).toBeTruthy();
        expect(signup.confirmPasswordInput.validationMessage).toBe('Пароли не совпадают');
    });
});

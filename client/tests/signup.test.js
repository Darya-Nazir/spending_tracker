import { server } from '../mocks/server.js';  // поменяли расширение на .js и используем import

describe('Signup tests', () => {
    // Перед всеми тестами запускаем сервер
    beforeAll(() => server.listen());

    // После каждого теста сбрасываем обработчики
    afterEach(() => server.resetHandlers());

    // После всех тестов останавливаем сервер
    afterAll(() => server.close());

    test('signup form should work correctly', async () => {
        // Здесь будет ваш тест
        expect(true).toBe(true);  // Временная заглушка
    });
});
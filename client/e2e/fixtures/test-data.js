// Общие моки для тестов
export const mockTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token'
};

export const mockCategories = {
    income: [
        { id: 1, title: 'Зарплата' },
        { id: 2, title: 'Фриланс' }
    ],
    expense: [
        { id: 1, title: 'Продукты' },
        { id: 2, title: 'Транспорт' }
    ]
};

export const mockErrorMessages = {
    unauthorized: 'Unauthorized',
    categoryExists: 'Такая категория уже существует',
    emptyCategory: 'Введите название категории!',
    categoryUpdateFailed: 'Не удалось обновить категорию, попробуйте еще раз.',
    categoryLoadFailed: 'Не удалось загрузить данные категории!',
    categoryAddFailed: 'Не удалось добавить категорию, попробуйте еще раз.',
    invalidCredentials: 'Пользователь с такими данными не зарегистрирован'
};
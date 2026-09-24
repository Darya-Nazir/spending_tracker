export class AppError extends Error {
    readonly status: number;

    constructor(message: string, status: number) {
        super(message);
        // Иначе во всех наследниках name остался бы 'Error'.
        this.name = new.target.name;
        this.status = status;
    }
}

/** 400. Тело или query-параметры не прошли проверку. */
export class ValidationError extends AppError {
    constructor(message: string) {
        super(message, 400);
    }
}

/** 401. Нет токена, токен недействителен или пара email + пароль не подошла. */
export class UnauthorizedError extends AppError {
    constructor(message: string) {
        super(message, 401);
    }
}

/**
 * 404. Роут не существует, или запрошенная строка не принадлежит этому
 * пользователю
 */
export class NotFoundError extends AppError {
    constructor(message: string) {
        super(message, 404);
    }
}

/** 409. Строка нарушает уникальность: занятый email, повтор названия категории. */
export class ConflictError extends AppError {
    constructor(message: string) {
        super(message, 409);
    }
}

/** 429. Число запросов от одного ключа превысило лимит окна: см. rate-limit.ts. */
export class TooManyRequestsError extends AppError {
    constructor(message: string) {
        super(message, 429);
    }
}

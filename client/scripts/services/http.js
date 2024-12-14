export class Http {
    constructor() {
    }

    static async request(path, data) {
        const response = await fetch(path, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Ошибка:', errorData);
            return { error: true, message: errorData }; // Возвращаем ошибку с сообщением
        }

        const result = await response.json();
        console.log('Успешно:', result);
        return result;
    }
}
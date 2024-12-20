import {Auth} from "./auth.js";

export class Http {
    static async request(url, method = 'GET', body = null) {
        // debugger
        const params = await this.createRequestParams(method, body);

        const response = await fetch(url, params);

        if (response.status < 200 || response.status >= 300) {
            return await this.handleError(response, url, method, body);
        }

        const jsonResponse = await response.json();
        // console.log('static async request: ', jsonResponse.message);
        return jsonResponse;
    }

    // Метод для создания параметров запроса
    static async createRequestParams(method, body) {
        const params = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        this.addAuthTokenToHeaders(params); // Добавление токена

        if (body) {
            params.body = JSON.stringify(body);
        }

        return params;
    }

    // Метод для добавления токена в заголовки запроса
    static addAuthTokenToHeaders(params) {
        let token = localStorage.getItem(Auth.accessTokenKey);
        if (token) {
            params.headers['Authorization'] =`Bearer ${token}` ;
        }
    }

    // Метод для обработки ошибок, включая статус 401
    static async handleError(response, url, method, body) {
        if (response.status === 401) {
            const result = await this.handleUnauthorizedAccess();
            if (result) {

                return await this.request(url, method, body); // Повторный запрос с новым токеном
            } else {
                return null;
            }
        }

        throw new Error('static async handleError: ' + response.statusText);
    }

    // Метод для обработки неавторизованного доступа (статус 401)
    static async handleUnauthorizedAccess() {
        return await Auth.processUnauthorizedResponse();
    }
}


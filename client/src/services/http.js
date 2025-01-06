import { Auth } from "./auth.js";

export class Http {
    static async request(url, method = 'GET', body = null, requiresAuth = true) {
        const params = await this.createRequestParams(method, body, requiresAuth);
        const response = await fetch(url, params);

        if (response.status < 200 || response.status >= 300) {
            return await this.handleError(response, url, method, body, requiresAuth);
        }

        return await response.json();
    }

    static async createRequestParams(method, body, requiresAuth = true) {
        const params = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        if (requiresAuth) {
            this.addAuthTokenToHeaders(params);
        }

        if (body) {
            params.body = JSON.stringify(body);
        }

        return params;
    }

    static addAuthTokenToHeaders(params) {
        const token = localStorage.getItem(Auth.accessTokenKey);
        if (token) {
            params.headers['Authorization'] = `Bearer ${token}`;
        }
    }

    static async handleError(response, url, method, body, requiresAuth) {
        if (response.status === 401 && requiresAuth) {
            const result = await this.handleUnauthorizedAccess();
            if (result) {
                return await this.request(url, method, body, requiresAuth);
            }
        }
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }

    static async handleUnauthorizedAccess() {
        return await Auth.processUnauthorizedResponse();
    }
}


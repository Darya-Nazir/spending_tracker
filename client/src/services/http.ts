import { Auth } from "./auth";
import {HttpMethod, RequestParams} from "../types/http-type";

export class Http {
    public static async request<T = any>(
        url: string,
        method: HttpMethod = 'GET',
        body: any = null,
        requiresAuth: boolean = true
    ): Promise<T> {
        const params: RequestInit = await this.createRequestParams(method, body, requiresAuth);
        const response: Response = await fetch(url, params);

        if (response.status < 200 || response.status >= 300) {
            return await this.handleError(response, url, method, body, requiresAuth);
        }

        return await response.json();
    }

    public static async createRequestParams(method: HttpMethod, body: string, requiresAuth = true): Promise<RequestParams> {
        const params: RequestParams = {
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

    public static addAuthTokenToHeaders(params: RequestParams): void {
        const token = localStorage.getItem(Auth.accessTokenKey);
        if (token) {
            params.headers['Authorization'] = `Bearer ${token}`;
        }
    }

    public static async handleError<T = any>(response: Response, url: string, method: HttpMethod, body: any, requiresAuth: boolean): Promise<T> {
        if (response.status === 401 && requiresAuth) {
            const result = await this.handleUnauthorizedAccess();
            if (result) {
                return await this.request(url, method, body, requiresAuth);
            }
        }
        const responseBody = await response.json();
        let errorMsg = `HTTP: ${response.status} ${response.statusText}`;
        if (responseBody.message) {
            errorMsg += '. ' + responseBody.message;
        }
        throw new Error(errorMsg);
    }

    static async handleUnauthorizedAccess() {
        return await Auth.processUnauthorizedResponse();
    }
}


export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export type RequestParams = {
    method: HttpMethod;
    headers: Record<string, string>;
    body?: string;
}
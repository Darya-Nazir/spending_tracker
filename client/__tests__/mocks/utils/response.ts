type ResponseData = Record<string, any>;

export const createResponse = (
        data: ResponseData,
    status: number = 200,
    delay: number = 500
): Promise<Response> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(new Response(JSON.stringify(data), {
                status,
                headers: { 'Content-Type': 'application/json' }
            }));
        }, delay);
    });
};
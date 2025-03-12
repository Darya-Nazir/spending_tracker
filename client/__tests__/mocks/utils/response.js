export const createResponse = (data, status = 200, delay = 500) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(new Response(JSON.stringify(data), {
                status,
                headers: { 'Content-Type': 'application/json' }
            }));
        }, delay);
    });
};
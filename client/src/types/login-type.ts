export type LoginData = {
    email: string;
    password: string;
}

export type LoginResponse = {
    tokens: {
        accessToken: string;
        refreshToken: string;
    };
    user: {
        id: string;
        name: string;
    };
}
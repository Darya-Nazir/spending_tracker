export class Auth {
    static navigateToPath = null;

    // Метод для инициализации
    static initialize(navigateFunction) {
        this.navigateToPath = navigateFunction;
    }

    static accessTokenKey = 'accessToken';
    static refreshTokenKey = 'refreshToken';
    static userInfoKey = 'userInfo';

    static async processUnauthorizedResponse() {
        const refreshToken = localStorage.getItem(this.refreshTokenKey);
        if (refreshToken) {
            const response = await fetch('http://localhost:3000/api/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ refreshToken: refreshToken })
            });

            if (response && response.status === 200) {
                const result = await response.json();
                if (result && !result.error) {
                    const tokens = result.tokens;
                    this.setTokens(tokens.accessToken, tokens.refreshToken);
                    return true;
                }
            }
        }

        this.removeTokens();
        if (this.navigateToPath) {
            this.navigateToPath('/');
        }
        return false;
    }

    static setTokens(accessToken, refreshToken) {
        localStorage.setItem(this.accessTokenKey, accessToken);
        localStorage.setItem(this.refreshTokenKey, refreshToken);
    }

    static removeTokens() {
        localStorage.removeItem(this.accessTokenKey);
        localStorage.removeItem(this.refreshTokenKey);
        localStorage.removeItem(this.userInfoKey);
    }

    static setUserInfo(info) {
        localStorage.setItem(this.userInfoKey, JSON.stringify(info))
    }

    static getUserInfo() {
        const userInfo = localStorage.getItem(this.userInfoKey);
        if (userInfo) {
            return JSON.parse(userInfo);
        }

        return null;
    }
}


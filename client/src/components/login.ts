import { Validation } from "./base-class/validation";
import { Auth } from "../services/auth";
import { Http } from "../services/http";
import {RoutePath} from "../types/route-type";

export class Login extends Validation {
    private rememberMeElement: HTMLInputElement | null = null;

    constructor(navigateTo: (path: RoutePath) => void) {
        super(navigateTo);
        this.rememberMeElement = document.getElementById('rememberMe') as HTMLInputElement;
        Auth.initialize(navigateTo);
    }

    public initializeEventListeners(): void {
        if (!this.form) return;
        this.form.addEventListener('submit', this.handleSubmit.bind(this));
    }

    private handleSubmit(event: SubmitEvent): void {
        event.preventDefault();
        this.form!.classList.remove('was-validated');

        const isValid = this.validateEmail() && this.validatePassword();
        this.form!.classList.add('was-validated');

        if (isValid) {
            this.submitForm();
        }
    }

    private jumpIntoApp(): void {
        this.navigateToPath('/');
    }

    private async submitForm(): Promise<void> {
        if (this.areInputsMissing()) return;

        const emailValue = this.emailInput!.value.trim();
        const passwordValue = this.passwordInput!.value;

        try {
            const dataObject = {
                email: emailValue,
                password: passwordValue,
                rememberMe: this.rememberMeElement!.checked,
            };

            const path = 'http://localhost:3000/api/login';
            // Указываем false для requiresAuth
            const result = await Http.request(path, 'POST', dataObject, false);

            const userInfo = {
                id: result.user.id,
                name: result.user.name,
            }

            Auth.setTokens(result.tokens.accessToken, result.tokens.refreshToken);
            Auth.setUserInfo(userInfo);
            this.jumpIntoApp();
        } catch (error: unknown) {
            console.error('Ошибка при отправке:', error);

            if (error instanceof Error) {
                const statusMatch: RegExpMatchArray | null = error.message.match(/HTTP: (\d+)/);
                if (statusMatch && statusMatch.length > 0 && parseInt(statusMatch[1]) === 401) {
                    alert('Пользователь с такими данными не зарегистрирован');
                    return;
                }

                if (error.message.includes('email or password')) {
                    alert('Неверная электронная почта или пароль');
                    return;
                }
            }
            alert('Произошла ошибка при входе. Пожалуйста, попробуйте позже.');
        }
    }

    areInputsMissing(): boolean {
        if (!this.emailInput) return true;
        if (!this.passwordInput) return true;
        if (!this.rememberMeElement) return true;
        return false;
    }
}


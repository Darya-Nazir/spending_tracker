import { Http } from "../services/http";
import { Validation } from "./base-class/validation";
import { DefaultCategoriesManager } from "../services/default-categories";
import {RoutePath} from "../types/route-type";
import {SignupFormData} from "../types/signup-type";

export class Signup extends Validation {
    private fullNameInput: HTMLInputElement | null;
    private confirmPasswordInput: HTMLInputElement | null;

    constructor(navigateTo: (path: RoutePath) => void) {
        super(navigateTo);
        this.fullNameInput = document.getElementById('fullName') as HTMLInputElement;
        this.confirmPasswordInput = document.getElementById('confirmPassword') as HTMLInputElement;
    }

    public initializeEventListeners(): void {
        if (!this.form) return;
        this.form.addEventListener('submit', this.handleSubmit.bind(this));
    }

    private handleSubmit(event: SubmitEvent): void {
        event.preventDefault();
        this.form!.classList.remove('was-validated');

        this.ifArentInputs();

        let isValid: boolean = true;
        isValid = this.validateField(this.fullNameInput!, (value: string): boolean =>
            value.trim() !== '', 'Пожалуйста, введите полное имя') && isValid;
        isValid = this.validateEmail() && isValid;
        isValid = this.validatePassword() && isValid;
        isValid = this.validateField(this.confirmPasswordInput!, (value: string): boolean =>
            value === this.passwordInput!.value, 'Пароли не совпадают') && isValid;

        this.form!.classList.add('was-validated');

        if (isValid) {
            this.submitForm({
                name: this.fullNameInput!.value.trim(),
                email: this.emailInput!.value.trim(),
                password: this.passwordInput!.value,
                passwordRepeat: this.confirmPasswordInput!.value
            });
        }
    }

    private validateField(field: HTMLInputElement, validationFn: (value: string) => boolean, errorMessage: string): boolean {
        if (!validationFn(field.value)) {
            field.classList.add('is-invalid');
            field.setCustomValidity(errorMessage);
            return false;
        }
        field.classList.remove('is-invalid');
        field.classList.add('is-valid');
        field.setCustomValidity('');
        return true;
    }

    async submitForm(data: SignupFormData) {
        try {
            const signupPath = 'http://localhost:3000/api/signup';
            const signupResult = await Http.request(signupPath, 'POST', data, false);

            if (signupResult) {
                const loginData = {
                    email: data.email,
                    password: data.password,
                    rememberMe: false
                };

                const loginSuccess = await DefaultCategoriesManager.processLogin(loginData);

                if (loginSuccess) {
                    await DefaultCategoriesManager.setupDefaultCategories();
                    this.navigateToPath('/');
                }
            }
        } catch (error) {
            console.error('Ошибка при отправке:', error);
            alert('Произошла ошибка при регистрации. Пожалуйста, попробуйте позже.');
        }
    }
    private ifArentInputs(): void {
        if (!this.fullNameInput) return;
        if (!this.emailInput) return;
        if (!this.passwordInput) return;
        if (!this.confirmPasswordInput) return;
    }
}


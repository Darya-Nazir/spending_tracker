import {RoutePath} from "../../types/route-type";

export class Validation {
    protected form: HTMLFormElement | null;
    protected emailInput: HTMLInputElement | null;
    protected passwordInput: HTMLInputElement | null;
    private emailRegex: RegExp;
    protected navigateToPath: (path: RoutePath) => void;

    constructor(navigateTo: (path: RoutePath) => void) {
        if (this.constructor === Validation) {
            throw new Error('Validation is an abstract class and cannot be instantiated directly');
        }

        this.form = document.getElementById('registrationForm') as HTMLFormElement;
        this.emailInput = document.getElementById('email') as HTMLInputElement;
        this.passwordInput = document.getElementById('password') as HTMLInputElement;
        this.emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        this.navigateToPath = navigateTo;
    }

    protected init(): void {
        if (this.form) {
            this.initializeEventListeners();
        }
    }

    protected initializeEventListeners(): void {
        throw new Error('Method initializeEventListeners() must be implemented in derived class');
    }

    protected validateEmail(): boolean {
        if (!this.emailRegex.test((this.emailInput as HTMLInputElement).value.trim())) {
            this.markInputAsInvalid(this.emailInput!);
            return false;
        }
        this.markInputAsValid(this.emailInput!);
        return true;
    }

    protected validatePassword(minLength = 6): boolean {
        if ((this.passwordInput as HTMLInputElement).value.length < minLength) {
            this.markInputAsInvalid(this.passwordInput!);
            return false;
        }
        this.markInputAsValid(this.passwordInput!);
        return true;
    }

    protected markInputAsInvalid(inputElement: HTMLInputElement) {
        inputElement.classList.remove('is-valid');
        inputElement.classList.add('is-invalid');
    }

    protected markInputAsValid(inputElement: HTMLInputElement) {
        inputElement.classList.remove('is-invalid');
        inputElement.classList.add('is-valid');
    }

    protected areInputsMissing(...inputs: (HTMLElement | null)[]): boolean {
        return inputs.some((input: HTMLElement | null): input is null => !input);
    }
}


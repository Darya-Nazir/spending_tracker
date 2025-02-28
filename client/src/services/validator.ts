export class Validator {
    public static areInputsMissing(...inputs: (HTMLElement | null)[]): boolean {
        return inputs.some((input: HTMLElement | null): input is null => !input);
    }
}


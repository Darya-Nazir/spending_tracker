export class Validator {
    public static areElementsMissing(...elements: (HTMLElement | null)[]): boolean {
        return elements.some((input: HTMLElement | null): input is null => !input);
    }
}


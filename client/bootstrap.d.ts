declare namespace bootstrap {
    interface ModalOptions {
        backdrop?: boolean | 'static';
        keyboard?: boolean;
        focus?: boolean;
    }

    class Modal {
        constructor(element: HTMLElement | null, options?: ModalOptions);
        show(): void;
        hide(): void;
        toggle(): void;
        dispose(): void;
        static getInstance(element: HTMLElement | null): Modal | null;
    }
}


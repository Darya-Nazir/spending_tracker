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

    interface PopoverOptions {
        container?: string | HTMLElement | false;
        content?: string | HTMLElement | Function;
        delay?: number | { show: number, hide: number };
        html?: boolean;
        placement?: 'auto' | 'top' | 'bottom' | 'left' | 'right' | Function;
        selector?: string;
        template?: string;
        title?: string | HTMLElement | Function;
        trigger?: 'click' | 'hover' | 'focus' | 'manual';
        offset?: number | string;
        fallbackPlacement?: string | string[];
        boundary?: string | HTMLElement;
        customClass?: string | Function;
        sanitize?: boolean;
        sanitizeFn?: Function;
        allowList?: object;
    }

    class Popover {
        constructor(element: HTMLElement | null, options?: PopoverOptions);
        show(): void;
        hide(): void;
        toggle(): void;
        dispose(): void;
        enable(): void;
        disable(): void;
        toggleEnabled(): void;
        update(): void;
        static getInstance(element: HTMLElement | null): Popover | null;
    }
}


export class Unselect {
    constructor() {
    }

    public init(): void {
        this.removeSelect();
    }

    public removeSelect(): void {
        const navbar: HTMLElement | null = document.getElementById('navbar');

        if (!navbar) {
            return;
        }
        // Удаляем класс у всех дочерних элементов
        navbar.querySelectorAll('.bg-primary').forEach((element: Element): void => {
            element.classList.remove('bg-primary');
            element.classList.remove('text-white');
        });

        const dropdownButton: HTMLElement | null = document.getElementById('dropdownMenuButton1');
        if (!dropdownButton) return;

        dropdownButton.classList.remove('btn-primary');
        dropdownButton.classList.remove('text-white');
    }
}


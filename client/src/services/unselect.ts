export class Unselect {
    constructor() {
    }

    init() {
        this.removeSelect();
    }

    removeSelect() {
        const navbar = document.getElementById('navbar');

        if (!navbar) {
            return;
        }
        // Удаляем класс у всех дочерних элементов
        navbar.querySelectorAll('.bg-primary').forEach(element => {
            element.classList.remove('bg-primary');
            element.classList.remove('text-white');
        });

        const dropdownButton = document.getElementById('dropdownMenuButton1');

        dropdownButton.classList.remove('btn-primary');
        dropdownButton.classList.remove('text-white');
    }
}
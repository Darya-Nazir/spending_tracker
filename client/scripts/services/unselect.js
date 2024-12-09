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
        });

        document.getElementById('dropdownMenuButton1').classList.remove('btn-primary');

        console.log('remove!')
    }
}
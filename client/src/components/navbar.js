export class Navbar {
    constructor() {
        console.log('Navbar!')
        // Get the dropdown button and menu
        const dropdownBtn = document.querySelector('.dropdown-toggle');
        const dropdownMenu = document.querySelector('.dropdown-menu');

        // Toggle the visibility of the dropdown menu on button click
        dropdownBtn.addEventListener('click', () => {
            dropdownMenu.classList.toggle('show');
        });

        // Close the dropdown menu when clicking outside of it
        window.addEventListener('click', (event) => {
            if (!event.target.matches('.dropdown-toggle')) {
                if (dropdownMenu.classList.contains('show')) {
                    dropdownMenu.classList.remove('show');
                }
            }
        });
    }
}
import {Auth} from "../../scripts/services/auth";

export class User {
    constructor(navigateTo) {
        console.log('User plashka!')
        this.navigateToPath = navigateTo;
    }

    init() {
        this.logoutButton();
        this.logOfUser();
    }

    // toggleDropdownList() {
    //     // Get the dropdown button and menu
    //     const dropdownBtn = document.querySelector('.dropdown-toggle');
    //     const dropdownMenu = document.querySelector('.dropdown-menu');
    //
    //     // Toggle the visibility of the dropdown menu on button click
    //     dropdownBtn.addEventListener('click', () => {
    //         dropdownMenu.classList.toggle('show');
    //     });
    //
    //     // Close the dropdown menu when clicking outside of it
    //     window.addEventListener('click', (event) => {
    //         if (!event.target.matches('.dropdown-toggle')) {
    //             if (dropdownMenu.classList.contains('show')) {
    //                 dropdownMenu.classList.remove('show');
    //             }
    //         }
    //     });
    // }
    logoutButton() {
        document.addEventListener('DOMContentLoaded', () => {
            const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]');

            [...popoverTriggerList].map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl));
        });
    }
    logOfUser() {
        const logoutButton = document.getElementById('logout');

        logoutButton.addEventListener('click', () => {
            console.log('logoutButton click!');
            Auth.removeTokens();
            this.navigateToPath('/');
        });
    }
}


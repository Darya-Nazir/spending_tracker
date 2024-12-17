import {Auth} from "../../scripts/services/auth";

export class User {
    constructor(navigateTo) {
        this.navigateToPath = navigateTo;
    }

    init() {
        this.logoutButton();
        this.logOfUser();
    }

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


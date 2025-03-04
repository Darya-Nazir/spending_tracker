import { Auth } from "../services/auth.js";
import { Http } from "../services/http.js";
import {RoutePath} from "../types/route-type";

export class ProfileManager {
    constructor(navigateTo: (path: RoutePath) => void) {
        this.navigateToPath = navigateTo;
    }

    init() {
        this.initUser();
        this.logoutButton();
        this.logOfUser();
        this.showBalance();
    }

    initUser() {
        const userName = document.getElementById('userName');
        const userInfo = Auth.getUserInfo();

        userName.innerText = userInfo.name;
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
            Auth.removeTokens();
            this.navigateToPath('/login');
        });
    }

    async showBalance() {
        const url = 'http://localhost:3000/api/balance';
        const balanceSpan = document.getElementById('balance');
        const balance = (await Http.request(url, 'GET')).balance;
        balanceSpan.innerText = `${balance}$`;
    }
}


import { Unselect } from "../../services/unselect.js";
import { Http } from "../../services/http.js";

export class CardPage {
    constructor(navigateTo, containerId, apiUrl, addCategoryPath, editCategoryPath, defaultCategories) {
        this.navigateToPath = navigateTo;
        this.container = document.getElementById(containerId);
        this.apiUrl = apiUrl;
        this.addCategoryPath = addCategoryPath;
        this.editCategoryPath = editCategoryPath;
        this.defaultCategories = defaultCategories;
    }

    async init() {
        new Unselect().init();
        this.highlightPage();
        await this.checkAndCreateDefaultCategories();
        await this.renderCategories();
        this.addCategoryButtonListener();
        this.deleteCategoryButtonListener();
    }

    getDefaultCategories() {
        throw new Error("Метод 'getDefaultCategories' должен быть переопределён в производном классе.");
    }

    highlightPage() {
        throw new Error("Метод 'highlightPage' должен быть переопределён в производном классе.");
    }

    async checkAndCreateDefaultCategories() {
        try {
            const categories = await this.fetchCategories();

            if (categories.length === 0) {
                for (const title of this.defaultCategories) {
                    await Http.request(this.apiUrl, 'POST', { title });
                }
            }
        } catch (error) {
            console.error('Ошибка при создании категорий:', error);
        }
    }

    addCategoryButtonListener() {
        const addCategoryButton = document.getElementById('addCategoryBtn');
        if (!addCategoryButton) {
            console.error('Элемент addCategoryBtn не найден в DOM!');
            return;
        }
        addCategoryButton.addEventListener('click', () => {
            this.navigateToPath(this.addCategoryPath);
        });
    }

    deleteCategoryButtonListener() {
        let cardToDelete = null;
        let categoryIdToDelete = null;

        document.querySelector('.row.g-4').addEventListener('click', (event) => {
            if (event.target.classList.contains('btn-danger')) {
                cardToDelete = event.target.closest('.col-md-4');
                categoryIdToDelete = cardToDelete.dataset.id;

                const deleteModal = new bootstrap.Modal(document.getElementById('deleteCategoryModal'));
                deleteModal.show();
            }
        });

        document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
            if (!cardToDelete || !categoryIdToDelete) {
                return;
            }
            try {
                const url = `${this.apiUrl}/${categoryIdToDelete}`;
                const result = await Http.request(url, 'DELETE');

                console.log(result);

                cardToDelete.remove();
                cardToDelete = null;
                categoryIdToDelete = null;

                const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteCategoryModal'));
                deleteModal.hide();
            } catch (error) {
                console.error('Error deleting category:', error);
            }
        });
    }

    async fetchCategories() {
        return await Http.request(this.apiUrl, 'GET');
    }

    createCard(category) {
        const card = document.createElement('div');
        card.className = 'col-md-4';
        card.dataset.id = category.id;

        card.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title text-primary-emphasis">${category.title}</h5>
                    <div class="mt-3">
                        <button class="btn btn-primary me-2 edit-category-btn">Редактировать</button>
                        <button class="btn btn-danger">Удалить</button>
                    </div>
                </div>
            </div>
        `;
        const editButton = card.querySelector('.edit-category-btn');
        editButton.addEventListener('click', () => {
            this.navigateToPath(`${this.editCategoryPath}?id=${category.id}`);
        });

        return card;
    }

    async renderCategories() {
        const categories = await this.fetchCategories();
        const addCategoryCard = document.getElementById('addCategoryCard');

        Array.from(this.container.children).forEach(child => {
            if (child !== addCategoryCard) {
                this.container.removeChild(child);
            }
        });

        categories.forEach(category => {
            const card = this.createCard(category);
            this.container.appendChild(card);
        });

        this.container.appendChild(addCategoryCard);
    }
}


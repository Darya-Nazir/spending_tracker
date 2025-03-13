import {Http} from "../../services/http";
import {Unselect} from "../../services/unselect";
import {RoutePath} from "../../types/route-type";
import {Category} from "../../types/category-type";

export abstract class CardPage {
    protected navigateToPath: (path: RoutePath) => void;
    protected container: HTMLElement | null;
    protected apiUrl: string;
    protected addCategoryPath: RoutePath;
    protected editCategoryPath: RoutePath;

    constructor(navigateTo: (path: RoutePath) => void,
                containerId: string,
                apiUrl: string,
                addCategoryPath: RoutePath,
                editCategoryPath: RoutePath) {
        this.navigateToPath = navigateTo;
        this.container = document.getElementById(containerId);
        this.apiUrl = apiUrl;
        this.addCategoryPath = addCategoryPath;
        this.editCategoryPath = editCategoryPath;
    }

    protected async init(): Promise<void> {
        new Unselect().init();
        this.highlightPage();
        await this.renderCategories();
        this.addCategoryButtonListener();
        this.deleteCategoryButtonListener();
    }

    protected abstract highlightPage(): void;

    protected addCategoryButtonListener(): void {
        const addCategoryButton: HTMLElement | null = document.getElementById('addCategoryBtn');
        if (!addCategoryButton) {
            console.error('AddCategoryBtn element not found in DOM!');
            return;
        }
        addCategoryButton.addEventListener('click', (): void => {
            this.navigateToPath(this.addCategoryPath);
        });
    }

    protected deleteCategoryButtonListener(): void {
        let cardToDelete: HTMLElement | null = null;
        let categoryIdToDelete: string | null | undefined = null;

        (document.querySelector('.row.g-4') as HTMLElement).addEventListener('click', (event) => {
            const target = event.target as HTMLElement;
            if (target.classList.contains('btn-danger')) {
                cardToDelete = target.closest('.col-md-4');
                if (cardToDelete) {
                    categoryIdToDelete = cardToDelete.dataset.id;
                }

                const deleteModal = new (bootstrap as any).Modal(document.getElementById('deleteCategoryModal'));
                deleteModal.show();
            }
        });

        (document.getElementById('confirmDeleteBtn') as HTMLElement).addEventListener('click', async () => {
            if (!cardToDelete || !categoryIdToDelete) {
                return;
            }
            try {
                const url = `${this.apiUrl}/${categoryIdToDelete}`;
                await Http.request(url, 'DELETE');

                cardToDelete.remove();
                cardToDelete = null;
                categoryIdToDelete = null;

                const deleteModal = (bootstrap as any).Modal.getInstance(document.getElementById('deleteCategoryModal'));
                if (deleteModal) {
                    deleteModal.hide();
                }
            } catch (error) {
                console.error('Error deleting category:', error);
            }
        });
    }

    protected async fetchCategories(): Promise<any> {
        return await Http.request(this.apiUrl, 'GET');
    }

    protected createCard(category: Category): HTMLElement {
        const card: HTMLElement = document.createElement('div');
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
        const editButton: HTMLElement | null = card.querySelector('.edit-category-btn');
        (editButton as HTMLElement).addEventListener('click', () => {
            this.navigateToPath(`${this.editCategoryPath}?id=${category.id}`);
        });

        return card;
    }

    protected async renderCategories(): Promise<void> {
        const categories: Category[] = await this.fetchCategories();
        const addCategoryCard: HTMLElement | null = document.getElementById('addCategoryCard');

        if (this.container) {
            Array.from(this.container.children).forEach(child => {
                if (child !== addCategoryCard) {
                    this.container!.removeChild(child);
                }
            });

            categories.forEach(category => {
                const card = this.createCard(category);
                this.container!.appendChild(card);
            });

            if (addCategoryCard) {
            this.container.appendChild(addCategoryCard);
            }
        }
    }
}


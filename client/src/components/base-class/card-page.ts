import {Http, HttpError} from "../../services/http";
import {Unselect} from "../../services/unselect";
import {RoutePath} from "../../types/route-type";
import {Category} from "../../types/category-type";
import {ProfileManager} from "../profile-manager";

type OperationsAction = 'delete' | 'move' | null;

export abstract class CardPage {
    protected navigateToPath: (path: RoutePath) => void;
    protected container: HTMLElement | null;
    protected apiUrl: string;
    protected addCategoryPath: RoutePath;
    protected editCategoryPath: RoutePath;
    protected balanceManager: ProfileManager;

    protected sourceCard: HTMLElement | null = null;
    protected sourceCategoryId: string | null = null;
    protected operationsAction: OperationsAction = null;
    protected isProcessing: boolean = false;

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
        this.balanceManager = new ProfileManager(navigateTo);
    }

    protected async init(): Promise<void> {
        new Unselect().init();
        this.highlightPage();
        await this.renderCategories();
        this.addCategoryButtonListener();
        this.deleteCategoryButtonListener();
        this.operationsModalListeners();
        this.emptyCategoryModalListeners();
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
        (document.querySelector('.row.g-4') as HTMLElement).addEventListener('click', (event) => {
            const target = event.target as HTMLElement;
            if (target.classList.contains('btn-danger')) {
                this.sourceCard = target.closest('.col-md-4');
                this.sourceCategoryId = this.sourceCard?.dataset.id ?? null;
                this.showModal('deleteCategoryModal');
            }
        });

        (document.getElementById('confirmDeleteBtn') as HTMLElement).addEventListener('click', async () => {
            if (!this.sourceCard || !this.sourceCategoryId || this.isProcessing) {
                return;
            }
            this.isProcessing = true;
            try {
                await Http.request(`${this.apiUrl}/${this.sourceCategoryId}`, 'DELETE');

                this.sourceCard.remove();
                this.hideModal('deleteCategoryModal');
                this.resetSelection();
            } catch (error) {
                if (error instanceof HttpError && error.status === 409) {
                    this.hideModal('deleteCategoryModal');
                    await this.openOperationsModal();
                } else {
                    console.error('Error deleting category:', error);
                }
            } finally {
                this.isProcessing = false;
            }
        });
    }

    protected operationsModalListeners(): void {
        (document.getElementById('chooseDeleteOperationsBtn') as HTMLElement).addEventListener('click', () => {
            this.operationsAction = 'delete';
            (document.getElementById('deleteOperationsStep') as HTMLElement).classList.remove('d-none');
            (document.getElementById('moveOperationsStep') as HTMLElement).classList.add('d-none');
            (document.getElementById('confirmOperationsActionBtn') as HTMLElement).classList.remove('d-none');
        });

        (document.getElementById('chooseMoveOperationsBtn') as HTMLElement).addEventListener('click', () => {
            this.operationsAction = 'move';
            (document.getElementById('moveOperationsStep') as HTMLElement).classList.remove('d-none');
            (document.getElementById('deleteOperationsStep') as HTMLElement).classList.add('d-none');
            (document.getElementById('confirmOperationsActionBtn') as HTMLElement).classList.remove('d-none');
        });

        (document.getElementById('confirmOperationsActionBtn') as HTMLElement).addEventListener('click', async () => {
            if (!this.sourceCategoryId || !this.operationsAction || this.isProcessing) {
                return;
            }
            this.isProcessing = true;
            this.clearModalError('categoryOperationsError');
            try {
                if (this.operationsAction === 'delete') {
                    await Http.request(`${this.apiUrl}/${this.sourceCategoryId}/operations`, 'DELETE');
                    await this.balanceManager.showBalance();
                    this.hideModal('categoryOperationsModal');
                    this.openEmptyCategoryModal('Операции удалены.');
                } else {
                    const select = document.getElementById('targetCategorySelect') as HTMLSelectElement;
                    await Http.request(`${this.apiUrl}/${this.sourceCategoryId}/operations`, 'PUT', {
                        targetCategoryId: Number(select.value),
                    });
                    this.hideModal('categoryOperationsModal');
                    this.openEmptyCategoryModal('Операции перенесены.');
                }
            } catch (error) {
                this.showModalError('categoryOperationsError', this.describeError(error));
            } finally {
                this.isProcessing = false;
            }
        });
    }

    protected emptyCategoryModalListeners(): void {
        (document.getElementById('confirmDeleteEmptyCategoryBtn') as HTMLElement).addEventListener('click', async () => {
            if (!this.sourceCard || !this.sourceCategoryId || this.isProcessing) {
                return;
            }
            this.isProcessing = true;
            this.clearModalError('categoryEmptyError');
            try {
                await Http.request(`${this.apiUrl}/${this.sourceCategoryId}`, 'DELETE');

                this.sourceCard.remove();
                this.hideModal('categoryEmptyModal');
                this.resetSelection();
            } catch (error) {
                if (error instanceof HttpError && error.status === 409) {
                    this.hideModal('categoryEmptyModal');
                    await this.openOperationsModal();
                    this.showModalError('categoryOperationsError', 'В категории снова появились операции. Выберите действие.');
                } else {
                    this.showModalError('categoryEmptyError', this.describeError(error));
                }
            } finally {
                this.isProcessing = false;
            }
        });

        (document.getElementById('keepEmptyCategoryBtn') as HTMLElement).addEventListener('click', () => {
            this.hideModal('categoryEmptyModal');
            this.resetSelection();
        });
    }

    protected async openOperationsModal(): Promise<void> {
        this.operationsAction = null;
        this.clearModalError('categoryOperationsError');
        (document.getElementById('deleteOperationsStep') as HTMLElement).classList.add('d-none');
        (document.getElementById('moveOperationsStep') as HTMLElement).classList.add('d-none');
        (document.getElementById('confirmOperationsActionBtn') as HTMLElement).classList.add('d-none');

        const categories: Category[] = await this.fetchCategories();
        const targets = categories.filter((category) => category.id !== this.sourceCategoryId);

        const moveButton = document.getElementById('chooseMoveOperationsBtn') as HTMLButtonElement;
        moveButton.disabled = targets.length === 0;

        const select = document.getElementById('targetCategorySelect') as HTMLSelectElement;
        select.innerHTML = targets.map((category) => `<option value="${category.id}">${category.title}</option>`).join('');

        this.showModal('categoryOperationsModal');
    }

    protected openEmptyCategoryModal(actionText: string): void {
        (document.getElementById('categoryEmptyLabel') as HTMLElement).innerText = `${actionText} Удалить пустую категорию?`;
        this.clearModalError('categoryEmptyError');
        this.showModal('categoryEmptyModal');
    }

    protected resetSelection(): void {
        this.sourceCard = null;
        this.sourceCategoryId = null;
        this.operationsAction = null;
    }

    protected describeError(error: unknown): string {
        return error instanceof Error ? error.message : 'Не удалось выполнить действие, попробуйте ещё раз.';
    }

    protected showModal(id: string): void {
        const element = document.getElementById(id);
        if (!element) {
            return;
        }
        new (bootstrap as any).Modal(element).show();
    }

    protected hideModal(id: string): void {
        const element = document.getElementById(id);
        if (!element) {
            return;
        }
        const modal = (bootstrap as any).Modal.getInstance(element);
        if (modal) {
            modal.hide();
        }
    }

    protected showModalError(elementId: string, message: string): void {
        const element = document.getElementById(elementId);
        if (!element) {
            return;
        }
        element.innerText = message;
        element.classList.remove('d-none');
    }

    protected clearModalError(elementId: string): void {
        const element = document.getElementById(elementId);
        if (!element) {
            return;
        }
        element.innerText = '';
        element.classList.add('d-none');
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

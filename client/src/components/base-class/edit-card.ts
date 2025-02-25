import {Http} from "../../services/http";
import {RoutePath} from "../../types/route-type";
import {Category} from "../../types/category-type";

export class EditCard {
    private navigateToPath: (path: RoutePath) => void;
    private apiUrl: string;
    private redirectPath: RoutePath;
    private categoryId: string | null;

    constructor(navigateTo: (path: RoutePath) => void,
                apiUrl: string,
                redirectPath: RoutePath) {
        this.navigateToPath = navigateTo;
        this.apiUrl = apiUrl; // Базовый URL API
        this.redirectPath = redirectPath; // Путь перенаправления после действий
        this.categoryId = null;
    }

    protected async init(): Promise<void> {
        const categoryId: string | null = this.getCategoryIdFromUrl();
        if (!categoryId) {
            alert('Идентификатор категории не найден!');
            this.navigateToPath(this.redirectPath);
            return;
        }

        this.categoryId = categoryId;
        await this.loadCategoryData(categoryId);
        this.saveCategoryButtonListener();
        this.cancelCategoryButtonListener();
    }

    protected getCategoryIdFromUrl(): string | null {
        const params = new URLSearchParams(window.location.search);
        return params.get('id'); // Извлекаем ID из URL
    }

    protected async loadCategoryData(categoryId: string): Promise<void> {
        try {
            const category = await Http.request(`${this.apiUrl}/${categoryId}`, 'GET');
            this.fillFormWithCategoryData(category);
        } catch (error) {
            console.error('Error loading category data:', error);
            alert('Не удалось загрузить данные категории!');
            this.navigateToPath(this.redirectPath);
        }
    }

    protected fillFormWithCategoryData(category: Category): void {
        const input: HTMLInputElement | null = document.querySelector('.form-control');
        if (input) {
            input.value = category.title; // Заполняем поле ввода текущим названием категории
        }
    }

    protected saveCategoryButtonListener(): void {
        (document.getElementById('save') as HTMLElement).addEventListener('click', (event: MouseEvent): void => {
            this.handleCategoryEdit(event);
        });
    }

    protected async handleCategoryEdit(event: MouseEvent): Promise<void> {
        event.preventDefault(); // Предотвращаем отправку формы

        const updatedName: string | undefined = this.getCategoryName();
        if (!updatedName) {
            alert('Введите название категории!');
            return;
        }

        try {
            await Http.request(
                `${this.apiUrl}/${this.categoryId}`,
                'PUT',
                {title: updatedName}
            );

            this.navigateToPath(this.redirectPath); // Успешное редактирование
        } catch (error) {
            this.handleCategoryEditError(error);
        }
    }

    protected getCategoryName(): string | undefined {
        const input: HTMLInputElement | null = document.querySelector('.form-control');
        if (input) {
            return input.value.trim();
        }
    }

    protected handleCategoryEditError(error: unknown): void {
        console.error('Category editing: ', error);
        alert('Не удалось обновить категорию, попробуйте еще раз.');
    }

    protected cancelCategoryButtonListener(): void {
        (document.getElementById('cancel') as HTMLElement).addEventListener('click', (event: MouseEvent): void => {
            event.preventDefault();
            this.navigateToPath(this.redirectPath);
        });
    }
}


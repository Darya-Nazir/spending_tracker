import {Http} from "../../services/http";
import {RoutePath} from "../../types/route-type";
import {Category} from "../../types/category-type";

export class NewCard {
    protected navigateToPath: (path: RoutePath) => void;
    protected readonly apiUrl: string;
    protected readonly redirectPath: RoutePath;

    constructor(navigateTo: (path: RoutePath) => void, apiUrl: string, redirectPath: RoutePath) {
        this.navigateToPath = navigateTo;
        this.apiUrl = apiUrl;
        this.redirectPath = redirectPath;
    }

    protected init(): void {
        this.addCategoryConfirmListener();
        this.cancelCategoryButtonListener();
    }

    protected addCategoryConfirmListener(): void {
        (document.getElementById('create') as HTMLElement).addEventListener('click',
            (event) => this.handleCategoryCreation(event));
    }

    protected async handleCategoryCreation(event: MouseEvent): Promise<void> {
        event.preventDefault(); // Предотвращаем отправку формы

        const categoryName: string | undefined = this.getCategoryName();
        if (!categoryName) {
            alert('Введите название категории!');
            return;
        }

        try {
            await Http.request<Category>(this.apiUrl, 'POST', {title: categoryName});
            this.navigateToPath(this.redirectPath); // Успешное добавление
        } catch (error) {
            this.handleCategoryCreationError(error);
        }
    }

    protected getCategoryName(): string | undefined {
        const input: HTMLInputElement | null = document.querySelector('.form-control');
        if (input) return input.value.trim();
    }

    protected handleCategoryCreationError(error: any): void {
        if (error.toString().includes('already exist')) {
            alert('Такая категория уже существует');
            return;
        }
        alert('Не удалось добавить категорию, попробуйте еще раз.');
    }

    protected cancelCategoryButtonListener(): void {
        (document.getElementById('cancel') as HTMLElement).addEventListener('click', (event) => {
            event.preventDefault();
            this.navigateToPath(this.redirectPath);
        });
    }
}


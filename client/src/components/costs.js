import {Unselect} from "../../scripts/services/unselect.js";
import {Auth} from "../../scripts/services/auth";

export class Costs {
    constructor(navigateTo) {
        this.navigateToPath = navigateTo;
        this.container = document.getElementById('costsContainer');
        this.apiUrl = 'http://localhost:3000/api/categories/expense';
    }

    async init() {
        new Unselect().init();
        this.selectCosts();
        await this.renderCategories();
        this.addCategoryButtonListener();
        this.deleteCategoryButtonListener();
    }

    selectCosts() {
        const categoriesElement = document.getElementById('dropdownMenuButton1');
        const costsElement = document.getElementById('costsPage');

        categoriesElement.classList.add('btn-primary', 'text-white');
        costsElement.classList.add('bg-primary', 'text-white');
    }

    addCategoryButtonListener() {
        const addCategoryButton = document.getElementById('addCategoryBtn');
        if (!addCategoryButton) {
            console.error('Элемент addCategoryBtn не найден в DOM!');
            return;
        }
        document.getElementById('addCategoryBtn').addEventListener('click', () => {
            debugger;
            this.navigateToPath('/create-cost');
        });
    }

    deleteCategoryButtonListener() {
        let cardToDelete = null;
        let categoryIdToDelete = null;

        // Слушатель на клик по кнопке "Удалить"
        document.querySelector('.row.g-4').addEventListener('click', (event) => {
            if (event.target.classList.contains('btn-danger')) {
                cardToDelete = event.target.closest('.col-md-4');
                categoryIdToDelete = cardToDelete.dataset.id;  // Получаем id категории

                // Показываем модальное окно подтверждения
                const deleteModal = new bootstrap.Modal(document.getElementById('deleteCategoryModal'));
                deleteModal.show();
            }
        });

        // Слушатель на кнопку "Подтвердить удаление" в модальном окне
        document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
            if (cardToDelete && categoryIdToDelete) {
                try {
                    const accessToken = localStorage.getItem(Auth.accessTokenKey);

                    if (!accessToken) {
                        alert('Вы не авторизованы! Пожалуйста, войдите в систему.');
                        return;
                    }

                    // Проверяем, если токен истек, обновляем его
                    // const isTokenValid = await Auth.processUnauthorizedResponse(this.navigateToPath);
                    // if (!isTokenValid) {
                    //     return; // Прерываем выполнение, если токен не удалось обновить
                    // }

                    // Отправляем запрос на удаление категории с бэкенда
                    const response = await fetch(`http://localhost:3000/api/categories/expense/${categoryIdToDelete}`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${accessToken}`,
                        },
                    });

                    if (!response.ok) {
                        throw new Error(`Ошибка при удалении категории: ${response.status}`);
                    }

                    // Если удаление прошло успешно, удаляем карточку с фронтенда
                    cardToDelete.remove();
                    cardToDelete = null;
                    categoryIdToDelete = null;

                    // Закрываем модальное окно
                    const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteCategoryModal'));
                    deleteModal.hide();
                } catch (error) {
                    console.error('Error deleting category:', error);
                }
            }
        });
    }

    async fetchCategories() {
        const accessToken = localStorage.getItem(Auth.accessTokenKey);

        if (!accessToken) {
            alert('Вы не авторизованы! Пожалуйста, войдите в систему.');
            return [];
        }

        // Проверяем, если токен истек, обновляем его
        // const isTokenValid = await Auth.processUnauthorizedResponse(this.navigateToPath);
        // if (!isTokenValid) {
        //     return []; // Прерываем выполнение, если токен не удалось обновить
        // }

        try {
            const response = await fetch(this.apiUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching categories:', error);
            return [];
        }
    }

    createCard(category) {
        const card = document.createElement('div');
        card.className = 'col-md-4';
        card.dataset.id = category.id;  // Добавляем атрибут data-id

        card.innerHTML = `
      <div class="card">
        <div class="card-body">
          <h5 class="card-title text-primary-emphasis">${category.title}</h5>
          <div class="mt-3">
            <button class="btn btn-primary me-2">Редактировать</button>
            <button class="btn btn-danger">Удалить</button>
          </div>
        </div>
      </div>
    `;

        return card;
    }

    async renderCategories() {
        const categories = await this.fetchCategories();
        const addCategoryCard = document.getElementById('addCategoryCard');

        // Удалить все элементы из контейнера, кроме блока с id="addCategoryCard"
        Array.from(this.container.children).forEach(child => {
            if (child !== addCategoryCard) {
                this.container.removeChild(child);
            }
        });

        // Добавить карточки категорий в контейнер
        categories.forEach(category => {
            const card = this.createCard(category);
            this.container.appendChild(card);
        });

        this.container.appendChild(addCategoryCard);
    }
}


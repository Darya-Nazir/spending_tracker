import {Unselect} from "../../scripts/services/unselect.js";

export class Costs {
    constructor() {}

    init() {
        new Unselect().init();
        this.selectCosts();
        this.editCost();
    }

    selectCosts() {
        const categoriesElement = document.getElementById('dropdownMenuButton1');
        const costsElement = document.getElementById('costsPage');

        categoriesElement.classList.add('btn-primary', 'text-white');
        costsElement.classList.add('bg-primary', 'text-white');
    }

    editCost() {
        this.addCategoryButtonListener();
        this.deleteCategoryButtonListener();
    }

    addCategoryButtonListener() {
        document.getElementById('addCategoryBtn').addEventListener('click', () => {
            if (document.getElementById('newCategoryInput')) return;

            const inputContainer = this.createCategoryInput();
            this.insertCategoryInput(inputContainer);
        });
    }

    createCategoryInput() {
        const inputContainer = document.createElement('div');
        inputContainer.className = 'col-md-4';
        inputContainer.id = 'newCategoryInput'; // Уникальный ID для проверки существования

        inputContainer.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <input type="text" class="form-control mb-3" placeholder="Название новой категории" id="categoryName">
                    <button class="btn btn-primary me-2" id="addCategoryConfirm">Добавить</button>
                    <button class="btn btn-secondary" id="cancelCategory">Отмена</button>
                </div>
            </div>
        `;
        return inputContainer;
    }

    insertCategoryInput(inputContainer) {
        const addCategoryButton = document.querySelector('#addCategoryBtn').closest('.col-md-4');
        const row = document.querySelector('.row.g-4');
        row.insertBefore(inputContainer, addCategoryButton);

        this.addCategoryConfirmListener(inputContainer);
        this.cancelCategoryButtonListener(inputContainer);
    }

    addCategoryConfirmListener(inputContainer) {
        document.getElementById('addCategoryConfirm').addEventListener('click', async () => {
            const input = document.getElementById('categoryName');
            const categoryName = input.value.trim();

            if (categoryName === '') {
                alert('Введите название категории!');
                return;
            }

            // Получаем accessToken из localStorage
            const accessToken = localStorage.getItem('accessToken');

            if (!accessToken) {
                alert('Вы не авторизованы! Пожалуйста, войдите в систему.');
                return;
            }

            try {
                const response = await fetch('http://localhost:3000/api/categories/expense', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`, // Добавляем accessToken в заголовок Authorization
                    },
                    body: JSON.stringify({ title: categoryName }), // Тело запроса
                });

                if (!response.ok) {
                    throw new Error('Ошибка при добавлении категории');
                }

                const data = await response.json(); // Получаем ответ от сервера

                // Если категория успешно добавлена, создаем карточку
                this.createCategoryCard(categoryName);

                // Удаляем временный инпут
                inputContainer.remove();
                console.log('Cost added successfully')

            } catch (error) {
                console.error('Ошибка при отправке запроса:', error);
                alert('Не удалось добавить категорию. Попробуйте еще раз.');
            }
        });
    }



    createCategoryCard(categoryName) {
        const newCard = document.createElement('div');
        newCard.className = 'col-md-4';
        newCard.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title text-primary-emphasis">${categoryName}</h5>
                    <div class="mt-3">
                        <button class="btn btn-primary me-2">Редактировать</button>
                        <button class="btn btn-danger">Удалить</button>
                    </div>
                </div>
            </div>
        `;

        const row = document.querySelector('.row.g-4');
        const addCategoryButton = document.querySelector('#addCategoryBtn').closest('.col-md-4');
        row.insertBefore(newCard, addCategoryButton);
    }

    cancelCategoryButtonListener(inputContainer) {
        document.getElementById('cancelCategory').addEventListener('click', () => {
            inputContainer.remove();
        });
    }

    deleteCategoryButtonListener() {
        let cardToDelete = null;

        document.querySelector('.row.g-4').addEventListener('click', (event) => {
            if (event.target.classList.contains('btn-danger')) {
                cardToDelete = event.target.closest('.col-md-4');

                const deleteModal = new bootstrap.Modal(document.getElementById('deleteCategoryModal'));
                deleteModal.show();
            }
        });

        document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
            if (cardToDelete) {
                cardToDelete.remove();
                cardToDelete = null;
            }

            const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteCategoryModal'));
            deleteModal.hide();
        });
    }
}



import {Unselect} from "../../scripts/services/unselect.js";

export class Costs {
    constructor() {
    }

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
        document.getElementById('addCategoryBtn').addEventListener('click', function () {
            // Проверяем, есть ли уже активный инпут
            if (document.getElementById('newCategoryInput')) return;

            // Создаем контейнер с инпутом и кнопкой подтверждения
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

            // Вставляем инпут перед кнопкой "Добавить категорию"
            const addCategoryButton = document.querySelector('#addCategoryBtn').closest('.col-md-4');
            const row = document.querySelector('.row.g-4');
            row.insertBefore(inputContainer, addCategoryButton);

            // Обработчик кнопки "Добавить"
            document.getElementById('addCategoryConfirm').addEventListener('click', function () {
                const input = document.getElementById('categoryName');
                const categoryName = input.value.trim();

                if (categoryName === '') {
                    alert('Введите название категории!');
                    return;
                }

                // Создаем новую карточку
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

                // Вставляем карточку перед кнопкой "Добавить категорию"
                row.insertBefore(newCard, addCategoryButton);

                // Удаляем инпут
                inputContainer.remove();
            });

            // Обработчик кнопки "Отмена"
            document.getElementById('cancelCategory').addEventListener('click', function () {
                inputContainer.remove();
            });
        });

// Переменная для хранения карточки, которую нужно удалить
        let cardToDelete = null;

// Обработчик кнопок "Удалить" на карточках
        document.querySelector('.row.g-4').addEventListener('click', function (event) {
            if (event.target.classList.contains('btn-danger')) {
                // Получаем карточку, которую нужно удалить
                cardToDelete = event.target.closest('.col-md-4');

                // Показываем модальное окно
                const deleteModal = new bootstrap.Modal(document.getElementById('deleteCategoryModal'));
                deleteModal.show();
            }
        });

// Обработчик кнопки "Да, удалить" в модалке
        document.getElementById('confirmDeleteBtn').addEventListener('click', function () {
            if (cardToDelete) {
                cardToDelete.remove(); // Удаляем карточку
                cardToDelete = null;   // Сбрасываем переменную
            }

            // Закрываем модалку
            const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteCategoryModal'));
            deleteModal.hide();
        });

    }

}


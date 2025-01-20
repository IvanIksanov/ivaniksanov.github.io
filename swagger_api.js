/****************************************************
 *  БЛОК 1. Код для отправки формы (Swagger) и
 *  прочие мелкие функции (карусель, счётчик сердечек,
 *  кнопка бургера), взяты из script.js
 ****************************************************/

document.addEventListener('DOMContentLoaded', function() {
    // --- 4.1. Логика карусели ---
    const slides = document.querySelectorAll('.api-slide');
    const prevBtn = document.getElementById('api-prev');
    const nextBtn = document.getElementById('api-next');
    let currentSlide = 0; // индекс текущего слайда

    function showSlide(index) {
        slides.forEach((slide, i) => {
            slide.classList.remove('active');
            if (i === index) {
                slide.classList.add('active');
            }
        });
    }
    showSlide(currentSlide);

    prevBtn.addEventListener('click', () => {
        currentSlide = (currentSlide - 1 + slides.length) % slides.length;
        showSlide(currentSlide);
    });

    nextBtn.addEventListener('click', () => {
        currentSlide = (currentSlide + 1) % slides.length;
        showSlide(currentSlide);
    });

    // --- 4.2. Общие переменные (hostname, ...). Можно хранить в JS как угодно ---
    // В вашем случае hostname = "https://petstore.swagger.io/v2",
    // но вы можете сделать поле <input id="hostname">, чтобы пользователь сам менял.
    const hostname = "https://petstore.swagger.io/v2";

    // --- 4.3. Функции для запросов ---

    // (1) Создать пользователя
    window.createUser = function() {
        const idValue = document.getElementById('user_id').value;
        const usernameValue = document.getElementById('user_username').value;
        const firstNameValue = document.getElementById('user_firstName').value;
        const lastNameValue = document.getElementById('user_lastName').value;
        const emailValue = document.getElementById('user_email').value;
        const passwordValue = document.getElementById('user_password').value;
        const phoneValue = document.getElementById('user_phone').value;
        const userStatusValue = document.getElementById('user_status').value;

        const bodyData = {
            id: Number(idValue),
            username: usernameValue,
            firstName: firstNameValue,
            lastName: lastNameValue,
            email: emailValue,
            password: passwordValue,
            phone: phoneValue,
            userStatus: Number(userStatusValue)
        };

        fetch(`${hostname}/user`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "accept": "application/json"
            },
            body: JSON.stringify(bodyData)
        })
        .then(res => res.json())
        .then(data => {
            document.getElementById('user_create_response').textContent = JSON.stringify(data, null, 2);
        })
        .catch(err => {
            document.getElementById('user_create_response').textContent = "Ошибка: " + err;
        });
    };

    // (2) Получить пользователя по имени
    window.getUserByName = function() {
        const usernameValue = document.getElementById('get_user_username').value;

        fetch(`${hostname}/user/${usernameValue}`, {
            method: "GET",
            headers: {
                "accept": "application/json"
            }
        })
        .then(res => res.json())
        .then(data => {
            document.getElementById('get_user_response').textContent = JSON.stringify(data, null, 2);
        })
        .catch(err => {
            document.getElementById('get_user_response').textContent = "Ошибка: " + err;
        });
    };

    // (3) Вход пользователя (login)
    window.loginUser = function() {
        const usernameValue = document.getElementById('login_username').value;
        const passwordValue = document.getElementById('login_password').value;

        // ?username=...&password=...
        fetch(`${hostname}/user/login?username=${usernameValue}&password=${passwordValue}`, {
            method: "GET",
            headers: {
                "accept": "application/json"
            }
        })
        .then(res => res.json())
        .then(data => {
            document.getElementById('login_response').textContent = JSON.stringify(data, null, 2);
        })
        .catch(err => {
            document.getElementById('login_response').textContent = "Ошибка: " + err;
        });
    };

    // (4) Новый питомец
    window.createPet = function() {
        const petIdValue = document.getElementById('pet_id').value;
        const tagNameValue = document.getElementById('pet_tag_name').value;
        const petNameValue = document.getElementById('pet_name').value;

        const bodyData = {
            id: Number(petIdValue),
            category: { id: 1, name: "Кошка" },
            name: petNameValue,
            photoUrls: ["string"],
            tags: [
              { id: 2, name: tagNameValue }
            ],
            status: "available"
        };

        fetch(`${hostname}/pet`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "accept": "application/json"
            },
            body: JSON.stringify(bodyData)
        })
        .then(res => res.json())
        .then(data => {
            document.getElementById('pet_create_response').textContent = JSON.stringify(data, null, 2);
        })
        .catch(err => {
            document.getElementById('pet_create_response').textContent = "Ошибка: " + err;
        });
    };

    // (5) Получить питомца по ID
    window.getPetById = function() {
        const getPetIdValue = document.getElementById('get_pet_id').value;
        fetch(`${hostname}/pet/${getPetIdValue}`, {
            method: "GET",
            headers: {
                "accept": "application/json"
            }
        })
        .then(res => res.json())
        .then(data => {
            document.getElementById('get_pet_response').textContent = JSON.stringify(data, null, 2);
        })
        .catch(err => {
            document.getElementById('get_pet_response').textContent = "Ошибка: " + err;
        });
    };

    // (6) Оформить заказ
    window.createOrder = function() {
        const orderIdValue = document.getElementById('order_id').value;
        const orderPetIdValue = document.getElementById('order_pet_id').value;

        const bodyData = {
            id: Number(orderIdValue),
            petId: Number(orderPetIdValue),
            quantity: 1,
            shipDate: "2024-04-10T19:16:28.625Z",
            status: "placed",
            complete: true
        };

        fetch(`${hostname}/store/order`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "accept": "application/json"
            },
            body: JSON.stringify(bodyData)
        })
        .then(res => res.json())
        .then(data => {
            document.getElementById('create_order_response').textContent = JSON.stringify(data, null, 2);
        })
        .catch(err => {
            document.getElementById('create_order_response').textContent = "Ошибка: " + err;
        });
    };

    // (7) Найти заказ по ID
    window.getOrderById = function() {
        const getOrderIdValue = document.getElementById('get_order_id').value;

        fetch(`${hostname}/store/order/${getOrderIdValue}`, {
            method: "GET",
            headers: {
                "accept": "application/json"
            }
        })
        .then(res => res.json())
        .then(data => {
            document.getElementById('get_order_response').textContent = JSON.stringify(data, null, 2);
        })
        .catch(err => {
            document.getElementById('get_order_response').textContent = "Ошибка: " + err;
        });
    };

    // (8) Удалить заказ по ID
    window.deleteOrder = function() {
        const deleteOrderIdValue = document.getElementById('delete_order_id').value;

        fetch(`${hostname}/store/order/${deleteOrderIdValue}`, {
            method: "DELETE",
            headers: {
                "accept": "application/json"
            }
        })
        .then(res => res.json())
        .then(data => {
            document.getElementById('delete_order_response').textContent = JSON.stringify(data, null, 2);
        })
        .catch(err => {
            document.getElementById('delete_order_response').textContent = "Ошибка: " + err;
        });
    };

    // (9) Удалить пользователя по имени
    window.deleteUser = function() {
        const deleteUsernameValue = document.getElementById('delete_user_username').value;

        fetch(`${hostname}/user/${deleteUsernameValue}`, {
            method: "DELETE",
            headers: {
                "accept": "application/json"
            }
        })
        .then(res => res.json())
        .then(data => {
            document.getElementById('delete_user_response').textContent = JSON.stringify(data, null, 2);
        })
        .catch(err => {
            document.getElementById('delete_user_response').textContent = "Ошибка: " + err;
        });
    };
});

document.addEventListener('DOMContentLoaded', function () {
    const burgerMenu = document.querySelector('.burger-menu');
    const navLinks = document.querySelector('nav ul');

    burgerMenu.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });
});
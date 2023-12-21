/*$('.content-holder .thumbnail').each(function(i) {
	var item = $('<div class="item"></div>');
	var itemDiv = $(this).parents('div');
	var title = $(this).parent('a').attr("title");

	item.attr("title", title);
	$(itemDiv.html()).appendTo(item);
	item.appendTo('.carousel-inner'); 
	if (i === 0) { // set first item active
			item.addClass('active');
	}
});*/

/* activate the carousel */
$('#modalCarousel').carousel({interval: false});

/* change modal title when slide changes */
$('#modalCarousel').on('slid.bs.carousel', function () {
		$('.modal-title').html($(this).find('.active').attr("title"));
});

/* when clicking a thumbnail */
$('.row .thumbnail').click(function(){
		var idx = $(this).parents('div').index();
		var id = parseInt(idx);
		$('#myModal').modal('show'); // show the modal
		$('#modalCarousel').carousel(id); // slide carousel to selected
});*/

// Создаем элемент снежинки
function createSnowflake() {
  const snowflake = document.createElement('div');
  snowflake.innerHTML = '❄'; // Используем символ снежинки
  snowflake.style.position = 'fixed';
  snowflake.style.color = 'white';
  snowflake.style.fontSize = '20px';
  snowflake.style.zIndex = '9999';

  // Устанавливаем случайное начальное положение снежинки
  const startX = Math.random() * window.innerWidth;
  snowflake.style.left = startX + 'px';
  snowflake.style.top = '-50px';

  // Устанавливаем случайную скорость падения снежинки
  const speed = Math.random() * 5 + 1;
  snowflake.style.animation = `snowfall ${speed}s linear infinite`;

  // Добавляем снежинку на страницу
  document.body.appendChild(snowflake);
}

// Генерируем снежинки
function generateSnowflakes() {
  setInterval(createSnowflake, 500); // Создаем новую снежинку каждые 0.5 секунды
}

// Запускаем генерацию снежинок после полной загрузки страницы
window.addEventListener('load', generateSnowflakes);

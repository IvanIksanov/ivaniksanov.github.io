// --- КАРУСЕЛЬ ИЗОБРАЖЕНИЙ ---
document.addEventListener('DOMContentLoaded', function () {
    const carousel = document.querySelector('#practice-covers .home-mobile-carousel');
    if (!carousel) return;
    const metrics = window.QAtoDevMetrics || null;
    const items = Array.from(carousel.querySelectorAll('.carousel-images .carousel-item'));
    if (!items.length) return;
    const prevBtn = carousel.querySelector('#prev');
    const nextBtn = carousel.querySelector('#next');
    if (!prevBtn || !nextBtn) return;

    let currentIndex = 0;
    let autoRotateId = null;
    let isSliding = false;
    const slideDurationMs = 560;
    const mobileView = window.matchMedia('(max-width: 900px)');

    function trackCarousel(params) {
        metrics?.reachGoal?.('main_carousel_interaction', params);
    }

    function getSlideMeta(item, index) {
        const link = item?.querySelector('.skills-cover-link, .skills-cover-cta');
        const title = item?.querySelector('.skills-cover-title')?.textContent?.trim()
            || item?.querySelector('.skills-cover-img')?.getAttribute('alt')
            || '';
        return {
            slide_index: index + 1,
            slide_title: title,
            slide_href: link?.getAttribute('href') || ''
        };
    }

    function wrapIndex(index) {
        const len = items.length;
        return (index + len) % len;
    }

    function relativeOffset(index, activeIndex) {
        const len = items.length;
        let offset = index - activeIndex;
        if (offset > len / 2) offset -= len;
        if (offset < -len / 2) offset += len;
        return offset;
    }

    function renderSlides() {
        items.forEach((item, i) => {
            const offset = relativeOffset(i, currentIndex);
            item.classList.remove('active', 'prev', 'next', 'off-left', 'off-right');

            if (offset === 0) {
                item.classList.add('active');
            } else if (offset === -1) {
                item.classList.add('prev');
            } else if (offset === 1) {
                item.classList.add('next');
            } else if (offset < -1) {
                item.classList.add('off-left');
            } else {
                item.classList.add('off-right');
            }
        });
    }

    function goTo(index) {
        if (isSliding) return;
        isSliding = true;
        currentIndex = wrapIndex(index);
        renderSlides();
        setTimeout(function () {
            isSliding = false;
        }, slideDurationMs);
    }

    function startAutoRotate() {
        stopAutoRotate();
        if (!mobileView.matches || document.hidden) return;
        autoRotateId = setInterval(function() {
            goTo(currentIndex + 1);
        }, 8000);
    }

    function stopAutoRotate() {
        if (autoRotateId) {
            clearInterval(autoRotateId);
            autoRotateId = null;
        }
    }

    prevBtn.addEventListener('click', function() {
        const fromMeta = getSlideMeta(items[currentIndex], currentIndex);
        goTo(currentIndex - 1);
        startAutoRotate();
        const toIndex = wrapIndex(currentIndex);
        const toMeta = getSlideMeta(items[toIndex], toIndex);
        trackCarousel({
            action: 'nav_prev',
            from_slide_index: fromMeta.slide_index,
            from_slide_title: fromMeta.slide_title,
            to_slide_index: toMeta.slide_index,
            to_slide_title: toMeta.slide_title
        });
    });

    nextBtn.addEventListener('click', function() {
        const fromMeta = getSlideMeta(items[currentIndex], currentIndex);
        goTo(currentIndex + 1);
        startAutoRotate();
        const toIndex = wrapIndex(currentIndex);
        const toMeta = getSlideMeta(items[toIndex], toIndex);
        trackCarousel({
            action: 'nav_next',
            from_slide_index: fromMeta.slide_index,
            from_slide_title: fromMeta.slide_title,
            to_slide_index: toMeta.slide_index,
            to_slide_title: toMeta.slide_title
        });
    });

    carousel.addEventListener('click', function (event) {
        const clickedLink = event.target.closest('.skills-cover-link, .skills-cover-cta');
        if (!clickedLink || !carousel.contains(clickedLink)) return;

        const item = clickedLink.closest('.carousel-item');
        if (!item) return;
        const itemIndex = items.indexOf(item);
        const meta = getSlideMeta(item, itemIndex);
        const isCta = clickedLink.classList.contains('skills-cover-cta');

        if (item.classList.contains('prev')) {
            event.preventDefault();
            event.stopPropagation();
            goTo(currentIndex - 1);
            startAutoRotate();
            trackCarousel({
                action: 'side_slide_prev',
                click_type: isCta ? 'cta' : 'cover',
                slide_index: meta.slide_index,
                slide_title: meta.slide_title
            });
            return;
        }

        if (item.classList.contains('next')) {
            event.preventDefault();
            event.stopPropagation();
            goTo(currentIndex + 1);
            startAutoRotate();
            trackCarousel({
                action: 'side_slide_next',
                click_type: isCta ? 'cta' : 'cover',
                slide_index: meta.slide_index,
                slide_title: meta.slide_title
            });
            return;
        }

        trackCarousel({
            action: 'slide_open',
            click_type: isCta ? 'cta' : 'cover',
            slide_index: meta.slide_index,
            slide_title: meta.slide_title,
            slide_href: meta.slide_href
        });
    }, true);

    // Изначально показываем первое изображение без анимации
    renderSlides();
    requestAnimationFrame(function () {
        carousel.classList.add('is-ready');
    });
    startAutoRotate();
    mobileView.addEventListener('change', startAutoRotate);
    document.addEventListener('visibilitychange', startAutoRotate);

});

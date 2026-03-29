const YANDEX_METRIKA_COUNTER_ID = 99129194;

(function (m, e, t, r, i, k, a) {
    m[i] = m[i] || function () {
        (m[i].a = m[i].a || []).push(arguments);
    };
    m[i].l = 1 * new Date();

    for (let j = 0; j < document.scripts.length; j += 1) {
        if (document.scripts[j].src === r) {
            return;
        }
    }

    k = e.createElement(t);
    a = e.getElementsByTagName(t)[0];
    k.async = 1;
    k.src = r;
    a.parentNode.insertBefore(k, a);
})(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

ym(YANDEX_METRIKA_COUNTER_ID, "init", {
    webvisor: true,
    clickmap: true,
    referrer: document.referrer,
    url: location.href,
    accurateTrackBounce: true,
    trackLinks: true
});

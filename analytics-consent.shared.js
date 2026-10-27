(function (window, document) {
    "use strict";

    const key = "qatodev.analytics.consent.v1";
    let choice = null;
    try {
        choice = window.localStorage.getItem(key);
    } catch (_) {
        // Browsing remains possible when storage is unavailable.
    }
    window.QAtoDevAnalyticsConsent = choice === "granted" ? "granted" : "denied";

    const source = document.currentScript;
    if (source && source.src && !document.querySelector('[data-analytics-consent-style]')) {
        const css = document.createElement("link");
        css.rel = "stylesheet";
        css.href = new URL("analytics-consent.shared.css?v=1", source.src).href;
        css.dataset.analyticsConsentStyle = "";
        document.head.appendChild(css);
    }

    function render() {
        if (window !== window.top) return;
        const settings = document.querySelector("[data-cookie-settings]");
        if (settings) {
            settings.addEventListener("click", function () {
                try { window.localStorage.removeItem(key); } catch (_) {}
                window.location.reload();
            });
        }
        if (choice === "granted" || choice === "denied") return;
        const panel = document.createElement("aside");
        panel.className = "analytics-consent";
        panel.setAttribute("aria-label", "Настройки аналитических cookie");
        panel.innerHTML = '<p>Мы используем cookie и похожие технологии для работы сайта. С вашего согласия Яндекс.Метрика и Google Analytics помогают понять, как им пользуются. <a href="privacy-policy.html#cookies">О cookie и данных</a></p><div class="analytics-consent__actions"><button type="button" data-consent="denied">Без аналитики</button><button type="button" data-consent="granted">OK</button></div>';
        panel.addEventListener("click", function (event) {
            const button = event.target.closest("[data-consent]");
            if (!button) return;
            const value = button.dataset.consent;
            try { window.localStorage.setItem(key, value); } catch (_) {}
            choice = value;
            window.QAtoDevAnalyticsConsent = value;
            panel.remove();
            // The analytics loaders run in <head>; reload only after explicit consent.
            if (value === "granted") window.location.reload();
        });
        document.body.appendChild(panel);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render, { once: true });
    else render();
})(window, document);

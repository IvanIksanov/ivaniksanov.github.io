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
        css.href = new URL("analytics-consent.shared.css?v=4", source.src).href;
        css.dataset.analyticsConsentStyle = "";
        document.head.appendChild(css);
    }

    function showPanel() {
        if (window !== window.top && !document.querySelector("[data-cookie-settings]")) return;
        if (document.querySelector(".analytics-consent")) return;
        const panel = document.createElement("aside");
        panel.className = "analytics-consent";
        panel.setAttribute("aria-label", "Настройки аналитических cookie");
        panel.innerHTML = '<p>Соглашаясь, вы разрешаете нам использовать <a href="privacy-policy.html#cookies">cookie для аналитики</a>.</p><div class="analytics-consent__actions"><button type="button" data-consent="granted">ОК</button></div>';
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

    function render() {
        const settings = document.querySelector("[data-cookie-settings]");
        if (settings) {
            settings.textContent = choice === "granted" ? "Отключить аналитику" : "Включить аналитику";
            settings.addEventListener("click", function () {
                if (choice === "granted") {
                    try { window.localStorage.setItem(key, "denied"); } catch (_) {}
                    window.QAtoDevAnalyticsConsent = "denied";
                    window.location.reload();
                    return;
                }
                showPanel();
            });
        }
        // Keep the policy readable; its own control opens the notice on demand.
        if (!settings && choice !== "granted" && choice !== "denied") showPanel();
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render, { once: true });
    else render();
})(window, document);

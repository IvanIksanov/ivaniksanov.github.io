(function (window, document) {
    "use strict";

    const containerId = "GTM-NXXP6DGH";
    const productionHosts = ["qatodev.ru", "www.qatodev.ru"];
    const location = window.location;
    if (location.protocol !== "https:" || !productionHosts.includes(location.hostname)) return;

    let pathname;
    try {
        pathname = decodeURIComponent(location.pathname).replace(/\/{2,}/g, "/");
    } catch (_) {
        return;
    }
    // Test uses the production domain too, but lives entirely under /test/.
    if (/^\/test(?:\/|$)/i.test(pathname)) return;

    // Keep the existing analytics opt-out effective for both providers.
    const override = new URLSearchParams(location.search).get("disableMetrics");
    let disabled = override === "1";
    try {
        if (override === "1") window.localStorage.setItem("metrikaOptOut", "1");
        else if (override === "0") window.localStorage.removeItem("metrikaOptOut");
        else disabled = window.localStorage.getItem("metrikaOptOut") === "1";
    } catch (_) {
        // A blocked storage must not break the page or the URL opt-out.
    }
    if (disabled || document.getElementById("qatodev-gtm-container")) return;

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });

    const script = document.createElement("script");
    script.id = "qatodev-gtm-container";
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtm.js?id=" + containerId;
    const firstScript = document.getElementsByTagName("script")[0];
    firstScript.parentNode.insertBefore(script, firstScript);
})(window, document);

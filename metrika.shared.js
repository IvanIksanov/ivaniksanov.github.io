const YANDEX_METRIKA_COUNTER_ID = 99129194;
const METRIKA_OPT_OUT_KEY = "metrikaOptOut";

const protocol = window.location.protocol;
const host = window.location.hostname;
const searchParams = new URLSearchParams(window.location.search);

if (searchParams.get("disableMetrics") === "1") {
    window.localStorage.setItem(METRIKA_OPT_OUT_KEY, "1");
}

if (searchParams.get("disableMetrics") === "0") {
    window.localStorage.removeItem(METRIKA_OPT_OUT_KEY);
}

const isLocalEnvironment =
    protocol === "file:" ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1";

const isOptedOut = window.localStorage.getItem(METRIKA_OPT_OUT_KEY) === "1";

function sanitizeMetricValue(value) {
    if (value === null || value === undefined) return undefined;
    if (Array.isArray(value)) {
        const mapped = value
            .map(sanitizeMetricValue)
            .filter((item) => item !== undefined);
        return mapped.length ? mapped.slice(0, 20) : undefined;
    }
    if (typeof value === "object") {
        const result = {};
        Object.keys(value).slice(0, 20).forEach((key) => {
            const nextValue = sanitizeMetricValue(value[key]);
            if (nextValue !== undefined) {
                result[key] = nextValue;
            }
        });
        return Object.keys(result).length ? result : undefined;
    }
    if (typeof value === "string") {
        const normalized = value.trim();
        return normalized ? normalized.slice(0, 200) : undefined;
    }
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : undefined;
    }
    if (typeof value === "boolean") {
        return value;
    }
    return String(value).slice(0, 200);
}

function sanitizeMetricParams(params) {
    const sanitized = sanitizeMetricValue(params);
    return sanitized && typeof sanitized === "object" && !Array.isArray(sanitized) ? sanitized : undefined;
}

function reachMetrikaGoal(goalId, params) {
    if (!goalId || isLocalEnvironment || isOptedOut || typeof window.ym !== "function") {
        return false;
    }
    try {
        const sanitizedParams = sanitizeMetricParams(params);
        if (sanitizedParams) {
            window.ym(YANDEX_METRIKA_COUNTER_ID, "reachGoal", goalId, sanitizedParams);
        } else {
            window.ym(YANDEX_METRIKA_COUNTER_ID, "reachGoal", goalId);
        }
        return true;
    } catch (error) {
        console.warn("Failed to send Metrica goal", goalId, error);
        return false;
    }
}

window.QAtoDevMetrics = {
    counterId: YANDEX_METRIKA_COUNTER_ID,
    enabled: !(isLocalEnvironment || isOptedOut),
    reachGoal: reachMetrikaGoal
};

if (isLocalEnvironment || isOptedOut) {
    window.ym = window.ym || function () {};
} else {
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
}

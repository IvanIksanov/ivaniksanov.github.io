(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.DebugLog = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const STORAGE_KEY = "debug_events_v1";
  const MAX_EVENTS = 250;

  function safeNowIso() {
    try {
      return new Date().toISOString();
    } catch {
      return String(Date.now());
    }
  }

  function safeReadStoredEvents() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(raw || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  let buffer = safeReadStoredEvents();

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(buffer.slice(-MAX_EVENTS)));
    } catch {}
  }

  function isVerbose() {
    try {
      if ((localStorage.getItem("debug_mode") || "") === "verbose") return true;
    } catch {}
    try {
      return new URLSearchParams(window.location.search).get("debug") === "1";
    } catch {
      return false;
    }
  }

  function sanitizeValue(value, keyHint = "") {
    if (value == null) return value;
    if (typeof value === "string") {
      const lowerKey = String(keyHint || "").toLowerCase();
      if (lowerKey.includes("token") || lowerKey.includes("authorization") || lowerKey.includes("apikey")) {
        if (value.length <= 12) return "[masked]";
        return `${value.slice(0, 6)}...[masked]...${value.slice(-4)}`;
      }
      if (lowerKey.includes("email")) {
        const atIndex = value.indexOf("@");
        if (atIndex > 2) {
          return `${value.slice(0, 2)}***${value.slice(atIndex)}`;
        }
      }
      return value.length > 500 ? `${value.slice(0, 500)}...[trimmed]` : value;
    }
    if (Array.isArray(value)) {
      return value.slice(0, 20).map((item) => sanitizeValue(item));
    }
    if (typeof value === "object") {
      const out = {};
      Object.keys(value).slice(0, 50).forEach((key) => {
        out[key] = sanitizeValue(value[key], key);
      });
      return out;
    }
    return value;
  }

  function createEvent(level, area, event, details) {
    return {
      ts: safeNowIso(),
      level: level || "info",
      area: area || "app",
      event: event || "event",
      page: typeof window !== "undefined" ? window.location.pathname : "",
      online: typeof navigator !== "undefined" ? navigator.onLine : undefined,
      visibility: typeof document !== "undefined" ? document.visibilityState : undefined,
      details: sanitizeValue(details || {})
    };
  }

  function write(level, area, event, details) {
    const entry = createEvent(level, area, event, details);
    buffer.push(entry);
    if (buffer.length > MAX_EVENTS) {
      buffer = buffer.slice(-MAX_EVENTS);
    }
    persist();

    const shouldEcho = level !== "debug" || isVerbose();
    if (shouldEcho && typeof console !== "undefined") {
      const prefix = `[debug:${entry.area}] ${entry.event}`;
      if (level === "error" && console.error) {
        console.error(prefix, entry.details);
      } else if (level === "warn" && console.warn) {
        console.warn(prefix, entry.details);
      } else if (console.info) {
        console.info(prefix, entry.details);
      }
    }
    return entry;
  }

  function getStateSnapshot() {
    const globalRef = typeof globalThis !== "undefined" ? globalThis : window;
    const authCoreState = globalRef?.__authDebugState || globalRef?.AuthCoreShared?.getState?.() || null;
    return sanitizeValue({
      href: typeof window !== "undefined" ? window.location.href : "",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      authVisualState: globalRef?.document?.documentElement?.getAttribute?.("data-auth-visual-state") || "",
      authCoreState,
      pendingMutations: (() => {
        try {
          return JSON.parse(localStorage.getItem("cloud_pending_mutations_v1") || "[]");
        } catch {
          return [];
        }
      })()
    });
  }

  function exportBugReport() {
    return {
      generatedAt: safeNowIso(),
      state: getStateSnapshot(),
      recentEvents: buffer.slice(-MAX_EVENTS)
    };
  }

  if (typeof window !== "undefined") {
    window.addEventListener("error", (event) => {
      write("error", "window", "error", {
        message: event.message || "",
        filename: event.filename || "",
        lineno: event.lineno || 0,
        colno: event.colno || 0
      });
    });
    window.addEventListener("unhandledrejection", (event) => {
      write("error", "window", "unhandledrejection", {
        reason: String(event.reason?.message || event.reason || "")
      });
    });
  }

  return {
    log(area, event, details) {
      return write("info", area, event, details);
    },
    info(area, event, details) {
      return write("info", area, event, details);
    },
    warn(area, event, details) {
      return write("warn", area, event, details);
    },
    error(area, event, details) {
      return write("error", area, event, details);
    },
    debug(area, event, details) {
      return write("debug", area, event, details);
    },
    dump() {
      return buffer.slice();
    },
    clear() {
      buffer = [];
      persist();
    },
    exportBugReport,
    copy() {
      const payload = JSON.stringify(exportBugReport(), null, 2);
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(payload).catch(() => {});
      }
      return payload;
    }
  };
});

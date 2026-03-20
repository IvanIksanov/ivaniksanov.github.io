(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.AuthStateShared = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function getAuthUiConfig(options) {
    const isAuthenticated = !!options?.isAuthenticated;
    return {
      buttonLabel: isAuthenticated ? "" : "Войти",
      modalPlacement: isAuthenticated ? "anchored" : "centered"
    };
  }

  function resolveProtectedAction(options) {
    const isAuthenticated = !!options?.isAuthenticated;
    const hasGuestBypass = !!options?.hasGuestBypass;
    const isAuthAvailable = options?.isAuthAvailable !== false;
    if (isAuthenticated || hasGuestBypass) {
      return {
        allowed: true,
        shouldOpenAuthModal: false,
        shouldPersistGuestBypassOnClose: false
      };
    }
    return {
      allowed: false,
      shouldOpenAuthModal: true,
      shouldPersistGuestBypassOnClose: isAuthAvailable
    };
  }

  function resolveGuestModalClose(options) {
    return {
      enableGuestBypass: !!options?.allowsGuestAfterClose && !options?.isAuthenticated
    };
  }

  function resolveDeferredActionAfterAuth(options) {
    const pendingAction = options?.pendingAction || null;
    return {
      shouldRun: !!options?.isAuthenticated && !!pendingAction,
      pendingAction
    };
  }

  function consumeSavedScrollPosition(options) {
    const saved = options?.saved;
    const currentPath = options?.currentPath || "";
    const now = Number(options?.now || Date.now());
    const ttlMs = Number(options?.ttlMs || 0);

    if (!saved || typeof saved.y !== "number") return null;
    if (saved.path && saved.path !== currentPath) return null;
    if (saved.ts && ttlMs > 0 && (now - Number(saved.ts)) > ttlMs) return null;
    return Math.max(0, Math.round(saved.y));
  }

  return {
    getAuthUiConfig,
    resolveProtectedAction,
    resolveGuestModalClose,
    resolveDeferredActionAfterAuth,
    consumeSavedScrollPosition
  };
});

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getAuthUiConfig,
  resolveProtectedAction,
  resolveGuestModalClose,
  resolveDeferredActionAfterAuth,
  consumeSavedScrollPosition
} = require("../auth.state.shared.js");

test("guest auth UI keeps login label and centers modal", () => {
  assert.deepEqual(getAuthUiConfig({ isAuthenticated: false }), {
    buttonLabel: "Войти",
    modalPlacement: "centered"
  });
});

test("authorized auth UI hides login label and anchors modal", () => {
  assert.deepEqual(getAuthUiConfig({ isAuthenticated: true }), {
    buttonLabel: "",
    modalPlacement: "anchored"
  });
});

test("protected action requires auth when bypass is not enabled", () => {
  assert.deepEqual(resolveProtectedAction({
    isAuthenticated: false,
    hasGuestBypass: false,
    isAuthAvailable: true
  }), {
    allowed: false,
    shouldOpenAuthModal: true,
    shouldPersistGuestBypassOnClose: true
  });
});

test("protected action proceeds for guest when bypass is already enabled", () => {
  assert.deepEqual(resolveProtectedAction({
    isAuthenticated: false,
    hasGuestBypass: true,
    isAuthAvailable: true
  }), {
    allowed: true,
    shouldOpenAuthModal: false,
    shouldPersistGuestBypassOnClose: false
  });
});

test("closing guest auth modal enables bypass for gated features", () => {
  assert.deepEqual(resolveGuestModalClose({
    isAuthenticated: false,
    allowsGuestAfterClose: true
  }), {
    enableGuestBypass: true
  });
});

test("closing auth modal does not enable bypass for authorized user", () => {
  assert.deepEqual(resolveGuestModalClose({
    isAuthenticated: true,
    allowsGuestAfterClose: true
  }), {
    enableGuestBypass: false
  });
});

test("deferred action runs automatically after successful auth", () => {
  assert.deepEqual(resolveDeferredActionAfterAuth({
    isAuthenticated: true,
    pendingAction: { type: "show-study-plan" }
  }), {
    shouldRun: true,
    pendingAction: { type: "show-study-plan" }
  });
});

test("deferred action stays pending until auth exists", () => {
  assert.deepEqual(resolveDeferredActionAfterAuth({
    isAuthenticated: false,
    pendingAction: { type: "show-study-plan" }
  }), {
    shouldRun: false,
    pendingAction: { type: "show-study-plan" }
  });
});

test("saved scroll position is restored only for same path and fresh entry", () => {
  assert.equal(consumeSavedScrollPosition({
    saved: {
      y: 320,
      path: "/index.html",
      ts: 1_000
    },
    currentPath: "/index.html",
    now: 5_000,
    ttlMs: 30 * 60 * 1000
  }), 320);
});

test("saved scroll position is ignored when entry expired", () => {
  assert.equal(consumeSavedScrollPosition({
    saved: {
      y: 320,
      path: "/index.html",
      ts: 1_000
    },
    currentPath: "/index.html",
    now: 31 * 60 * 1000 + 2_000,
    ttlMs: 30 * 60 * 1000
  }), null);
});

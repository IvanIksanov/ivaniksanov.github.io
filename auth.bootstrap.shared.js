(function () {
  try {
    const authVisualState = localStorage.getItem("auth_visual_state_v1");
    if (authVisualState === "guest" || authVisualState === "auth") {
      document.documentElement.setAttribute("data-auth-visual-state", authVisualState);
    }
  } catch {}
})();

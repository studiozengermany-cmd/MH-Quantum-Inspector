// ============================================================
//  Toast Notification
// ============================================================

const MHQToast = (() => {

  let el      = null;
  let timeout = null;

  function init() {
    if (el) return;
    el    = document.createElement("div");
    el.id = "mhq-toast";
    document.body.appendChild(el);
  }

  function show(message, type = "success", duration = 2800) {
    if (!el) return;
    const safeType = ["success", "warn", "error"].includes(type) ? type : "success";
    el.textContent = message;
    el.className   = `show ${safeType}`;
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      el.classList.remove("show");
    }, duration);
  }

  return { init, show };
})();

"use strict";

(() => {
  const mobileBreakpoint = window.matchMedia("(max-width: 850px)");

  function initializeAdminNavigation() {
    const sidebar = document.querySelector(".admin-sidebar");
    const main = document.querySelector(".admin-main");

    if (!sidebar || !main) return;

    sidebar.id = sidebar.id || "adminSidebar";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "admin-menu-toggle";
    toggle.setAttribute("aria-controls", sidebar.id);
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open admin menu");
    toggle.innerHTML = '<span class="admin-menu-toggle-lines" aria-hidden="true"></span>';

    const close = document.createElement("button");
    close.type = "button";
    close.className = "admin-menu-close";
    close.setAttribute("aria-label", "Close admin menu");
    close.innerHTML = '<span aria-hidden="true">&times;</span>';

    const overlay = document.createElement("div");
    overlay.className = "admin-sidebar-overlay";
    overlay.hidden = true;

    document.body.append(toggle, overlay);
    sidebar.prepend(close);

    function setMenuOpen(open, restoreFocus = false) {
      const shouldOpen = Boolean(open) && mobileBreakpoint.matches;

      sidebar.classList.toggle("open", shouldOpen);
      document.body.classList.toggle("admin-menu-open", shouldOpen);
      overlay.hidden = !shouldOpen;
      toggle.setAttribute("aria-expanded", String(shouldOpen));
      toggle.setAttribute("aria-label", shouldOpen ? "Close admin menu" : "Open admin menu");

      if (shouldOpen) close.focus();
      else if (restoreFocus) toggle.focus();
    }

    toggle.addEventListener("click", () => {
      setMenuOpen(!sidebar.classList.contains("open"), true);
    });

    close.addEventListener("click", () => setMenuOpen(false, true));
    overlay.addEventListener("click", () => setMenuOpen(false, true));

    sidebar.querySelector(".admin-menu")?.addEventListener("click", event => {
      if (event.target.closest("a")) setMenuOpen(false);
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && sidebar.classList.contains("open")) {
        setMenuOpen(false, true);
      }
    });

    mobileBreakpoint.addEventListener("change", event => {
      if (!event.matches) setMenuOpen(false);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeAdminNavigation, { once: true });
  } else {
    initializeAdminNavigation();
  }
})();

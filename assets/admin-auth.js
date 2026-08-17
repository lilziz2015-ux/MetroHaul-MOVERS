"use strict";

/* =========================================================
   METRO HAUL ADMIN AUTHENTICATION
   ========================================================= */

(function () {

  /* =======================================================
     SHARED SUPABASE CLIENT
  ======================================================= */

  const db =
    window.metroHaulDb ||
    window.metroHaulDB ||
    window.db;

  if (!db) {
    console.error(
      "Metro Haul Supabase client is unavailable. Load supabase.js before admin-auth.js."
    );
    return;
  }

  /*
    Keep all aliases available for older files
    while the admin portal is being standardized.
  */

  window.metroHaulDb = db;
  window.metroHaulDB = db;
  window.db = db;


  /* =======================================================
     PAGE HELPERS
  ======================================================= */

  function currentPage() {
    const path =
      window.location.pathname;

    const page =
      path
        .split("/")
        .pop()
        .toLowerCase();

    return page || "index.html";
  }


  function isLoginPage() {
    return currentPage() ===
      "login.html";
  }


  function loginPageURL() {
    return "login.html";
  }


  /* =======================================================
     GLOBAL AUTH STATE
  ======================================================= */

  function clearAdminState() {
    window.MetroHaulAdmin = {
      user: null,
      profile: null,
      isAuthenticated: false
    };

    /*
      Temporary backwards compatibility
      for older admin JavaScript.
    */

    window.metroHaulAdmin =
      null;
  }


  clearAdminState();


  /* =======================================================
     ADMIN PROFILE
  ======================================================= */

  async function getAdminProfile(
    userId
  ) {
    if (!userId) {
      return null;
    }

    const {
      data,
      error
    } =
      await db
        .from("admin_users")
        .select(`
          id,
          full_name,
          role,
          is_active,
          created_at,
          updated_at
        `)
        .eq(
          "id",
          userId
        )
        .maybeSingle();

    if (error) {
      console.error(
        "Admin profile error:",
        error
      );

      return null;
    }

    if (
      !data ||
      data.is_active !== true
    ) {
      return null;
    }

    return data;
  }


  /* =======================================================
     GET CURRENT ADMIN
  ======================================================= */

  async function getCurrentAdmin() {
    try {
      const {
        data,
        error
      } =
        await db.auth.getUser();

      if (
        error ||
        !data?.user
      ) {
        return null;
      }

      const profile =
        await getAdminProfile(
          data.user.id
        );

      if (!profile) {
        return null;
      }

      return {
        user:
          data.user,

        profile,

        isAuthenticated:
          true
      };

    } catch (error) {
      console.error(
        "Get current admin error:",
        error
      );

      return null;
    }
  }


  window.getCurrentMetroHaulAdmin =
    getCurrentAdmin;


  /* =======================================================
     ADMIN NAME
  ======================================================= */

  function updateAdminName(
    admin
  ) {
    const adminName =
      document.getElementById(
        "adminName"
      );

    if (!adminName) {
      return;
    }

    adminName.textContent =
      admin?.profile?.full_name ||
      admin?.user?.email ||
      "Metro Haul Admin";
  }


  /* =======================================================
     ADMIN READY EVENT
  ======================================================= */

  function publishAdminState(
    admin
  ) {
    window.MetroHaulAdmin = {
      user:
        admin.user,

      profile:
        admin.profile,

      isAuthenticated:
        true
    };

    /*
      Keep compatibility with any older
      admin files still using this variable.
    */

    window.metroHaulAdmin = {
      user:
        admin.user,

      profile:
        admin.profile
    };

    updateAdminName(
      admin
    );

    document.dispatchEvent(
      new CustomEvent(
        "metrohaul:admin-ready",
        {
          detail:
            window.MetroHaulAdmin
        }
      )
    );
  }


  /* =======================================================
     REDIRECT TO LOGIN
  ======================================================= */

  async function redirectToLogin(
    signOut = false
  ) {
    clearAdminState();

    if (signOut) {
      try {
        await db.auth.signOut();
      } catch (error) {
        console.warn(
          "Could not clear Supabase session:",
          error
        );
      }
    }

    if (!isLoginPage()) {
      window.location.replace(
        loginPageURL()
      );
    }
  }


  /* =======================================================
     PROTECT ADMIN PAGE
  ======================================================= */

  async function protectAdminPage() {
    /*
      Login is managed separately by
      admin-login.js.
    */

    if (isLoginPage()) {
      return true;
    }

    const admin =
      await getCurrentAdmin();

    if (!admin) {
      await redirectToLogin(
        true
      );

      return false;
    }

    publishAdminState(
      admin
    );

    return true;
  }


  /* =======================================================
     LOGOUT
  ======================================================= */

  async function logoutAdmin() {
    try {
      await db.auth.signOut();

    } catch (error) {
      console.error(
        "Metro Haul logout error:",
        error
      );

    } finally {
      clearAdminState();

      window.location.replace(
        loginPageURL()
      );
    }
  }


  window.logoutMetroHaulAdmin =
    logoutAdmin;


  /* =======================================================
     LOGOUT BUTTONS
  ======================================================= */

  function setupLogoutButtons() {
    document.addEventListener(
      "click",
      event => {
        const button =
          event.target.closest(
            "[data-admin-logout]"
          );

        if (!button) {
          return;
        }

        event.preventDefault();

        logoutAdmin();
      }
    );
  }


  /* =======================================================
     AUTH STATE CHANGES
  ======================================================= */

  function setupAuthStateListener() {
    db.auth.onAuthStateChange(
      (
        event,
        session
      ) => {

        if (
          event === "SIGNED_OUT"
        ) {
          clearAdminState();

          if (!isLoginPage()) {
            window.location.replace(
              loginPageURL()
            );
          }

          return;
        }

        /*
          If a session is restored or refreshed,
          protected pages already have their
          authorization checked during startup.
        */

        if (
          event === "TOKEN_REFRESHED" &&
          session
        ) {
          return;
        }
      }
    );
  }


  /* =======================================================
     INITIALIZE
  ======================================================= */

  async function initialize() {
    setupLogoutButtons();

    setupAuthStateListener();

    /*
      admin-login.js handles the login page.
      Do not attach another login submit
      handler here.
    */

    if (isLoginPage()) {
      return;
    }

    try {
      await protectAdminPage();

    } catch (error) {
      console.error(
        "Metro Haul admin authentication initialization error:",
        error
      );

      await redirectToLogin(
        false
      );
    }
  }


  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      {
        once: true
      }
    );

  } else {
    initialize();
  }

})();
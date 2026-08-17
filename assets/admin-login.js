"use strict";


(function () {


  /* ======================================================
     ELEMENTS
  ====================================================== */

  const form =
    document.getElementById(
      "adminLoginForm"
    );


  if (!form) {
    return;
  }


  const emailInput =
    document.getElementById(
      "adminEmail"
    );


  const passwordInput =
    document.getElementById(
      "adminPassword"
    );


  const loginButton =
    document.getElementById(
      "adminLoginButton"
    );


  const loginMessage =
    document.getElementById(
      "adminLoginMessage"
    );


  const togglePasswordButton =
    document.getElementById(
      "toggleAdminPassword"
    );


  const rememberAdmin =
    document.getElementById(
      "rememberAdmin"
    );


  /* ======================================================
     SHARED SUPABASE CLIENT
  ====================================================== */

  const db =
    window.metroHaulDb ||
    window.metroHaulDB ||
    window.db;


  if (!db) {

    console.error(
      "Metro Haul Supabase client is unavailable. Load supabase.js before admin-login.js."
    );


    showMessage(
      "The login system could not load. Please refresh the page.",
      "error"
    );


    if (loginButton) {
      loginButton.disabled =
        true;
    }


    return;
  }


  /* ======================================================
     HELPERS
  ====================================================== */

  function clean(value) {

    if (
      value === null ||
      value === undefined
    ) {
      return "";
    }


    return String(value)
      .trim();
  }


  function normalizeEmail(value) {

    return clean(value)
      .toLowerCase();
  }


  /* ======================================================
     MESSAGE
  ====================================================== */

  function showMessage(
    message,
    type = "error"
  ) {

    if (!loginMessage) {
      return;
    }


    loginMessage.textContent =
      message;


    loginMessage.hidden =
      false;


    loginMessage.classList.remove(
      "success",
      "error"
    );


    loginMessage.classList.add(
      type
    );
  }


  function clearMessage() {

    if (!loginMessage) {
      return;
    }


    loginMessage.textContent =
      "";


    loginMessage.hidden =
      true;


    loginMessage.classList.remove(
      "success",
      "error"
    );
  }


  /* ======================================================
     BUTTON STATE
  ====================================================== */

  function setLoginState(
    loading
  ) {

    if (!loginButton) {
      return;
    }


    loginButton.disabled =
      loading;


    loginButton.textContent =
      loading
        ? "Signing In..."
        : "Sign In to Dashboard";
  }


  /* ======================================================
     PASSWORD VISIBILITY
  ====================================================== */

  togglePasswordButton
    ?.addEventListener(
      "click",
      () => {

        if (!passwordInput) {
          return;
        }


        const showingPassword =
          passwordInput.type ===
          "text";


        passwordInput.type =
          showingPassword
            ? "password"
            : "text";


        togglePasswordButton.textContent =
          showingPassword
            ? "Show"
            : "Hide";


        togglePasswordButton.setAttribute(
          "aria-label",
          showingPassword
            ? "Show password"
            : "Hide password"
        );


        togglePasswordButton.setAttribute(
          "aria-pressed",
          showingPassword
            ? "false"
            : "true"
        );

      }
    );


  /* ======================================================
     VERIFY ADMIN ACCESS
  ====================================================== */

  async function verifyAdmin(
    user
  ) {

    if (!user?.id) {

      throw new Error(
        "The authenticated user could not be verified."
      );
    }


    const {
      data,
      error
    } =
      await db
        .from(
          "admin_users"
        )
        .select(`
          id,
          full_name,
          role,
          is_active
        `)
        .eq(
          "id",
          user.id
        )
        .maybeSingle();


    if (error) {

      console.error(
        "Admin verification error:",
        error
      );


      throw new Error(
        "We couldn't verify your Metro Haul admin account."
      );
    }


    if (!data) {

      throw new Error(
        "This account is not authorized to access Metro Haul Admin."
      );
    }


    if (
      data.is_active !==
      true
    ) {

      throw new Error(
        "This Metro Haul admin account is disabled."
      );
    }


    return data;
  }


  /* ======================================================
     REDIRECT
  ====================================================== */

  function goToDashboard() {

    window.location.replace(
      "index.html"
    );
  }


  /* ======================================================
     LOGIN
  ====================================================== */

  form.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      clearMessage();


      if (
        !form.checkValidity()
      ) {

        form.reportValidity();

        return;
      }


      const email =
        normalizeEmail(
          emailInput?.value
        );


      const password =
        String(
          passwordInput?.value ||
          ""
        );


      if (
        !email ||
        !password
      ) {

        showMessage(
          "Enter your email and password.",
          "error"
        );

        return;
      }


      setLoginState(
        true
      );


      try {

        /* ===============================================
           AUTHENTICATE
        =============================================== */

        const {
          data,
          error
        } =
          await db.auth
            .signInWithPassword({
              email,
              password
            });


        if (error) {

          console.error(
            "Supabase login error:",
            error
          );


          throw new Error(
            "Incorrect email or password."
          );
        }


        if (
          !data?.user ||
          !data?.session
        ) {

          throw new Error(
            "The login session could not be created."
          );
        }


        /* ===============================================
           VERIFY CRM ACCESS
        =============================================== */

        let admin;


        try {

          admin =
            await verifyAdmin(
              data.user
            );

        } catch (
          adminError
        ) {

          /*
            Authentication succeeded but the
            account is not an active Metro Haul
            administrator.

            Remove the session immediately.
          */

          await db.auth
            .signOut();


          throw adminError;
        }


        console.info(
          "Metro Haul admin authenticated.",
          {
            role:
              admin.role,

            name:
              admin.full_name ||
              data.user.email
          }
        );


        /* ===============================================
           REMEMBER PREFERENCE

           The shared Supabase client owns session
           persistence. Store this preference so the
           application can honor it consistently without
           creating another auth client here.
        =============================================== */

        try {

          localStorage.setItem(
            "metro-haul-admin-remember",
            rememberAdmin?.checked
              ? "true"
              : "false"
          );

        } catch (
          storageError
        ) {

          console.warn(
            "Remember preference could not be stored:",
            storageError
          );
        }


        showMessage(
          "Signed in successfully. Opening dashboard...",
          "success"
        );


        goToDashboard();


      } catch (error) {

        console.error(
          "Metro Haul login error:",
          error
        );


        showMessage(
          error?.message ||
          "We couldn't sign you in.",
          "error"
        );


      } finally {

        setLoginState(
          false
        );
      }

    }
  );


  /* ======================================================
     EXISTING SESSION
  ====================================================== */

  async function checkExistingSession() {

    try {

      const {
        data,
        error
      } =
        await db.auth
          .getSession();


      if (error) {

        console.error(
          "Session check error:",
          error
        );

        return;
      }


      const session =
        data?.session;


      if (
        !session?.user
      ) {
        return;
      }


      try {

        await verifyAdmin(
          session.user
        );


        goToDashboard();


      } catch (error) {

        console.warn(
          "Existing session is not authorized for Metro Haul Admin:",
          error
        );


        await db.auth
          .signOut();
      }


    } catch (error) {

      console.error(
        "Admin session check failed:",
        error
      );
    }
  }


  /* ======================================================
     INPUT EVENTS
  ====================================================== */

  emailInput
    ?.addEventListener(
      "input",
      clearMessage
    );


  passwordInput
    ?.addEventListener(
      "input",
      clearMessage
    );


  /* ======================================================
     INITIALIZE
  ====================================================== */

  checkExistingSession();


})();
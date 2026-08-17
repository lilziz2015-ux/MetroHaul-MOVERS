"use strict";

document.addEventListener("DOMContentLoaded", async () => {

  /* ======================================================
     SHARED SUPABASE CLIENT
  ====================================================== */

  const db =
    window.metroHaulDb ||
    window.metroHaulDB ||
    window.db;

  if (!db) {
    console.error(
      "Metro Haul Supabase client is unavailable. Load supabase.js before admin-settings.js."
    );
    return;
  }


  /* ======================================================
     ELEMENTS
  ====================================================== */

  const settingsForm =
    document.getElementById("settingsForm");

  const settingsMessage =
    document.getElementById("settingsMessage");

  const saveSettingsButton =
    document.getElementById("saveSettingsButton");

  const saveSettingsTopButton =
    document.getElementById("saveSettingsTopButton");

  const settingsLastSaved =
    document.getElementById("settingsLastSaved");

  const stateInput =
    document.getElementById("state");


  /* ======================================================
     STATE
  ====================================================== */

  let settingsRow =
    null;


  /* ======================================================
     HELPERS
  ====================================================== */

  function clean(value) {
    if (
      value === null ||
      value === undefined
    ) {
      return null;
    }

    const result =
      String(value).trim();

    return result || null;
  }


  function nullableNumber(value) {
    if (
      value === null ||
      value === undefined ||
      String(value).trim() === ""
    ) {
      return null;
    }

    const number =
      Number(value);

    return Number.isFinite(number)
      ? number
      : null;
  }


  function numberValue(value) {
    const number =
      Number(value);

    return Number.isFinite(number)
      ? number
      : 0;
  }


  function setValue(
    id,
    value
  ) {
    const element =
      document.getElementById(id);

    if (!element) {
      return;
    }

    element.value =
      value ?? "";
  }


  function getValue(id) {
    return document
      .getElementById(id)
      ?.value ?? "";
  }


  function formatDateTime(value) {
    if (!value) {
      return "Never";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "Unknown";
    }

    return date.toLocaleString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
      }
    );
  }


  /* ======================================================
     MESSAGES
  ====================================================== */

  function showMessage(
    message,
    type = "success"
  ) {
    if (!settingsMessage) {
      return;
    }

    settingsMessage.textContent =
      message;

    settingsMessage.hidden =
      false;

    settingsMessage.classList.remove(
      "success",
      "error"
    );

    settingsMessage.classList.add(
      type
    );
  }


  function hideMessage() {
    if (!settingsMessage) {
      return;
    }

    settingsMessage.textContent =
      "";

    settingsMessage.hidden =
      true;

    settingsMessage.classList.remove(
      "success",
      "error"
    );
  }


  function setSavingState(saving) {
    if (saveSettingsButton) {
      saveSettingsButton.disabled =
        saving;

      saveSettingsButton.textContent =
        saving
          ? "Saving..."
          : "Save Settings";
    }

    if (saveSettingsTopButton) {
      saveSettingsTopButton.disabled =
        saving;

      saveSettingsTopButton.textContent =
        saving
          ? "Saving..."
          : "Save Settings";
    }
  }


  /* ======================================================
     SHARED ADMIN AUTH
  ====================================================== */

  async function waitForAdminAuth() {
    if (
      window.MetroHaulAdmin
        ?.isAuthenticated
    ) {
      return true;
    }

    return new Promise(
      resolve => {
        let finished =
          false;

        function finish(success) {
          if (finished) {
            return;
          }

          finished =
            true;

          resolve(success);
        }

        document.addEventListener(
          "metrohaul:admin-ready",
          () => {
            finish(
              Boolean(
                window.MetroHaulAdmin
                  ?.isAuthenticated
              )
            );
          },
          {
            once: true
          }
        );

        setTimeout(
          () => {
            finish(
              Boolean(
                window.MetroHaulAdmin
                  ?.isAuthenticated
              )
            );
          },
          5000
        );
      }
    );
  }


  /* ======================================================
     POPULATE FORM
  ====================================================== */

  function populateForm(settings) {
    if (!settings) {
      return;
    }

    setValue(
      "business_name",
      settings.business_name
    );

    setValue(
      "phone",
      settings.phone
    );

    setValue(
      "email",
      settings.email
    );

    setValue(
      "website",
      settings.website
    );

    setValue(
      "address",
      settings.address
    );

    setValue(
      "city",
      settings.city
    );

    setValue(
      "state",
      settings.state
    );

    setValue(
      "zip",
      settings.zip
    );

    setValue(
      "default_hourly_rate",
      settings.default_hourly_rate
    );

    setValue(
      "default_travel_fee",
      settings.default_travel_fee
    );

    setValue(
      "default_truck_fee",
      settings.default_truck_fee
    );

    setValue(
      "default_tax_rate",
      settings.default_tax_rate
    );

    setValue(
      "default_deposit_amount",
      settings.default_deposit_amount
    );

    setValue(
      "estimate_terms",
      settings.estimate_terms
    );

    setValue(
      "invoice_notes",
      settings.invoice_notes
    );

    setValue(
      "timezone",
      settings.timezone ||
      "America/New_York"
    );
  }


  /* ======================================================
     LOAD SETTINGS
  ====================================================== */

  async function loadSettings() {
    hideMessage();

    if (settingsLastSaved) {
      settingsLastSaved.textContent =
        "Loading settings...";
    }

    /*
      Use the shared defaults helper when available.
      It already reads the first business_settings row.
    */

    if (
      window.MetroHaulDefaults
        ?.loadBusinessSettings
    ) {
      settingsRow =
        await window
          .MetroHaulDefaults
          .loadBusinessSettings(
            true
          );

    } else {
      const {
        data,
        error
      } =
        await db
          .from("business_settings")
          .select(`
            id,
            business_name,
            phone,
            email,
            website,
            address,
            city,
            state,
            zip,
            default_hourly_rate,
            default_travel_fee,
            default_truck_fee,
            default_tax_rate,
            default_deposit_amount,
            estimate_terms,
            invoice_notes,
            timezone,
            created_at,
            updated_at
          `)
          .order(
            "created_at",
            {
              ascending: true
            }
          )
          .limit(1)
          .maybeSingle();

      if (error) {
        throw error;
      }

      settingsRow =
        data || null;
    }


    if (!settingsRow) {
      /*
        This normally should not happen because
        Metro Haul already has a settings row.

        Keep the page usable if the row was
        accidentally removed.
      */

      populateForm({
        business_name:
          "Metro Haul Moving & Junk Removal",

        default_travel_fee:
          0,

        default_truck_fee:
          0,

        default_tax_rate:
          0,

        default_deposit_amount:
          0,

        timezone:
          "America/New_York"
      });

      if (settingsLastSaved) {
        settingsLastSaved.textContent =
          "Settings have not been saved yet";
      }

      showMessage(
        "No settings record exists yet. Saving this form will create it.",
        "error"
      );

      return;
    }


    populateForm(
      settingsRow
    );

    if (settingsLastSaved) {
      settingsLastSaved.textContent =
        `Last saved ${formatDateTime(
          settingsRow.updated_at
        )}`;
    }
  }


  /* ======================================================
     VALIDATION
  ====================================================== */

  function validateNonNegative(
    value,
    label,
    nullable = false
  ) {
    if (
      nullable &&
      value === null
    ) {
      return;
    }

    if (
      !Number.isFinite(value) ||
      value < 0
    ) {
      throw new Error(
        `${label} cannot be negative.`
      );
    }
  }


  /* ======================================================
     BUILD PAYLOAD
  ====================================================== */

  function buildPayload() {
    const hourlyRate =
      nullableNumber(
        getValue(
          "default_hourly_rate"
        )
      );

    const travelFee =
      numberValue(
        getValue(
          "default_travel_fee"
        )
      );

    const truckFee =
      numberValue(
        getValue(
          "default_truck_fee"
        )
      );

    const taxRate =
      numberValue(
        getValue(
          "default_tax_rate"
        )
      );

    const deposit =
      numberValue(
        getValue(
          "default_deposit_amount"
        )
      );


    validateNonNegative(
      hourlyRate,
      "Default hourly rate",
      true
    );

    validateNonNegative(
      travelFee,
      "Default travel fee"
    );

    validateNonNegative(
      truckFee,
      "Default truck fee"
    );

    validateNonNegative(
      taxRate,
      "Default tax rate"
    );

    validateNonNegative(
      deposit,
      "Default deposit amount"
    );


    const state =
      clean(
        getValue(
          "state"
        )
      );


    return {
      business_name:
        clean(
          getValue(
            "business_name"
          )
        ) ||
        "Metro Haul Moving & Junk Removal",

      phone:
        clean(
          getValue(
            "phone"
          )
        ),

      email:
        clean(
          getValue(
            "email"
          )
        ),

      website:
        clean(
          getValue(
            "website"
          )
        ),

      address:
        clean(
          getValue(
            "address"
          )
        ),

      city:
        clean(
          getValue(
            "city"
          )
        ),

      state:
        state
          ? state.toUpperCase()
          : null,

      zip:
        clean(
          getValue(
            "zip"
          )
        ),

      default_hourly_rate:
        hourlyRate,

      default_travel_fee:
        travelFee,

      default_truck_fee:
        truckFee,

      default_tax_rate:
        taxRate,

      default_deposit_amount:
        deposit,

      estimate_terms:
        clean(
          getValue(
            "estimate_terms"
          )
        ),

      invoice_notes:
        clean(
          getValue(
            "invoice_notes"
          )
        ),

      timezone:
        clean(
          getValue(
            "timezone"
          )
        ) ||
        "America/New_York"
    };
  }


  /* ======================================================
     SAVE SETTINGS
  ====================================================== */

  async function saveSettings(event) {
    event?.preventDefault();

    hideMessage();

    if (
      !settingsForm?.checkValidity()
    ) {
      settingsForm.reportValidity();
      return;
    }

    setSavingState(
      true
    );


    try {
      const payload =
        buildPayload();

      let query;


      /* ===============================================
         UPDATE EXISTING SETTINGS
      =============================================== */

      if (settingsRow?.id) {
        query =
          db
            .from("business_settings")
            .update(
              payload
            )
            .eq(
              "id",
              settingsRow.id
            )
            .select(`
              id,
              business_name,
              phone,
              email,
              website,
              address,
              city,
              state,
              zip,
              default_hourly_rate,
              default_travel_fee,
              default_truck_fee,
              default_tax_rate,
              default_deposit_amount,
              estimate_terms,
              invoice_notes,
              timezone,
              created_at,
              updated_at
            `)
            .single();

      } else {

        /* =============================================
           CREATE SETTINGS ROW IF MISSING

           We intentionally do not provide id,
           created_at or updated_at.
           PostgreSQL handles all of them.
        ============================================= */

        query =
          db
            .from("business_settings")
            .insert(
              payload
            )
            .select(`
              id,
              business_name,
              phone,
              email,
              website,
              address,
              city,
              state,
              zip,
              default_hourly_rate,
              default_travel_fee,
              default_truck_fee,
              default_tax_rate,
              default_deposit_amount,
              estimate_terms,
              invoice_notes,
              timezone,
              created_at,
              updated_at
            `)
            .single();
      }


      const {
        data,
        error
      } =
        await query;

      if (error) {
        throw error;
      }


      settingsRow =
        data;

      populateForm(
        settingsRow
      );


      /* ===============================================
         REFRESH SHARED DEFAULTS CACHE
      =============================================== */

      if (
        window.MetroHaulDefaults
      ) {
        if (
          window.MetroHaulDefaults
            .clearBusinessSettingsCache
        ) {
          window.MetroHaulDefaults
            .clearBusinessSettingsCache();
        }

        if (
          window.MetroHaulDefaults
            .loadBusinessSettings
        ) {
          await window.MetroHaulDefaults
            .loadBusinessSettings(
              true
            );
        }
      }


      if (settingsLastSaved) {
        settingsLastSaved.textContent =
          `Last saved ${formatDateTime(
            settingsRow.updated_at
          )}`;
      }


      showMessage(
        "Settings saved successfully.",
        "success"
      );

    } catch (error) {
      console.error(
        "Save settings error:",
        error
      );

      showMessage(
        error?.message ||
        "Settings could not be saved.",
        "error"
      );

    } finally {
      setSavingState(
        false
      );
    }
  }


  /* ======================================================
     NORMALIZE STATE
  ====================================================== */

  stateInput
    ?.addEventListener(
      "input",
      event => {
        event.target.value =
          event.target.value
            .toUpperCase()
            .replace(
              /[^A-Z]/g,
              ""
            )
            .slice(
              0,
              2
            );
      }
    );


  /* ======================================================
     UNSAVED CHANGES
  ====================================================== */

  settingsForm
    ?.addEventListener(
      "input",
      () => {
        hideMessage();

        if (settingsLastSaved) {
          settingsLastSaved.textContent =
            "Unsaved changes";
        }
      }
    );


  /* ======================================================
     EVENTS
  ====================================================== */

  settingsForm
    ?.addEventListener(
      "submit",
      saveSettings
    );


  saveSettingsTopButton
    ?.addEventListener(
      "click",
      event => {
        event.preventDefault();

        /*
          Submit the real form so native
          HTML validation still runs.
        */

        if (
          settingsForm
            ?.requestSubmit
        ) {
          settingsForm.requestSubmit();

        } else {
          saveSettings(event);
        }
      }
    );


  /* ======================================================
     INITIALIZE
  ====================================================== */

  try {
    const authenticated =
      await waitForAdminAuth();

    if (!authenticated) {
      console.error(
        "Admin authentication was not ready."
      );

      return;
    }

    await loadSettings();

  } catch (error) {
    console.error(
      "Metro Haul Settings initialization error:",
      error
    );

    showMessage(
      error?.message ||
      "Settings could not be loaded.",
      "error"
    );

    if (settingsLastSaved) {
      settingsLastSaved.textContent =
        "Settings failed to load";
    }
  }

});
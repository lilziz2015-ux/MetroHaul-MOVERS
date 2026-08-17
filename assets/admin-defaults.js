"use strict";

/* =========================================================
   METRO HAUL BUSINESS DEFAULTS
   File: assets/admin-defaults.js
   ========================================================= */

(function () {

  let cachedSettings = null;


  /* =======================================================
     SHARED DATABASE CLIENT
  ======================================================= */

  function getDB() {
    const db =
      window.metroHaulDb ||
      window.metroHaulDB ||
      window.db;

    if (!db) {
      throw new Error(
        "Metro Haul Supabase client is unavailable. Load supabase.js before admin-defaults.js."
      );
    }

    return db;
  }


  /* =======================================================
     LOAD BUSINESS SETTINGS
  ======================================================= */

  async function loadBusinessSettings(
    forceReload = false
  ) {
    if (
      cachedSettings &&
      !forceReload
    ) {
      return cachedSettings;
    }

    const db =
      getDB();

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
      console.error(
        "Business settings load error:",
        error
      );

      throw error;
    }

    cachedSettings =
      data || null;

    return cachedSettings;
  }


  /* =======================================================
     GET CACHED SETTINGS
  ======================================================= */

  function getCachedBusinessSettings() {
    return cachedSettings;
  }


  /* =======================================================
     CLEAR CACHE
  ======================================================= */

  function clearBusinessSettingsCache() {
    cachedSettings =
      null;
  }


  /* =======================================================
     REFRESH CACHE
  ======================================================= */

  async function refreshBusinessSettings() {
    clearBusinessSettingsCache();

    return loadBusinessSettings(
      true
    );
  }


  /* =======================================================
     EXPORT
  ======================================================= */

  window.MetroHaulDefaults = {
    loadBusinessSettings,
    getCachedBusinessSettings,
    clearBusinessSettingsCache,
    refreshBusinessSettings
  };

})();
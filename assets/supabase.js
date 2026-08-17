"use strict";

(() => {

  /* ======================================================
     METRO HAUL SUPABASE CONFIG
  ====================================================== */

  const config = {
    url: "https://ydzmmbcxahjjhjqtlcow.supabase.co",
    publishableKey:
      "sb_publishable_xWKwkiGUbxbdnxz9RW9VaQ_0VlH4iBa"
  };


  /* ======================================================
     EXPOSE SAFE BROWSER CONFIG
  ====================================================== */

  window.METRO_HAUL_SUPABASE = {
    url: config.url,
    publishableKey: config.publishableKey
  };


  /* ======================================================
     REQUIRE SUPABASE JS
  ====================================================== */

  if (!window.supabase?.createClient) {

    console.error(
      "Supabase JavaScript library is not loaded."
    );

    return;
  }


  /* ======================================================
     REUSE EXISTING CLIENT
  ====================================================== */

  if (
    window.metroHaulDb ||
    window.metroHaulDB ||
    window.db
  ) {

    const existing =
      window.metroHaulDb ||
      window.metroHaulDB ||
      window.db;

    window.metroHaulDb =
      existing;

    window.metroHaulDB =
      existing;

    window.db =
      existing;

    return;
  }


  /* ======================================================
     CREATE ONE SHARED CLIENT
  ====================================================== */

  const client =
    window.supabase.createClient(
      config.url,
      config.publishableKey,
      {
        auth: {

          /*
            Keep the logged-in admin session
            across protected admin pages.
          */

          persistSession: true,

          /*
            Supabase automatically refreshes
            access tokens when necessary.
          */

          autoRefreshToken: true,

          /*
            Needed when Supabase returns auth
            information through a URL flow.
          */

          detectSessionInUrl: true,

          /*
            Metro Haul uses its own storage key
            instead of Supabase's default project key.
          */

          storageKey:
            "metro-haul-admin-auth"
        }
      }
    );


  /* ======================================================
     EXPOSE SHARED CLIENT
  ====================================================== */

  window.metroHaulDb =
    client;

  window.metroHaulDB =
    client;

  window.db =
    client;


  /* ======================================================
     READY EVENT
  ====================================================== */

  window.dispatchEvent(
    new CustomEvent(
      "metrohaul:supabase-ready",
      {
        detail: {
          client
        }
      }
    )
  );

})();
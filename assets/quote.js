"use strict";

(function () {
  const form = document.getElementById("quoteForm");

  if (!form) return;

  const success =
    document.getElementById("successNotice");

  const errorNotice =
    document.getElementById("errorNotice");

  const btn =
    document.getElementById("quoteSubmitButton") ||
    form.querySelector('button[type="submit"]');


  function clean(value) {
    if (typeof value !== "string") return value;

    const trimmed = value.trim();

    return trimmed === "" ? null : trimmed;
  }


  function booleanValue(value) {
    return value === "true";
  }


  function integerValue(value) {
    const number = parseInt(value, 10);

    return Number.isFinite(number)
      ? number
      : 0;
  }


  function showError(message) {
    if (success) {
      success.style.display = "none";
    }

    if (errorNotice) {
      errorNotice.textContent = message;
      errorNotice.style.display = "block";

      errorNotice.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });

      return;
    }

    alert(message);
  }


  form.addEventListener("submit", async (e) => {
    e.preventDefault();


    /* Browser validation */

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }


    if (success) {
      success.style.display = "none";
    }

    if (errorNotice) {
      errorNotice.style.display = "none";
    }


    btn.disabled = true;
    btn.textContent = "Submitting…";


    const f = new FormData(form);


    /*
      IMPORTANT:
      These names match the Metro Haul
      Supabase leads table.
    */

    const lead = {
      first_name:
        clean(f.get("first_name")),

      last_name:
        clean(f.get("last_name")),

      phone:
        clean(f.get("phone")),

      email:
        clean(f.get("email")),

      pickup_address:
        clean(f.get("pickup_address")),

      pickup_city:
        clean(f.get("pickup_city")),

      pickup_state:
        clean(f.get("pickup_state")),

      destination_address:
        clean(f.get("destination_address")),

      destination_city:
        clean(f.get("destination_city")),

      destination_state:
        clean(f.get("destination_state")),

      move_date:
        clean(f.get("move_date")),

      service_type:
        clean(f.get("service_type")),

      home_size:
        clean(f.get("home_size")),

      packing_needed:
        booleanValue(
          f.get("packing_needed")
        ),

      pickup_stairs:
        integerValue(
          f.get("pickup_stairs")
        ),

      pickup_elevator:
        booleanValue(
          f.get("pickup_elevator")
        ),

      destination_stairs:
        integerValue(
          f.get("destination_stairs")
        ),

      destination_elevator:
        booleanValue(
          f.get("destination_elevator")
        ),

      specialty_items:
        clean(f.get("specialty_items")),

      notes:
        clean(f.get("notes")),
lead_source: "website"
    };


    try {
      const cfg =
        window.METRO_HAUL_SUPABASE || {};


      if (
        !cfg.url ||
        !cfg.publishableKey ||
        cfg.url.includes("YOUR_PROJECT") ||
        cfg.publishableKey.includes("REPLACE_ME")
      ) {
        throw new Error(
          "Supabase configuration is missing."
        );
      }


      const res = await fetch(
        `${cfg.url}/rest/v1/leads`,
        {
          method: "POST",

          headers: {
            apikey:
              cfg.publishableKey,

            Authorization:
              `Bearer ${cfg.publishableKey}`,

            "Content-Type":
              "application/json",

            Prefer:
              "return=minimal"
          },

          body:
            JSON.stringify(lead)
        }
      );


      if (!res.ok) {
        const responseText =
          await res.text();

        console.error(
          "Supabase response:",
          responseText
        );

        throw new Error(
          "We couldn't submit your request."
        );
      }


      /* Success */

      form.reset();

      if (success) {
        success.style.display = "block";

        success.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
      }


    } catch (err) {
      console.error(
        "Metro Haul quote error:",
        err
      );

      showError(
        "We couldn't submit your quote. Please try again or call Metro Haul at 571-719-9575."
      );

    } finally {
      btn.disabled = false;

      btn.textContent =
        "Request My Free Quote";
    }
  });
})();

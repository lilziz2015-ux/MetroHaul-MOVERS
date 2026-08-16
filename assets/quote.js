"use strict";

(function () {
  const form = document.getElementById("quoteForm");

  if (!form) {
    return;
  }

  const successNotice =
    document.getElementById("successNotice");

  const errorNotice =
    document.getElementById("errorNotice");

  const submitButton =
    document.getElementById("quoteSubmitButton") ||
    form.querySelector('button[type="submit"]');


  /* =========================================
     HELPERS
  ========================================= */

  function clean(value) {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();

    return trimmed === ""
      ? null
      : trimmed;
  }


  function toBoolean(value) {
    return value === "true";
  }


  function toInteger(value) {
    const parsed =
      Number.parseInt(value, 10);

    return Number.isFinite(parsed)
      ? parsed
      : 0;
  }


  function hideNotices() {
    if (successNotice) {
      successNotice.style.display = "none";
    }

    if (errorNotice) {
      errorNotice.style.display = "none";
      errorNotice.textContent = "";
    }
  }


  function showSuccess() {
    if (errorNotice) {
      errorNotice.style.display = "none";
    }

    if (!successNotice) {
      return;
    }

    successNotice.style.display = "block";

    successNotice.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }


  function showError(message) {
    if (successNotice) {
      successNotice.style.display = "none";
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


  function setSubmitting(isSubmitting) {
    if (!submitButton) {
      return;
    }

    submitButton.disabled =
      isSubmitting;

    submitButton.textContent =
      isSubmitting
        ? "Submitting..."
        : "Request My Free Quote";
  }


  /* =========================================
     SUBMIT FORM
  ========================================= */

  form.addEventListener(
    "submit",
    async function (event) {
      event.preventDefault();

      hideNotices();


      /* Browser validation */

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }


      const formData =
        new FormData(form);


      /* =====================================
         BUILD DATABASE PAYLOAD

         These names match public.leads.
      ===================================== */

      const lead = {
        first_name:
          clean(
            formData.get("first_name")
          ),

        last_name:
          clean(
            formData.get("last_name")
          ),

        email:
          clean(
            formData.get("email")
          ),

        phone:
          clean(
            formData.get("phone")
          ),

        service_type:
          clean(
            formData.get("service_type")
          ),

        move_date:
          clean(
            formData.get("move_date")
          ),

        pickup_address:
          clean(
            formData.get(
              "pickup_address"
            )
          ),

        pickup_city:
          clean(
            formData.get(
              "pickup_city"
            )
          ),

        pickup_state:
          clean(
            formData.get(
              "pickup_state"
            )
          ),

        pickup_zip:
          clean(
            formData.get(
              "pickup_zip"
            )
          ),

        destination_address:
          clean(
            formData.get(
              "destination_address"
            )
          ),

        destination_city:
          clean(
            formData.get(
              "destination_city"
            )
          ),

        destination_state:
          clean(
            formData.get(
              "destination_state"
            )
          ),

        destination_zip:
          clean(
            formData.get(
              "destination_zip"
            )
          ),

        home_size:
          clean(
            formData.get("home_size")
          ),

        pickup_stairs:
          toInteger(
            formData.get(
              "pickup_stairs"
            )
          ),

        destination_stairs:
          toInteger(
            formData.get(
              "destination_stairs"
            )
          ),

        pickup_elevator:
          toBoolean(
            formData.get(
              "pickup_elevator"
            )
          ),

        destination_elevator:
          toBoolean(
            formData.get(
              "destination_elevator"
            )
          ),

        packing_needed:
          toBoolean(
            formData.get(
              "packing_needed"
            )
          ),

        specialty_items:
          clean(
            formData.get(
              "specialty_items"
            )
          ),

        notes:
          clean(
            formData.get("notes")
          ),

        /*
          Required by the public RLS policy.
          Do not replace this with Google Search,
          Facebook, Referral, etc.
        */
        lead_source: "website",

        /*
          Required by the current RLS rule.
        */
        status: "new",

        assigned_to: null
      };


      /* =====================================
         REQUIRED FIELD CHECK
      ===================================== */

      if (
        !lead.first_name ||
        !lead.last_name ||
        !lead.email ||
        !lead.phone ||
        !lead.service_type
      ) {
        showError(
          "Please complete all required fields before submitting your quote."
        );

        return;
      }


      /* =====================================
         SUPABASE CONFIG
      ===================================== */

      const config =
        window.METRO_HAUL_SUPABASE;


      if (
        !config ||
        !config.url ||
        !config.publishableKey
      ) {
        showError(
          "The quote system is not configured correctly. Please call Metro Haul at 571-719-9575."
        );

        return;
      }


      if (
        config.url.includes(
          "YOUR_PROJECT"
        ) ||
        config.publishableKey.includes(
          "REPLACE_ME"
        )
      ) {
        showError(
          "The quote system is not configured correctly. Please call Metro Haul at 571-719-9575."
        );

        return;
      }


      setSubmitting(true);


      try {

        /* ===================================
           SEND TO SUPABASE

           IMPORTANT:
           sb_publishable keys use apikey.
           Do NOT send the publishable key
           as Authorization: Bearer.
        =================================== */

        const response =
          await fetch(
            `${config.url}/rest/v1/leads`,
            {
              method: "POST",

              headers: {
                "apikey":
                  config.publishableKey,

                "Content-Type":
                  "application/json",

                "Prefer":
                  "return=minimal"
              },

              body:
                JSON.stringify(lead)
            }
          );


        /* ===================================
           HANDLE DATABASE ERROR
        =================================== */

        if (!response.ok) {
          let errorBody = "";

          try {
            errorBody =
              await response.text();
          } catch {
            errorBody =
              "No error response returned.";
          }


          console.error(
            "Metro Haul Supabase error:",
            {
              status:
                response.status,

              statusText:
                response.statusText,

              response:
                errorBody,

              payload:
                lead
            }
          );


          throw new Error(
            `Quote submission failed with status ${response.status}.`
          );
        }


        /* ===================================
           SUCCESS
        =================================== */

        console.log(
          "Metro Haul quote submitted successfully."
        );


        form.reset();

        showSuccess();


      } catch (error) {

        console.error(
          "Metro Haul quote submission error:",
          error
        );


        showError(
          "We couldn't submit your quote. Please try again or call Metro Haul at 571-719-9575."
        );


      } finally {

        setSubmitting(false);

      }
    }
  );

})();

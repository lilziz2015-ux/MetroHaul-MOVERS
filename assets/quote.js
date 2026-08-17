(function () {
  const form = document.getElementById("quoteForm");
  if (!form) return;

  const successNotice = document.getElementById("successNotice");

  const validServiceTypes = new Set([
    "residential",
    "apartment",
    "office",
    "loading_unloading",
    "furniture_delivery",
    "junk_removal",
    "other"
  ]);

  const serviceTypeAliases = {
    loading: "loading_unloading",
    loading_unloading: "loading_unloading",
    furniture: "furniture_delivery",
    furniture_delivery: "furniture_delivery",
    delivery: "furniture_delivery",
    junk: "junk_removal",
    junk_removal: "junk_removal",
    residential: "residential",
    apartment: "apartment",
    office: "office",
    other: "other"
  };

  function toBoolean(value) {
    return value === true ||
      value === "true" ||
      value === "on" ||
      value === "yes" ||
      value === "1";
  }

  function toNonNegativeInteger(value) {
    const number = Number.parseInt(value, 10);

    if (!Number.isFinite(number) || number < 0) {
      return 0;
    }

    return number;
  }

  function cleanText(value) {
    if (value === undefined || value === null) return null;

    const cleaned = String(value).trim();
    return cleaned === "" ? null : cleaned;
  }

  function normalizeServiceType(value) {
    const raw = cleanText(value);

    if (!raw) {
      throw new Error("Please select a service type.");
    }

    const normalized = serviceTypeAliases[raw.toLowerCase()] || raw.toLowerCase();

    if (!validServiceTypes.has(normalized)) {
      throw new Error("Please select a valid moving service.");
    }

    return normalized;
  }

  function getFormValue(formData, ...names) {
    for (const name of names) {
      if (formData.has(name)) {
        return formData.get(name);
      }
    }

    return null;
  }

  function buildLeadPayload(formData) {
    const firstName = cleanText(
      getFormValue(formData, "first_name", "firstName")
    );

    const lastName = cleanText(
      getFormValue(formData, "last_name", "lastName")
    );

    const email = cleanText(
      getFormValue(formData, "email")
    );

    const phone = cleanText(
      getFormValue(formData, "phone")
    );

    const serviceType = normalizeServiceType(
      getFormValue(formData, "service_type", "serviceType")
    );

    if (!firstName) {
      throw new Error("First name is required.");
    }

    if (!lastName) {
      throw new Error("Last name is required.");
    }

    if (!email) {
      throw new Error("Email is required.");
    }

    if (!phone) {
      throw new Error("Phone number is required.");
    }

    return {
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      service_type: serviceType,

      move_date: cleanText(
        getFormValue(formData, "move_date", "moveDate")
      ),

      pickup_address: cleanText(
        getFormValue(formData, "pickup_address", "pickupAddress")
      ),

      pickup_city: cleanText(
        getFormValue(formData, "pickup_city", "pickupCity")
      ),

      pickup_state: cleanText(
        getFormValue(formData, "pickup_state", "pickupState")
      ),

      pickup_zip: cleanText(
        getFormValue(formData, "pickup_zip", "pickupZip")
      ),

      destination_address: cleanText(
        getFormValue(
          formData,
          "destination_address",
          "destinationAddress"
        )
      ),

      destination_city: cleanText(
        getFormValue(
          formData,
          "destination_city",
          "destinationCity"
        )
      ),

      destination_state: cleanText(
        getFormValue(
          formData,
          "destination_state",
          "destinationState"
        )
      ),

      destination_zip: cleanText(
        getFormValue(
          formData,
          "destination_zip",
          "destinationZip"
        )
      ),

      home_size: cleanText(
        getFormValue(formData, "home_size", "homeSize")
      ),

      pickup_stairs: toNonNegativeInteger(
        getFormValue(formData, "pickup_stairs", "pickupStairs")
      ),

      destination_stairs: toNonNegativeInteger(
        getFormValue(
          formData,
          "destination_stairs",
          "destinationStairs"
        )
      ),

      pickup_elevator: toBoolean(
        getFormValue(
          formData,
          "pickup_elevator",
          "pickupElevator"
        )
      ),

      destination_elevator: toBoolean(
        getFormValue(
          formData,
          "destination_elevator",
          "destinationElevator"
        )
      ),

      packing_needed: toBoolean(
        getFormValue(formData, "packing_needed", "packingNeeded")
      ),

      specialty_items: cleanText(
        getFormValue(
          formData,
          "specialty_items",
          "specialtyItems"
        )
      ),

      notes: cleanText(
        getFormValue(formData, "notes")
      ),

      lead_source: "website",
      status: "new",
      assigned_to: null
    };
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const submitButton = form.querySelector('button[type="submit"]');

    if (!submitButton) return;

    const originalButtonText = submitButton.textContent;

    submitButton.disabled = true;
    submitButton.textContent = "Submitting…";

    if (successNotice) {
      successNotice.style.display = "none";
    }

    try {
      const config = window.METRO_HAUL_SUPABASE || {};

      if (!config.url || !config.publishableKey) {
        throw new Error("Supabase is not configured.");
      }

      const formData = new FormData(form);
      const lead = buildLeadPayload(formData);

      const response = await fetch(
        `${config.url}/rest/v1/leads`,
        {
          method: "POST",
          headers: {
            apikey: config.publishableKey,
            "Content-Type": "application/json",
            Prefer: "return=minimal"
          },
          body: JSON.stringify(lead)
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Supabase quote error:", errorText);

        throw new Error("We could not submit your quote request.");
      }

      form.reset();

      if (successNotice) {
        successNotice.style.display = "block";
        successNotice.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
      }
    } catch (error) {
      console.error("Quote form error:", error);

      alert(
        error.message ||
        "Something went wrong while submitting your quote. Please try again."
      );
    } finally {
      submitButton.disabled = false;
      submitButton.textContent =
        originalButtonText || "Request My Free Quote";
    }
  });
})();
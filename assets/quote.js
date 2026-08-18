(function () {
  const form = document.getElementById("quoteForm");
  if (!form) return;

  const successNotice = document.getElementById("successNotice");

  const MAX_PHOTOS = 8;
  const MAX_PHOTO_SIZE = 8 * 1024 * 1024;
  const PHOTO_BUCKET = "quote-photos";
  const allowedPhotoTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif"
  ]);

  let selectedPhotos = [];

  const formGrid = form.querySelector(".form-grid");
  const formNotice = formGrid?.querySelector(".notice.full");
  const photoField = document.createElement("div");

  photoField.className = "field full quote-photo-field";
  photoField.innerHTML = `
    <div class="quote-photo-heading">
      <div>
        <label for="quotePhotos">Photos for a more accurate quote <span>Optional</span></label>
        <p>Show furniture, specialty items, stairs, entrances, or anything our estimator should see.</p>
      </div>
      <strong id="quotePhotoCount">0 / ${MAX_PHOTOS}</strong>
    </div>
    <label class="quote-photo-drop" for="quotePhotos">
      <input id="quotePhotos" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple>
      <span class="quote-photo-icon" aria-hidden="true">＋</span>
      <strong>Add photos</strong>
      <small>JPG, PNG, WebP or HEIC · up to 8 MB each</small>
    </label>
    <div id="quotePhotoMessage" class="quote-photo-message" role="status" hidden></div>
    <div id="quotePhotoPreview" class="quote-photo-preview" aria-live="polite"></div>
  `;

  if (formGrid) {
    formGrid.insertBefore(photoField, formNotice || formGrid.lastElementChild);
  }

  const photoInput = document.getElementById("quotePhotos");
  const photoPreview = document.getElementById("quotePhotoPreview");
  const photoCount = document.getElementById("quotePhotoCount");
  const photoMessage = document.getElementById("quotePhotoMessage");

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

  function createId() {
    if (window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }

    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, character => {
      const random = Math.random() * 16 | 0;
      const value = character === "x" ? random : (random & 3 | 8);
      return value.toString(16);
    });
  }

  function safeFileName(value) {
    return String(value || "photo")
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^[-.]|[-.]$/g, "")
      .slice(0, 100) || "photo";
  }

  function showPhotoMessage(message) {
    if (!photoMessage) return;
    photoMessage.textContent = message;
    photoMessage.hidden = !message;
  }

  function renderPhotoPreviews() {
    if (photoCount) {
      photoCount.textContent = `${selectedPhotos.length} / ${MAX_PHOTOS}`;
    }

    if (!photoPreview) return;

    photoPreview.innerHTML = "";

    selectedPhotos.forEach((file, index) => {
      const item = document.createElement("div");
      item.className = "quote-photo-preview-item";

      const image = document.createElement("img");
      image.src = URL.createObjectURL(file);
      image.alt = `Selected photo ${index + 1}: ${file.name}`;
      image.addEventListener("load", () => URL.revokeObjectURL(image.src), { once: true });

      const remove = document.createElement("button");
      remove.type = "button";
      remove.setAttribute("aria-label", `Remove ${file.name}`);
      remove.textContent = "×";
      remove.addEventListener("click", () => {
        selectedPhotos.splice(index, 1);
        showPhotoMessage("");
        renderPhotoPreviews();
      });

      const name = document.createElement("span");
      name.textContent = file.name;

      item.append(image, remove, name);
      photoPreview.append(item);
    });
  }

  photoInput?.addEventListener("change", () => {
    const incoming = Array.from(photoInput.files || []);
    const errors = [];

    for (const file of incoming) {
      if (selectedPhotos.length >= MAX_PHOTOS) {
        errors.push(`You can add up to ${MAX_PHOTOS} photos.`);
        break;
      }

      if (!allowedPhotoTypes.has(file.type)) {
        errors.push(`${file.name} is not a supported image.`);
        continue;
      }

      if (file.size > MAX_PHOTO_SIZE) {
        errors.push(`${file.name} is larger than 8 MB.`);
        continue;
      }

      const duplicate = selectedPhotos.some(existing =>
        existing.name === file.name &&
        existing.size === file.size &&
        existing.lastModified === file.lastModified
      );

      if (!duplicate) selectedPhotos.push(file);
    }

    photoInput.value = "";
    showPhotoMessage(errors[0] || "");
    renderPhotoPreviews();
  });

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
        getFormValue(formData, "home_size", "homeSize", "property_size")
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
          "specialtyItems",
          "special_items"
        )
      ),

      notes: cleanText(
        getFormValue(formData, "notes", "inventory_notes")
      ),

      lead_source: "website",
      status: "new",
      assigned_to: null
    };
  }

  async function uploadQuotePhotos(config, leadId) {
    if (!selectedPhotos.length) return { uploaded: 0, failed: 0 };

    let uploaded = 0;
    let failed = 0;

    for (const file of selectedPhotos) {
      try {
        const storagePath = `${leadId}/${createId()}-${safeFileName(file.name)}`;
        const uploadResponse = await fetch(
          `${config.url}/storage/v1/object/${PHOTO_BUCKET}/${encodeURIComponent(storagePath).replaceAll("%2F", "/")}`,
          {
            method: "POST",
            headers: {
              apikey: config.publishableKey,
              "Content-Type": file.type,
              "x-upsert": "false"
            },
            body: file
          }
        );

        if (!uploadResponse.ok) {
          console.error("Quote photo upload failed:", await uploadResponse.text());
          failed += 1;
          continue;
        }

        const metadataResponse = await fetch(
          `${config.url}/rest/v1/customer_files`,
          {
            method: "POST",
            headers: {
              apikey: config.publishableKey,
              "Content-Type": "application/json",
              Prefer: "return=minimal"
            },
            body: JSON.stringify({
              lead_id: leadId,
              storage_bucket: PHOTO_BUCKET,
              storage_path: storagePath,
              file_name: file.name,
              mime_type: file.type,
              file_size: file.size,
              category: "quote_photo",
              uploaded_by: null
            })
          }
        );

        if (!metadataResponse.ok) {
          console.error("Quote photo metadata failed:", await metadataResponse.text());
          failed += 1;
          continue;
        }

        uploaded += 1;
      } catch (error) {
        console.error("Quote photo request failed:", error);
        failed += 1;
      }
    }

    return { uploaded, failed };
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
      const leadId = createId();
      lead.id = leadId;

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

      if (selectedPhotos.length) {
        submitButton.textContent = "Uploading Photos…";
        const result = await uploadQuotePhotos(config, leadId);

        if (result.failed) {
          alert(
            `Your quote request was received. ${result.uploaded} photo${result.uploaded === 1 ? "" : "s"} uploaded, but ${result.failed} could not be attached.`
          );
        }
      }

      form.reset();
      selectedPhotos = [];
      renderPhotoPreviews();

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

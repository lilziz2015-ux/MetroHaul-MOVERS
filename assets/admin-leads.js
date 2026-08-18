"use strict";

document.addEventListener("DOMContentLoaded", async () => {

  /* ======================================================
     SUPABASE
  ====================================================== */

  const db =
    window.metroHaulDb ||
    window.metroHaulDB ||
    window.db;

  if (!db) {
    console.error(
      "Metro Haul Supabase client is not available. Make sure supabase.js loads before admin-leads.js."
    );
    return;
  }


  /* ======================================================
     VALID DATABASE VALUES
  ====================================================== */

  const VALID_SERVICE_TYPES = new Set([
    "residential",
    "apartment",
    "office",
    "loading_unloading",
    "furniture_delivery",
    "junk_removal",
    "other"
  ]);


  const VALID_LEAD_STATUSES = new Set([
    "new",
    "contacted",
    "estimate_pending",
    "quoted",
    "booked",
    "won",
    "lost",
    "closed",
    "spam"
  ]);


  /* ======================================================
     ELEMENTS
  ====================================================== */

  const tableBody =
    document.getElementById("leadsTableBody");

  const resultCount =
    document.getElementById("leadResultCount");

  const allCount =
    document.getElementById("allLeadsCount");

  const newCount =
    document.getElementById("newLeadsCount");

  const quotedCount =
    document.getElementById("quotedLeadsCount");

  const bookedCount =
    document.getElementById("bookedLeadsCount");

  const searchInput =
    document.getElementById("leadSearch");

  const statusFilter =
    document.getElementById("leadStatusFilter");


  /* ======================================================
     VIEW LEAD MODAL
  ====================================================== */

  const viewLeadModal =
    document.getElementById("viewLeadModal");

  const viewLeadBackdrop =
    document.getElementById("viewLeadBackdrop");

  const closeViewLeadButton =
    document.getElementById("closeViewLead");

  const viewLeadName =
    document.getElementById("viewLeadName");

  const viewLeadSubtitle =
    document.getElementById("viewLeadSubtitle");

  const viewLeadContent =
    document.getElementById("viewLeadContent");

  const convertCustomerButton =
    document.getElementById("convertCustomerButton");

  const createEstimateButton =
    document.getElementById("createEstimateButton");

  const createJobButton =
    document.getElementById("createJobButton");

  const markQuotedButton =
    document.getElementById("markQuotedButton");


  /* ======================================================
     STATE
  ====================================================== */

  let leads = [];
  let customers = [];

  let currentLead = null;
  let currentAdminUser = null;


  /* ======================================================
     HELPERS
  ====================================================== */

  function text(value) {
    return String(value ?? "");
  }


  function escapeHTML(value) {
    return text(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }


  function cleanText(value) {
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


  function fullName(item) {
    return [
      item?.first_name,
      item?.last_name
    ]
      .filter(Boolean)
      .join(" ") || "Lead";
  }


  function serviceLabel(value) {

    const labels = {
      residential:
        "Residential Moving",

      apartment:
        "Apartment Moving",

      office:
        "Office Moving",

      loading_unloading:
        "Loading / Unloading",

      furniture_delivery:
        "Furniture Delivery",

      junk_removal:
        "Junk Removal",

      other:
        "Other"
    };

    return labels[value] || value || "—";
  }


  function statusLabel(value) {

    return String(value || "")
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(
        /\b\w/g,
        character =>
          character.toUpperCase()
      );
  }


  function formatDate(value) {

    if (!value) {
      return "—";
    }

    const raw =
      String(value).slice(0, 10);

    const date =
      new Date(`${raw}T12:00:00`);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return String(value);
    }

    return date.toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric"
      }
    );
  }


  function formatDateTime(value) {

    if (!value) {
      return "—";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return String(value);
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


  function yesNo(value) {
    return value
      ? "Yes"
      : "No";
  }


  function detailHTML(
    label,
    value,
    full = false
  ) {

    const display =
      value === null ||
      value === undefined ||
      value === ""
        ? "—"
        : value;

    return `
      <div class="admin-job-detail ${full ? "full" : ""}">
        <span>
          ${escapeHTML(label)}
        </span>

        <strong>
          ${escapeHTML(display)}
        </strong>
      </div>
    `;
  }


  async function loadLeadPhotos(leadId) {
    const section =
      document.getElementById("adminLeadPhotos");

    const grid =
      document.getElementById("adminLeadPhotoGrid");

    if (!section || !grid || !leadId) {
      return;
    }

    const { data: files, error } =
      await db
        .from("customer_files")
        .select(`
          id,
          storage_bucket,
          storage_path,
          file_name,
          mime_type,
          file_size,
          created_at
        `)
        .eq("lead_id", leadId)
        .eq("category", "quote_photo")
        .order("created_at", { ascending: true });

    if (error) {
      console.error("Lead photo load error:", error);
      grid.innerHTML = '<p class="admin-lead-photo-empty">Photos could not be loaded.</p>';
      section.hidden = false;
      return;
    }

    if (!files?.length) {
      section.hidden = true;
      return;
    }

    const bucketGroups = new Map();

    files.forEach(file => {
      const bucket = file.storage_bucket || "quote-photos";
      if (!bucketGroups.has(bucket)) bucketGroups.set(bucket, []);
      bucketGroups.get(bucket).push(file);
    });

    const signedFiles = [];

    for (const [bucket, bucketFiles] of bucketGroups) {
      const { data: signed, error: signedError } =
        await db.storage
          .from(bucket)
          .createSignedUrls(
            bucketFiles.map(file => file.storage_path),
            300
          );

      if (signedError) {
        console.error("Lead photo URL error:", signedError);
        continue;
      }

      bucketFiles.forEach((file, index) => {
        const signedUrl = signed?.[index]?.signedUrl;
        if (signedUrl) signedFiles.push({ ...file, signedUrl });
      });
    }

    if (!signedFiles.length) {
      grid.innerHTML = '<p class="admin-lead-photo-empty">Photos could not be opened.</p>';
      section.hidden = false;
      return;
    }

    grid.innerHTML = signedFiles.map((file, index) => `
      <a
        class="admin-lead-photo"
        href="${escapeHTML(file.signedUrl)}"
        target="_blank"
        rel="noopener"
      >
        <img
          src="${escapeHTML(file.signedUrl)}"
          alt="Customer quote photo ${index + 1}: ${escapeHTML(file.file_name)}"
          loading="lazy"
        >
        <span>${escapeHTML(file.file_name)}</span>
      </a>
    `).join("");

    section.hidden = false;
  }


  function findCustomerByLeadId(
    leadId
  ) {

    return customers.find(
      customer =>
        String(
          customer.source_lead_id
        ) === String(leadId)
    ) || null;
  }


  function validateServiceType(
    value
  ) {

    if (
      !VALID_SERVICE_TYPES.has(
        value
      )
    ) {

      throw new Error(
        `Invalid service type: ${value}`
      );
    }
  }


  function validateLeadStatus(
    value
  ) {

    if (
      !VALID_LEAD_STATUSES.has(
        value
      )
    ) {

      throw new Error(
        `Invalid lead status: ${value}`
      );
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

      currentAdminUser =
        window.MetroHaulAdmin.user;

      return true;
    }


    return new Promise(
      resolve => {

        let finished = false;


        const finish = (
          success
        ) => {

          if (finished) {
            return;
          }

          finished = true;

          if (
            success &&
            window.MetroHaulAdmin
              ?.user
          ) {

            currentAdminUser =
              window.MetroHaulAdmin.user;
          }

          resolve(success);
        };


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
     LOAD CUSTOMERS
  ====================================================== */

  async function loadCustomers() {

    const {
      data,
      error
    } =
      await db
        .from("customers")
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          source_lead_id,
          created_at
        `)
        .order(
          "created_at",
          {
            ascending: false
          }
        );


    if (error) {
      throw error;
    }


    customers =
      data || [];
  }


  /* ======================================================
     LOAD LEADS
  ====================================================== */

  async function loadLeads() {

    if (tableBody) {

      tableBody.innerHTML = `
        <tr>
          <td colspan="8">
            Loading leads...
          </td>
        </tr>
      `;
    }


    const {
      data,
      error
    } =
      await db
        .from("leads")
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          service_type,
          move_date,

          pickup_address,
          pickup_city,
          pickup_state,
          pickup_zip,

          destination_address,
          destination_city,
          destination_state,
          destination_zip,

          home_size,

          pickup_stairs,
          destination_stairs,

          pickup_elevator,
          destination_elevator,

          packing_needed,
          specialty_items,
          notes,

          lead_source,
          status,
          assigned_to,

          created_at,
          updated_at
        `)
        .order(
          "created_at",
          {
            ascending: false
          }
        );


    if (error) {
      throw error;
    }


    leads =
      data || [];


    updateStatistics();
    renderLeads();
  }


  /* ======================================================
     STATISTICS
  ====================================================== */

  function updateStatistics() {

    if (allCount) {
      allCount.textContent =
        String(leads.length);
    }


    if (newCount) {

      newCount.textContent =
        String(
          leads.filter(
            lead =>
              lead.status ===
              "new"
          ).length
        );
    }


    if (quotedCount) {

      quotedCount.textContent =
        String(
          leads.filter(
            lead =>
              lead.status ===
              "quoted"
          ).length
        );
    }


    if (bookedCount) {

      bookedCount.textContent =
        String(
          leads.filter(
            lead =>
              lead.status ===
              "booked" ||
              lead.status ===
              "won"
          ).length
        );
    }
  }


  /* ======================================================
     FILTERING
  ====================================================== */

  function getFilteredLeads() {

    const search =
      String(
        searchInput?.value || ""
      )
        .trim()
        .toLowerCase();


    const status =
      statusFilter?.value || "";


    return leads.filter(
      lead => {

        if (
          status &&
          lead.status !== status
        ) {
          return false;
        }


        if (!search) {
          return true;
        }


        const haystack =
          [
            lead.first_name,
            lead.last_name,
            lead.email,
            lead.phone,

            serviceLabel(
              lead.service_type
            ),

            lead.service_type,

            lead.pickup_address,
            lead.pickup_city,
            lead.pickup_state,
            lead.pickup_zip,

            lead.destination_address,
            lead.destination_city,
            lead.destination_state,
            lead.destination_zip,

            lead.home_size,

            lead.status,
            lead.lead_source
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();


        return haystack.includes(
          search
        );
      }
    );
  }


  /* ======================================================
     RENDER TABLE
  ====================================================== */

  function renderLeads() {

    if (!tableBody) {
      return;
    }


    const filtered =
      getFilteredLeads();


    if (resultCount) {

      resultCount.textContent =
        `${filtered.length} ${
          filtered.length === 1
            ? "lead"
            : "leads"
        }`;
    }


    if (!filtered.length) {

      tableBody.innerHTML = `
        <tr>
          <td colspan="8">
            No leads found.
          </td>
        </tr>
      `;

      return;
    }


    tableBody.innerHTML =
      filtered
        .map(
          lead => {

            const customer =
              findCustomerByLeadId(
                lead.id
              );


            const route =
              [
                lead.pickup_city,
                lead.pickup_state
              ]
                .filter(Boolean)
                .join(", ");


            const destination =
              [
                lead.destination_city,
                lead.destination_state
              ]
                .filter(Boolean)
                .join(", ");


            return `
              <tr>

                <td>
                  <strong>
                    ${escapeHTML(
                      fullName(lead)
                    )}
                  </strong>

                  <div class="admin-table-muted">
                    ${escapeHTML(
                      lead.phone || ""
                    )}
                  </div>
                </td>


                <td>
                  ${escapeHTML(
                    serviceLabel(
                      lead.service_type
                    )
                  )}
                </td>


                <td>
                  ${escapeHTML(
                    formatDate(
                      lead.move_date
                    )
                  )}
                </td>


                <td>
                  <div>
                    ${escapeHTML(
                      route || "—"
                    )}
                  </div>

                  <div class="admin-table-muted">
                    ${
                      destination
                        ? `→ ${escapeHTML(
                            destination
                          )}`
                        : ""
                    }
                  </div>
                </td>


                <td>
                  <span
                    class="
                      admin-status
                      status-${escapeHTML(
                        lead.status || "new"
                      )}
                    "
                  >
                    ${escapeHTML(
                      statusLabel(
                        lead.status
                      )
                    )}
                  </span>
                </td>


                <td>
                  ${
                    customer
                      ? `
                        <span
                          class="
                            admin-status
                            status-accepted
                          "
                        >
                          Customer
                        </span>
                      `
                      : `
                        <span
                          class="
                            admin-status
                            status-draft
                          "
                        >
                          Lead
                        </span>
                      `
                  }
                </td>


                <td>
                  ${escapeHTML(
                    formatDate(
                      lead.created_at
                    )
                  )}
                </td>


                <td>
                  <button
                    type="button"
                    class="admin-table-action"
                    data-view-lead="${escapeHTML(
                      lead.id
                    )}"
                  >
                    View
                  </button>
                </td>

              </tr>
            `;
          }
        )
        .join("");
  }


  /* ======================================================
     VIEW LEAD
  ====================================================== */

  function openViewLead(
    lead
  ) {

    currentLead = lead;


    if (viewLeadName) {

      viewLeadName.textContent =
        fullName(lead);
    }


    if (viewLeadSubtitle) {

      viewLeadSubtitle.textContent =
        `${serviceLabel(
          lead.service_type
        )} • ${statusLabel(
          lead.status
        )}`;
    }


    const pickupAddress =
      [
        lead.pickup_address,
        lead.pickup_city,
        lead.pickup_state,
        lead.pickup_zip
      ]
        .filter(Boolean)
        .join(", ");


    const destinationAddress =
      [
        lead.destination_address,
        lead.destination_city,
        lead.destination_state,
        lead.destination_zip
      ]
        .filter(Boolean)
        .join(", ");


    const existingCustomer =
      findCustomerByLeadId(
        lead.id
      );


    if (viewLeadContent) {

      viewLeadContent.innerHTML = `

        <div class="admin-job-detail-grid">

          ${detailHTML(
            "Phone",
            lead.phone
          )}

          ${detailHTML(
            "Email",
            lead.email
          )}

          ${detailHTML(
            "Service",
            serviceLabel(
              lead.service_type
            )
          )}

          ${detailHTML(
            "Move Date",
            formatDate(
              lead.move_date
            )
          )}

          ${detailHTML(
            "Home Size",
            lead.home_size
          )}

          ${detailHTML(
            "Lead Source",
            lead.lead_source
          )}

          ${detailHTML(
            "Status",
            statusLabel(
              lead.status
            )
          )}

          ${detailHTML(
            "Submitted",
            formatDateTime(
              lead.created_at
            )
          )}

        </div>


        <div class="admin-job-route">

          <div>
            <span>
              Pickup
            </span>

            <strong>
              ${escapeHTML(
                pickupAddress ||
                "Not provided"
              )}
            </strong>
          </div>


          <div
            class="admin-job-route-arrow"
          >
            →
          </div>


          <div>
            <span>
              Destination
            </span>

            <strong>
              ${escapeHTML(
                destinationAddress ||
                "Not provided"
              )}
            </strong>
          </div>

        </div>


        <div
          class="admin-job-detail-grid"
          style="margin-top:15px;"
        >

          ${detailHTML(
            "Pickup Stairs",
            lead.pickup_stairs
          )}

          ${detailHTML(
            "Pickup Elevator",
            yesNo(
              lead.pickup_elevator
            )
          )}

          ${detailHTML(
            "Destination Stairs",
            lead.destination_stairs
          )}

          ${detailHTML(
            "Destination Elevator",
            yesNo(
              lead.destination_elevator
            )
          )}

          ${detailHTML(
            "Packing Needed",
            yesNo(
              lead.packing_needed
            )
          )}

          ${detailHTML(
            "Specialty Items",
            lead.specialty_items,
            true
          )}

          ${detailHTML(
            "Customer Notes",
            lead.notes,
            true
          )}

          ${detailHTML(
            "CRM Customer",
            existingCustomer
              ? `Yes — ${fullName(
                  existingCustomer
                )}`
              : "Not converted yet",
            true
          )}

        </div>


        <section
          id="adminLeadPhotos"
          class="admin-lead-photos"
          hidden
        >
          <div class="admin-lead-photo-heading">
            <div>
              <span>QUOTE PHOTOS</span>
              <h3>Items and access</h3>
            </div>
            <small>Private links expire after 5 minutes</small>
          </div>
          <div id="adminLeadPhotoGrid" class="admin-lead-photo-grid">
            <p class="admin-lead-photo-empty">Loading photos…</p>
          </div>
        </section>


        <div
          class="
            admin-form-actions
            admin-lead-contact-actions
          "
          style="
            justify-content:flex-start;
            padding-left:0;
            padding-right:0;
            padding-bottom:0;
          "
        >

          ${
            lead.phone
              ? `
                <a
                  href="tel:${escapeHTML(
                    lead.phone
                  )}"
                  class="admin-secondary-button"
                  style="text-decoration:none;"
                >
                  Call
                </a>

                <a
                  href="sms:${escapeHTML(
                    lead.phone
                  )}"
                  class="admin-secondary-button"
                  style="text-decoration:none;"
                >
                  Text
                </a>
              `
              : ""
          }


          ${
            lead.email
              ? `
                <a
                  href="mailto:${escapeHTML(
                    lead.email
                  )}"
                  class="admin-secondary-button"
                  style="text-decoration:none;"
                >
                  Email
                </a>
              `
              : ""
          }

        </div>
      `;
    }


    updateLeadActionButtons();

    loadLeadPhotos(lead.id).catch(error => {
      console.error("Lead photo rendering error:", error);
    });


    if (viewLeadModal) {
      viewLeadModal.hidden = false;
    }


    document.body.style.overflow =
      "hidden";
  }


  function closeViewLead() {

    if (viewLeadModal) {
      viewLeadModal.hidden = true;
    }


    document.body.style.overflow =
      "";
  }


  /* ======================================================
     ACTION BUTTON STATE
  ====================================================== */

  function updateLeadActionButtons() {

    if (!currentLead) {
      return;
    }


    const existingCustomer =
      findCustomerByLeadId(
        currentLead.id
      );


    if (convertCustomerButton) {

      convertCustomerButton.disabled =
        false;

      convertCustomerButton.textContent =
        existingCustomer
          ? "View Customer"
          : "Convert to Customer";
    }


    if (createEstimateButton) {

      createEstimateButton.disabled =
        [
          "lost",
          "closed",
          "spam"
        ].includes(
          currentLead.status
        );
    }


    if (createJobButton) {

      createJobButton.disabled =
        [
          "lost",
          "closed",
          "spam"
        ].includes(
          currentLead.status
        );
    }


    if (markQuotedButton) {

      markQuotedButton.disabled =
        [
          "quoted",
          "booked",
          "won",
          "lost",
          "closed",
          "spam"
        ].includes(
          currentLead.status
        );
    }
  }


  /* ======================================================
     CUSTOMER PAYLOAD
  ====================================================== */

  function buildCustomerPayload(
    lead
  ) {

    return {

      first_name:
        cleanText(
          lead.first_name
        ),

      last_name:
        cleanText(
          lead.last_name
        ),

      email:
        cleanText(
          lead.email
        ),

      phone:
        cleanText(
          lead.phone
        ),

      alternate_phone:
        null,

      company_name:
        null,

      billing_address:
        cleanText(
          lead.pickup_address
        ),

      billing_city:
        cleanText(
          lead.pickup_city
        ),

      billing_state:
        cleanText(
          lead.pickup_state
        ),

      billing_zip:
        cleanText(
          lead.pickup_zip
        ),

      notes:
        cleanText(
          lead.notes
        ),

      source_lead_id:
        lead.id,

      created_by:
        currentAdminUser?.id ||
        null
    };
  }


  /* ======================================================
     CONVERT LEAD TO CUSTOMER
  ====================================================== */

  async function convertLeadToCustomer() {

    if (!currentLead) {
      return;
    }


    const existingCustomer =
      findCustomerByLeadId(
        currentLead.id
      );


    if (existingCustomer) {

      window.location.href =
        `customers.html?id=${encodeURIComponent(
          existingCustomer.id
        )}`;

      return;
    }


    const confirmed =
      window.confirm(
        `Convert ${fullName(
          currentLead
        )} into a customer?`
      );


    if (!confirmed) {
      return;
    }


    if (convertCustomerButton) {

      convertCustomerButton.disabled =
        true;

      convertCustomerButton.textContent =
        "Creating Customer...";
    }


    try {

      const customerPayload =
        buildCustomerPayload(
          currentLead
        );


      const {
        data: customer,
        error
      } =
        await db
          .from("customers")
          .insert(
            customerPayload
          )
          .select(`
            id,
            first_name,
            last_name,
            email,
            phone,
            source_lead_id,
            created_at
          `)
          .single();


      if (error) {

        if (
          error.code ===
          "23505"
        ) {

          await loadCustomers();


          const duplicate =
            findCustomerByLeadId(
              currentLead.id
            );


          if (duplicate) {

            window.location.href =
              `customers.html?id=${encodeURIComponent(
                duplicate.id
              )}`;

            return;
          }
        }


        throw error;
      }


      await loadCustomers();
      await loadLeads();


      window.location.href =
        `customers.html?id=${encodeURIComponent(
          customer.id
        )}`;


    } catch (error) {

      console.error(
        "Convert lead to customer error:",
        error
      );


      alert(
        error?.message ||
        "This lead could not be converted to a customer."
      );


      if (
        convertCustomerButton
      ) {

        convertCustomerButton.disabled =
          false;

        convertCustomerButton.textContent =
          "Convert to Customer";
      }
    }
  }


  /* ======================================================
     GET OR CREATE CUSTOMER
  ====================================================== */

  async function getOrCreateCustomerForLead(
    lead
  ) {

    let customer =
      findCustomerByLeadId(
        lead.id
      );


    if (customer) {
      return customer;
    }


    const payload =
      buildCustomerPayload(
        lead
      );


    const {
      data,
      error
    } =
      await db
        .from("customers")
        .insert(payload)
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          source_lead_id,
          created_at
        `)
        .single();


    if (error) {

      if (
        error.code ===
        "23505"
      ) {

        await loadCustomers();


        customer =
          findCustomerByLeadId(
            lead.id
          );


        if (customer) {
          return customer;
        }
      }


      throw error;
    }


    customers.unshift(
      data
    );


    return data;
  }


  /* ======================================================
     CREATE ESTIMATE FROM LEAD
  ====================================================== */

  async function createEstimateFromLead() {

    if (!currentLead) {
      return;
    }


    try {

      validateServiceType(
        currentLead.service_type
      );


      const customer =
        await getOrCreateCustomerForLead(
          currentLead
        );


      /*
        We are preparing an estimate,
        so "estimate_pending" accurately
        represents the CRM stage until
        the estimate is actually sent.
      */

      if (
        [
          "new",
          "contacted"
        ].includes(
          currentLead.status
        )
      ) {

        const {
          error: statusError
        } =
          await db
            .from("leads")
            .update({
              status:
                "estimate_pending"
            })
            .eq(
              "id",
              currentLead.id
            );


        if (statusError) {

          console.warn(
            "Estimate prepared but lead status could not be updated:",
            statusError
          );
        }
      }


      window.location.href =
        `estimates.html?new=1&customer_id=${encodeURIComponent(
          customer.id
        )}&lead_id=${encodeURIComponent(
          currentLead.id
        )}`;


    } catch (error) {

      console.error(
        "Create estimate from lead error:",
        error
      );


      alert(
        error?.message ||
        "Could not prepare an estimate for this lead."
      );
    }
  }


  /* ======================================================
     CREATE JOB FROM LEAD
  ====================================================== */

  async function createJobFromLead() {

    if (!currentLead) {
      return;
    }


    try {

      validateServiceType(
        currentLead.service_type
      );


      const customer =
        await getOrCreateCustomerForLead(
          currentLead
        );


      /*
        Do not mark the lead booked here.
        Opening the New Job screen is not
        the same as saving a real job.

        admin-jobs.js should mark it booked
        after a valid job is actually saved.
      */


      const params =
        new URLSearchParams({
          new: "1",
          customer_id:
            customer.id,
          lead_id:
            currentLead.id
        });


      if (
        currentLead.move_date
      ) {

        params.set(
          "move_date",
          currentLead.move_date
        );
      }


      window.location.href =
        `jobs.html?${params.toString()}`;


    } catch (error) {

      console.error(
        "Create job from lead error:",
        error
      );


      alert(
        error?.message ||
        "Could not prepare a job for this lead."
      );
    }
  }


  /* ======================================================
     MARK QUOTED
  ====================================================== */

  async function markLeadQuoted() {

    if (!currentLead) {
      return;
    }


    try {

      validateLeadStatus(
        "quoted"
      );


      const leadId =
        currentLead.id;


      const {
        error
      } =
        await db
          .from("leads")
          .update({
            status:
              "quoted"
          })
          .eq(
            "id",
            leadId
          );


      if (error) {
        throw error;
      }


      await loadLeads();


      const refreshed =
        leads.find(
          lead =>
            String(lead.id) ===
            String(leadId)
        );


      if (refreshed) {

        openViewLead(
          refreshed
        );
      }


    } catch (error) {

      console.error(
        "Mark lead quoted error:",
        error
      );


      alert(
        error?.message ||
        "Lead status could not be updated."
      );
    }
  }


  /* ======================================================
     TABLE EVENTS
  ====================================================== */

  tableBody
    ?.addEventListener(
      "click",
      event => {

        const button =
          event.target.closest(
            "[data-view-lead]"
          );


        if (!button) {
          return;
        }


        const lead =
          leads.find(
            item =>
              String(item.id) ===
              String(
                button.dataset
                  .viewLead
              )
          );


        if (lead) {

          openViewLead(
            lead
          );
        }
      }
    );


  /* ======================================================
     FILTER EVENTS
  ====================================================== */

  searchInput
    ?.addEventListener(
      "input",
      renderLeads
    );


  statusFilter
    ?.addEventListener(
      "change",
      renderLeads
    );


  /* ======================================================
     MODAL EVENTS
  ====================================================== */

  closeViewLeadButton
    ?.addEventListener(
      "click",
      closeViewLead
    );


  viewLeadBackdrop
    ?.addEventListener(
      "click",
      closeViewLead
    );


  convertCustomerButton
    ?.addEventListener(
      "click",
      convertLeadToCustomer
    );


  createEstimateButton
    ?.addEventListener(
      "click",
      createEstimateFromLead
    );


  createJobButton
    ?.addEventListener(
      "click",
      createJobFromLead
    );


  markQuotedButton
    ?.addEventListener(
      "click",
      markLeadQuoted
    );


  document.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Escape" &&
        viewLeadModal &&
        !viewLeadModal.hidden
      ) {

        closeViewLead();
      }
    }
  );


  /* ======================================================
     URL ACTIONS
  ====================================================== */

  function processURLActions() {

    const params =
      new URLSearchParams(
        window.location.search
      );


    const leadId =
      params.get("id");


    if (!leadId) {
      return;
    }


    const lead =
      leads.find(
        item =>
          String(item.id) ===
          String(leadId)
      );


    if (lead) {

      openViewLead(
        lead
      );
    }
  }


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


    await Promise.all([
      loadCustomers(),
      loadLeads()
    ]);


    processURLActions();


  } catch (error) {

    console.error(
      "Metro Haul Leads initialization error:",
      error
    );


    if (tableBody) {

      tableBody.innerHTML = `
        <tr>
          <td colspan="8">
            Leads could not be loaded.
            Check the browser console.
          </td>
        </tr>
      `;
    }
  }

});

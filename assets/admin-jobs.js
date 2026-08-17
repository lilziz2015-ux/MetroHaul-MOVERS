"use strict";

document.addEventListener("DOMContentLoaded", async () => {

  /* ======================================================
     SUPABASE
  ====================================================== */

  const cfg = window.METRO_HAUL_SUPABASE;

  if (!cfg?.url || !cfg?.publishableKey) {
    console.error("Metro Haul Supabase configuration missing.");
    return;
  }

  if (!window.supabase?.createClient) {
    console.error("Supabase library not loaded.");
    return;
  }

  const db =
    window.db ||
    window.metroHaulDb ||
    window.metroHaulDB ||
    window.supabase.createClient(
      cfg.url,
      cfg.publishableKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );

  window.metroHaulDb = db;


  /* ======================================================
     ELEMENTS
  ====================================================== */

  const tableBody =
    document.getElementById("jobsTableBody");

  const resultCount =
    document.getElementById("jobResultCount");

  const allCount =
    document.getElementById("allJobsCount");

  const scheduledCount =
    document.getElementById("scheduledJobsCount");

  const activeCount =
    document.getElementById("activeJobsCount");

  const completedCount =
    document.getElementById("completedJobsCount");

  const searchInput =
    document.getElementById("jobSearch");

  const statusFilter =
    document.getElementById("jobStatusFilter");

  const paymentFilter =
    document.getElementById("paymentStatusFilter");

  const newJobButton =
    document.getElementById("newJobButton");

  const jobModal =
    document.getElementById("jobModal");

  const jobModalBackdrop =
    document.getElementById("jobModalBackdrop");

  const closeJobModalButton =
    document.getElementById("closeJobModal");

  const cancelJobButton =
    document.getElementById("cancelJobButton");

  const jobForm =
    document.getElementById("jobForm");

  const jobFormError =
    document.getElementById("jobFormError");

  const saveJobButton =
    document.getElementById("saveJobButton");

  const jobIdInput =
    document.getElementById("jobId");

  const jobModalTitle =
    document.getElementById("jobModalTitle");

  const jobNumberDisplay =
    document.getElementById("jobNumberDisplay");

  const customerSelect =
    document.getElementById("customer_id");

  const leadSelect =
    document.getElementById("lead_id");

  const viewJobModal =
    document.getElementById("viewJobModal");

  const viewJobBackdrop =
    document.getElementById("viewJobBackdrop");

  const closeViewJobButton =
    document.getElementById("closeViewJob");

  const viewJobNumber =
    document.getElementById("viewJobNumber");

  const viewJobCustomer =
    document.getElementById("viewJobCustomer");

  const viewJobContent =
    document.getElementById("viewJobContent");

  const editJobButton =
    document.getElementById("editJobButton");

  const confirmJobButton =
    document.getElementById("confirmJobButton");

  const startJobButton =
    document.getElementById("startJobButton");

  const completeJobButton =
    document.getElementById("completeJobButton");

  const assignCrewButton =
    document.getElementById("assignCrewButton");

  const jobCrewList =
    document.getElementById("jobCrewList");

  const assignCrewModal =
    document.getElementById("assignCrewModal");

  const assignCrewBackdrop =
    document.getElementById("assignCrewBackdrop");

  const closeAssignCrewButton =
    document.getElementById("closeAssignCrew");

  const cancelAssignCrewButton =
    document.getElementById("cancelAssignCrew");

  const assignCrewForm =
    document.getElementById("assignCrewForm");

  const assignCrewError =
    document.getElementById("assignCrewError");

  const assignCrewJobLabel =
    document.getElementById("assignCrewJobLabel");

  const assignmentCrewMember =
    document.getElementById("assignmentCrewMember");

  const assignmentRole =
    document.getElementById("assignmentRole");

  const assignmentStart =
    document.getElementById("assignmentStart");

  const assignmentEnd =
    document.getElementById("assignmentEnd");

  const assignmentNotes =
    document.getElementById("assignmentNotes");

  const saveCrewAssignmentButton =
    document.getElementById("saveCrewAssignment");


  /* ======================================================
     DATA
  ====================================================== */

  let jobs = [];
  let customers = [];
  let leads = [];
  let crewMembers = [];
  let crewAssignments = [];

  let currentJob = null;
  let businessSettings = null;


  /* ======================================================
     HELPERS
  ====================================================== */

  function text(value) {
    return String(value ?? "");
  }


  function clean(value) {

    if (
      value === null ||
      value === undefined
    ) {
      return null;
    }

    const result =
      String(value).trim();

    return result === ""
      ? null
      : result;
  }


  function numberValue(value) {

    const number =
      Number(value);

    return Number.isFinite(number)
      ? number
      : 0;
  }


  function integerValue(value) {

    const number =
      parseInt(value, 10);

    return Number.isFinite(number)
      ? number
      : 0;
  }


  function nullableInteger(value) {

    if (
      value === null ||
      value === undefined ||
      String(value).trim() === ""
    ) {
      return null;
    }

    const number =
      parseInt(value, 10);

    return Number.isFinite(number)
      ? number
      : null;
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


  function booleanValue(value) {
    return String(value) === "true";
  }


  function escapeHTML(value) {

    return text(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }


  function money(value) {

    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency: "USD"
      }
    ).format(
      Number(value || 0)
    );
  }


  function fullName(customer) {

    return [
      customer?.first_name,
      customer?.last_name
    ]
      .filter(Boolean)
      .join(" ") ||
      customer?.company_name ||
      "Customer";
  }


  function crewName(member) {

    return [
      member?.first_name,
      member?.last_name
    ]
      .filter(Boolean)
      .join(" ") ||
      "Crew Member";
  }


  function crewInitials(member) {

    return [
      member?.first_name,
      member?.last_name
    ]
      .filter(Boolean)
      .slice(0, 2)
      .map(
        value =>
          String(value)
            .charAt(0)
            .toUpperCase()
      )
      .join("") ||
      "MH";
  }


  function serviceLabel(value) {

    const labels = {
      residential: "Residential Moving",
      apartment: "Apartment Moving",
      office: "Office Moving",
      loading: "Loading / Unloading",
      delivery: "Furniture Delivery",
      junk: "Junk Removal"
    };

    return labels[value] ||
      value ||
      "—";
  }


  function roleLabel(value) {

    const labels = {
      mover: "Mover",
      driver: "Driver",
      crew_lead: "Crew Lead",
      dispatcher: "Dispatcher",
      manager: "Manager"
    };

    return labels[value] ||
      value ||
      "Crew";
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

    const date =
      new Date(
        `${String(value).slice(0, 10)}T12:00:00`
      );

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


  function formatTime(value) {

    if (!value) {
      return "Flexible";
    }

    const raw =
      String(value)
        .slice(0, 5);

    const [
      hourText,
      minuteText
    ] =
      raw.split(":");

    const date =
      new Date();

    date.setHours(
      Number(hourText),
      Number(minuteText || 0),
      0,
      0
    );

    return date.toLocaleTimeString(
      "en-US",
      {
        hour: "numeric",
        minute: "2-digit"
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


  function dateInputValue(value) {

    return value
      ? String(value).slice(0, 10)
      : "";
  }


  function timeInputValue(value) {

    return value
      ? String(value).slice(0, 5)
      : "";
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
      <div
        class="
          admin-job-detail
          ${full ? "full" : ""}
        "
      >

        <span>
          ${escapeHTML(label)}
        </span>

        <strong>
          ${escapeHTML(display)}
        </strong>

      </div>
    `;
  }


  function setElementValue(
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


  function showJobError(message) {

    if (!jobFormError) {
      return;
    }

    jobFormError.textContent =
      message;

    jobFormError.hidden =
      false;
  }


  function clearJobError() {

    if (!jobFormError) {
      return;
    }

    jobFormError.textContent =
      "";

    jobFormError.hidden =
      true;
  }


  function showCrewError(message) {

    if (!assignCrewError) {
      return;
    }

    assignCrewError.textContent =
      message;

    assignCrewError.hidden =
      false;
  }


  function clearCrewError() {

    if (!assignCrewError) {
      return;
    }

    assignCrewError.textContent =
      "";

    assignCrewError.hidden =
      true;
  }


  /* ======================================================
     BUSINESS SETTINGS
  ====================================================== */

  async function loadBusinessSettings() {

    try {

      if (
        !window.MetroHaulDefaults
          ?.loadBusinessSettings
      ) {

        console.warn(
          "MetroHaulDefaults helper not loaded."
        );

        return;
      }

      businessSettings =
        await window
          .MetroHaulDefaults
          .loadBusinessSettings();

    } catch (error) {

      console.warn(
        "Business settings could not be loaded:",
        error
      );

      businessSettings =
        null;
    }
  }


  function applyJobDefaults() {

    if (!businessSettings) {
      return;
    }

    function setDefault(
      id,
      value
    ) {

      const element =
        document.getElementById(id);

      if (
        !element ||
        value === null ||
        value === undefined
      ) {
        return;
      }

      if (
        element.value === "" ||
        Number(element.value) === 0
      ) {

        element.value =
          String(value);
      }
    }

    setDefault(
      "hourly_rate",
      businessSettings.default_hourly_rate
    );

    setDefault(
      "travel_fee",
      businessSettings.default_travel_fee
    );

    setDefault(
      "truck_fee",
      businessSettings.default_truck_fee
    );

    setDefault(
      "deposit_amount",
      businessSettings.default_deposit_amount
    );

    calculatePricing();
  }


  /* ======================================================
     AUTH
  ====================================================== */

  async function verifyLogin() {

    const {
      data,
      error
    } =
      await db.auth.getUser();

    if (
      error ||
      !data?.user
    ) {

      window.location.href =
        "login.html";

      return false;
    }

    const {
      data: profile,
      error: profileError
    } =
      await db
        .from("admin_users")
        .select(`
          id,
          full_name,
          role,
          is_active
        `)
        .eq(
          "id",
          data.user.id
        )
        .maybeSingle();

    if (
      profileError ||
      !profile ||
      !profile.is_active
    ) {

      await db.auth.signOut();

      window.location.href =
        "login.html";

      return false;
    }

    const adminName =
      document.getElementById(
        "adminName"
      );

    if (adminName) {

      adminName.textContent =
        profile.full_name ||
        data.user.email ||
        "Metro Haul Admin";
    }

    return true;
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
          company_name,
          phone,
          email,
          billing_address,
          billing_city,
          billing_state,
          billing_zip,
          source_lead_id
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

    if (!customerSelect) {
      return;
    }

    customerSelect.innerHTML = `
      <option value="">
        Select customer
      </option>
    `;

    customers.forEach(
      customer => {

        const option =
          document.createElement(
            "option"
          );

        option.value =
          customer.id;

        option.textContent =
          `${fullName(customer)}${
            customer.phone
              ? ` • ${customer.phone}`
              : ""
          }`;

        customerSelect.appendChild(
          option
        );
      }
    );
  }


  /* ======================================================
     LOAD LEADS
  ====================================================== */

  async function loadLeads() {

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

          pickup_stairs,
          pickup_elevator,

          destination_address,
          destination_city,
          destination_state,
          destination_zip,

          destination_stairs,
          destination_elevator,

          home_size,
          packing_needed,
          specialty_items,
          notes,
          status
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

    if (!leadSelect) {
      return;
    }

    leadSelect.innerHTML = `
      <option value="">
        No linked lead
      </option>
    `;

    leads.forEach(
      lead => {

        const option =
          document.createElement(
            "option"
          );

        option.value =
          lead.id;

        option.textContent =
          [
            lead.first_name,
            lead.last_name
          ]
            .filter(Boolean)
            .join(" ") ||
          lead.email ||
          lead.phone ||
          "Lead";

        leadSelect.appendChild(
          option
        );
      }
    );
  }


  /* ======================================================
     LOAD CREW
  ====================================================== */

  async function loadCrewMembers() {

    const {
      data,
      error
    } =
      await db
        .from("crew_members")
        .select(`
          id,
          first_name,
          last_name,
          phone,
          email,
          role,
          active,
          hourly_cost
        `)
        .eq(
          "active",
          true
        )
        .order(
          "first_name",
          {
            ascending: true
          }
        );

    if (error) {
      throw error;
    }

    crewMembers =
      data || [];

    populateCrewSelect();
  }


  function populateCrewSelect() {

    if (!assignmentCrewMember) {
      return;
    }

    const assignedIds =
      new Set(
        crewAssignments.map(
          assignment =>
            assignment.crew_member_id
        )
      );

    assignmentCrewMember.innerHTML = `
      <option value="">
        Select crew member
      </option>
    `;

    crewMembers
      .filter(
        member =>
          !assignedIds.has(
            member.id
          )
      )
      .forEach(
        member => {

          const option =
            document.createElement(
              "option"
            );

          option.value =
            member.id;

          option.textContent =
            `${crewName(member)} • ${roleLabel(
              member.role
            )}`;

          assignmentCrewMember
            .appendChild(
              option
            );
        }
      );
  }


  /* ======================================================
     CUSTOMER AUTOFILL
  ====================================================== */

  function fillFromCustomer() {

    const customer =
      customers.find(
        item =>
          item.id ===
          customerSelect?.value
      );

    if (!customer) {
      return;
    }

    if (
      leadSelect &&
      customer.source_lead_id &&
      !leadSelect.value
    ) {

      leadSelect.value =
        customer.source_lead_id;
    }

    const pickupAddress =
      document.getElementById(
        "pickup_address"
      );

    const pickupCity =
      document.getElementById(
        "pickup_city"
      );

    const pickupState =
      document.getElementById(
        "pickup_state"
      );

    const pickupZip =
      document.getElementById(
        "pickup_zip"
      );

    if (
      pickupAddress &&
      !pickupAddress.value
    ) {

      pickupAddress.value =
        customer.billing_address ||
        "";
    }

    if (
      pickupCity &&
      !pickupCity.value
    ) {

      pickupCity.value =
        customer.billing_city ||
        "";
    }

    if (
      pickupState &&
      !pickupState.value
    ) {

      pickupState.value =
        customer.billing_state ||
        "";
    }

    if (
      pickupZip &&
      !pickupZip.value
    ) {

      pickupZip.value =
        customer.billing_zip ||
        "";
    }

    const lead =
      leads.find(
        item =>
          item.id ===
          customer.source_lead_id
      );

    if (lead) {

      fillFromLead(
        lead,
        false
      );
    }
  }


  /* ======================================================
     LEAD AUTOFILL
  ====================================================== */

  function fillFromSelectedLead() {

    const lead =
      leads.find(
        item =>
          item.id ===
          leadSelect?.value
      );

    if (!lead) {
      return;
    }

    fillFromLead(
      lead,
      true
    );
  }


  function fillFromLead(
    lead,
    overwrite
  ) {

    function setIf(
      id,
      value
    ) {

      const element =
        document.getElementById(id);

      if (
        !element ||
        value === null ||
        value === undefined
      ) {
        return;
      }

      if (
        overwrite ||
        !element.value
      ) {

        element.value =
          String(value);
      }
    }

    setIf(
      "service_type",
      lead.service_type
    );

    setIf(
      "move_date",
      lead.move_date
    );

    setIf(
      "pickup_address",
      lead.pickup_address
    );

    setIf(
      "pickup_city",
      lead.pickup_city
    );

    setIf(
      "pickup_state",
      lead.pickup_state
    );

    setIf(
      "pickup_zip",
      lead.pickup_zip
    );

    setIf(
      "pickup_stairs",
      lead.pickup_stairs
    );

    setIf(
      "pickup_elevator",
      lead.pickup_elevator
        ? "true"
        : "false"
    );

    setIf(
      "destination_address",
      lead.destination_address
    );

    setIf(
      "destination_city",
      lead.destination_city
    );

    setIf(
      "destination_state",
      lead.destination_state
    );

    setIf(
      "destination_zip",
      lead.destination_zip
    );

    setIf(
      "destination_stairs",
      lead.destination_stairs
    );

    setIf(
      "destination_elevator",
      lead.destination_elevator
        ? "true"
        : "false"
    );

    setIf(
      "home_size",
      lead.home_size
    );

    setIf(
      "packing_needed",
      lead.packing_needed
        ? "true"
        : "false"
    );

    setIf(
      "specialty_items",
      lead.specialty_items
    );

    setIf(
      "inventory_notes",
      lead.notes
    );
  }


  /* ======================================================
     LOAD JOBS
  ====================================================== */

  async function loadJobs() {

    if (!tableBody) {
      return;
    }

    tableBody.innerHTML = `
      <tr>
        <td colspan="9">
          Loading jobs...
        </td>
      </tr>
    `;

    const {
      data,
      error
    } =
      await db
        .from("jobs")
        .select(`
          *,
          customer:customers (
            id,
            first_name,
            last_name,
            company_name,
            phone,
            email
          )
        `)
        .order(
          "move_date",
          {
            ascending: true
          }
        );

    if (error) {
      throw error;
    }

    jobs =
      data || [];

    updateStatistics();
    renderJobs();
  }


  /* ======================================================
     STATS
  ====================================================== */

  function updateStatistics() {

    if (allCount) {

      allCount.textContent =
        jobs.length;
    }

    if (scheduledCount) {

      scheduledCount.textContent =
        jobs.filter(
          job =>
            [
              "SCHEDULED",
              "CONFIRMED"
            ].includes(
              job.job_status
            )
        ).length;
    }

    if (activeCount) {

      activeCount.textContent =
        jobs.filter(
          job =>
            job.job_status ===
            "IN_PROGRESS"
        ).length;
    }

    if (completedCount) {

      completedCount.textContent =
        jobs.filter(
          job =>
            job.job_status ===
            "COMPLETED"
        ).length;
    }
  }


  /* ======================================================
     FILTERING
  ====================================================== */

  function getFilteredJobs() {

    const search =
      String(
        searchInput?.value ||
        ""
      )
        .trim()
        .toLowerCase();

    const status =
      statusFilter?.value ||
      "";

    const payment =
      paymentFilter?.value ||
      "";

    return jobs.filter(
      job => {

        if (
          status &&
          job.job_status !== status
        ) {
          return false;
        }

        if (
          payment &&
          job.payment_status !== payment
        ) {
          return false;
        }

        if (!search) {
          return true;
        }

        const haystack =
          [
            job.job_number,
            fullName(
              job.customer
            ),
            job.customer?.phone,
            job.customer?.email,
            job.pickup_address,
            job.pickup_city,
            job.pickup_state,
            job.destination_address,
            job.destination_city,
            job.destination_state,
            job.service_type
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
     RENDER JOBS
  ====================================================== */

  function renderJobs() {

    if (!tableBody) {
      return;
    }

    const filtered =
      getFilteredJobs();

    if (resultCount) {

      resultCount.textContent =
        `${filtered.length} ${
          filtered.length === 1
            ? "job"
            : "jobs"
        }`;
    }

    if (!filtered.length) {

      tableBody.innerHTML = `
        <tr>
          <td colspan="9">
            No jobs found.
          </td>
        </tr>
      `;

      return;
    }

    tableBody.innerHTML =
      filtered
        .map(
          job => {

            const pickup =
              [
                job.pickup_city,
                job.pickup_state
              ]
                .filter(Boolean)
                .join(", ") ||
              job.pickup_address ||
              "—";

            const destination =
              [
                job.destination_city,
                job.destination_state
              ]
                .filter(Boolean)
                .join(", ") ||
              job.destination_address ||
              "—";

            return `

              <tr>

                <td>

                  <strong>
                    ${escapeHTML(
                      job.job_number
                    )}
                  </strong>

                </td>


                <td>

                  <strong>
                    ${escapeHTML(
                      fullName(
                        job.customer
                      )
                    )}
                  </strong>

                  <div class="admin-table-muted">

                    ${escapeHTML(
                      job.customer?.phone ||
                      ""
                    )}

                  </div>

                </td>


                <td>

                  ${escapeHTML(
                    formatDate(
                      job.move_date
                    )
                  )}

                </td>


                <td>

                  ${escapeHTML(
                    serviceLabel(
                      job.service_type
                    )
                  )}

                </td>


                <td>

                  <div>

                    ${escapeHTML(
                      pickup
                    )}

                  </div>

                  <div class="admin-table-muted">

                    →
                    ${escapeHTML(
                      destination
                    )}

                  </div>

                </td>


                <td>

                  <span
                    class="
                      admin-status
                      status-${escapeHTML(
                        String(
                          job.job_status ||
                          ""
                        ).toLowerCase()
                      )}
                    "
                  >

                    ${escapeHTML(
                      statusLabel(
                        job.job_status
                      )
                    )}

                  </span>

                </td>


                <td>

                  <strong>

                    ${money(
                      job.total_amount
                    )}

                  </strong>

                </td>


                <td>

                  ${money(
                    job.balance_due
                  )}

                  <div class="admin-table-muted">

                    ${escapeHTML(
                      statusLabel(
                        job.payment_status
                      )
                    )}

                  </div>

                </td>


                <td>

                  <button
                    type="button"
                    class="admin-table-action"
                    data-view-job="${escapeHTML(
                      job.id
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
     PRICING
  ====================================================== */

  function fieldNumber(id) {

    return numberValue(
      document
        .getElementById(id)
        ?.value
    );
  }


  function calculatePricing() {

    const pricingType =
      document
        .getElementById(
          "pricing_type"
        )
        ?.value ||
      "HOURLY";

    const hourlyRate =
      fieldNumber(
        "hourly_rate"
      );

    const laborHours =
      fieldNumber(
        "labor_hours"
      );

    let labor = 0;

    if (
      pricingType ===
      "FLAT_RATE"
    ) {

      labor =
        hourlyRate;

    } else {

      labor =
        hourlyRate *
        laborHours;
    }


    const travelFee =
      fieldNumber(
        "travel_fee"
      );

    const truckFee =
      fieldNumber(
        "truck_fee"
      );

    const packingFee =
      fieldNumber(
        "packing_fee"
      );

    const specialtyFee =
      fieldNumber(
        "specialty_fee"
      );

    const disposalFee =
      fieldNumber(
        "disposal_fee"
      );

    const otherFee =
      fieldNumber(
        "other_fee"
      );

    const discount =
      fieldNumber(
        "discount"
      );

    const taxAmount =
      fieldNumber(
        "tax_amount"
      );

    const amountPaid =
      fieldNumber(
        "amount_paid"
      );


    const fees =
      travelFee +
      truckFee +
      packingFee +
      specialtyFee +
      disposalFee +
      otherFee;


    const subtotal =
      Math.max(
        0,
        labor +
        fees -
        discount
      );


    const total =
      Math.max(
        0,
        subtotal +
        taxAmount
      );


    const balance =
      Math.max(
        0,
        total -
        amountPaid
      );


    const previews = {

      laborPreview:
        money(labor),

      feesPreview:
        money(fees),

      discountPreview:
        `-${money(discount)}`,

      subtotalPreview:
        money(subtotal),

      taxPreview:
        money(taxAmount),

      totalPreview:
        money(total),

      paymentTotalPreview:
        money(total),

      paidPreview:
        money(amountPaid),

      balancePreview:
        money(balance)
    };


    Object.entries(
      previews
    ).forEach(
      ([id, value]) => {

        const element =
          document.getElementById(id);

        if (element) {

          element.textContent =
            value;
        }
      }
    );


    const laborAmountPreview =
      document.getElementById(
        "labor_amount_preview"
      );

    if (laborAmountPreview) {

      laborAmountPreview.value =
        money(labor);
    }


    const paymentStatus =
      document.getElementById(
        "payment_status"
      );

    if (
      paymentStatus &&
      paymentStatus.value !==
        "REFUNDED"
    ) {

      if (amountPaid <= 0) {

        paymentStatus.value =
          "UNPAID";

      } else if (
        total > 0 &&
        amountPaid >= total
      ) {

        paymentStatus.value =
          "PAID";

      } else {

        paymentStatus.value =
          "PARTIAL";
      }
    }


    return {
      labor,
      fees,
      subtotal,
      total,
      balance,
      amountPaid,
      taxAmount
    };
  }


  [
    "pricing_type",
    "hourly_rate",
    "labor_hours",
    "travel_fee",
    "truck_fee",
    "packing_fee",
    "specialty_fee",
    "disposal_fee",
    "other_fee",
    "discount",
    "tax_amount",
    "deposit_amount",
    "amount_paid"
  ]
    .forEach(
      id => {

        document
          .getElementById(id)
          ?.addEventListener(
            "input",
            calculatePricing
          );

        document
          .getElementById(id)
          ?.addEventListener(
            "change",
            calculatePricing
          );
      }
    );


  /* ======================================================
     RESET JOB FORM
  ====================================================== */

  function resetJobForm() {

    jobForm?.reset();

    if (jobIdInput) {

      jobIdInput.value =
        "";
    }

    if (jobModalTitle) {

      jobModalTitle.textContent =
        "Create Job";
    }

    if (jobNumberDisplay) {

      jobNumberDisplay.textContent =
        "Job number will be generated automatically.";
    }


    const defaults = {

      job_status:
        "SCHEDULED",

      pickup_stairs:
        "0",

      pickup_elevator:
        "false",

      destination_stairs:
        "0",

      destination_elevator:
        "false",

      packing_needed:
        "false",

      truck_required:
        "true",

      pricing_type:
        "HOURLY",

      travel_fee:
        "0",

      truck_fee:
        "0",

      packing_fee:
        "0",

      specialty_fee:
        "0",

      disposal_fee:
        "0",

      other_fee:
        "0",

      discount:
        "0",

      tax_amount:
        "0",

      deposit_amount:
        "0",

      amount_paid:
        "0",

      payment_status:
        "UNPAID"
    };


    Object.entries(
      defaults
    ).forEach(
      ([id, value]) => {

        setElementValue(
          id,
          value
        );
      }
    );

    clearJobError();

    calculatePricing();
  }


  /* ======================================================
     OPEN NEW JOB
  ====================================================== */

  function openNewJob() {

    currentJob =
      null;

    resetJobForm();

    applyJobDefaults();


    const params =
      new URLSearchParams(
        window.location.search
      );


    /*
      Customer passed from Customers,
      Leads or another admin page.
    */

    const customerId =
      params.get(
        "customer_id"
      );

    if (
      customerId &&
      customerSelect
    ) {

      customerSelect.value =
        customerId;

      fillFromCustomer();
    }


    /*
      Lead passed from Leads.
    */

    const leadId =
      params.get(
        "lead_id"
      );

    if (
      leadId &&
      leadSelect
    ) {

      leadSelect.value =
        leadId;

      fillFromSelectedLead();
    }


    /*
      Date passed from Calendar.

      Example:
      jobs.html?new=1&move_date=2026-08-16
    */

    const moveDate =
      params.get(
        "move_date"
      );

    if (moveDate) {

      const moveDateInput =
        document.getElementById(
          "move_date"
        );

      if (moveDateInput) {

        moveDateInput.value =
          moveDate;
      }
    }


    if (jobModal) {

      jobModal.hidden =
        false;
    }


    document.body.style.overflow =
      "hidden";
  }


  function closeJobModal() {

    if (jobModal) {

      jobModal.hidden =
        true;
    }

    document.body.style.overflow =
      "";
  }


  /* ======================================================
     EDIT JOB
  ====================================================== */

  function editJob(job) {

    currentJob =
      job;

    clearJobError();


    if (jobIdInput) {

      jobIdInput.value =
        job.id;
    }


    if (jobModalTitle) {

      jobModalTitle.textContent =
        "Edit Job";
    }


    if (jobNumberDisplay) {

      jobNumberDisplay.textContent =
        job.job_number ||
        "Job";
    }


    const values = {

      customer_id:
        job.customer_id,

      lead_id:
        job.lead_id,

      service_type:
        job.service_type,

      job_status:
        job.job_status,

      move_date:
        dateInputValue(
          job.move_date
        ),

      arrival_time:
        timeInputValue(
          job.arrival_time
        ),

      estimated_hours:
        job.estimated_hours,

      crew_size:
        job.crew_size,

      pickup_address:
        job.pickup_address,

      pickup_city:
        job.pickup_city,

      pickup_state:
        job.pickup_state,

      pickup_zip:
        job.pickup_zip,

      pickup_stairs:
        job.pickup_stairs,

      pickup_elevator:
        job.pickup_elevator
          ? "true"
          : "false",

      destination_address:
        job.destination_address,

      destination_city:
        job.destination_city,

      destination_state:
        job.destination_state,

      destination_zip:
        job.destination_zip,

      destination_stairs:
        job.destination_stairs,

      destination_elevator:
        job.destination_elevator
          ? "true"
          : "false",

      home_size:
        job.home_size,

      packing_needed:
        job.packing_needed
          ? "true"
          : "false",

      truck_required:
        job.truck_required
          ? "true"
          : "false",

      specialty_items:
        job.specialty_items,

      inventory_notes:
        job.inventory_notes,

      truck_notes:
        job.truck_notes,

      pricing_type:
        job.pricing_type,

      hourly_rate:
        job.hourly_rate,

      labor_hours:
        job.labor_hours,

      travel_fee:
        job.travel_fee,

      truck_fee:
        job.truck_fee,

      packing_fee:
        job.packing_fee,

      specialty_fee:
        job.specialty_fee,

      disposal_fee:
        job.disposal_fee,

      other_fee:
        job.other_fee,

      discount:
        job.discount,

      tax_amount:
        job.tax_amount,

      deposit_amount:
        job.deposit_amount,

      amount_paid:
        job.amount_paid,

      payment_status:
        job.payment_status,

      customer_notes:
        job.customer_notes,

      internal_notes:
        job.internal_notes
    };


    Object.entries(
      values
    ).forEach(
      ([id, value]) => {

        setElementValue(
          id,
          value
        );
      }
    );


    calculatePricing();

    closeViewJob();


    if (jobModal) {

      jobModal.hidden =
        false;
    }


    document.body.style.overflow =
      "hidden";
  }


  /* ======================================================
     SAVE JOB
  ====================================================== */

  async function saveJob(event) {

    event.preventDefault();

    clearJobError();


    if (
      !jobForm?.checkValidity()
    ) {

      jobForm?.reportValidity();

      return;
    }


    if (!saveJobButton) {
      return;
    }


    saveJobButton.disabled =
      true;

    saveJobButton.textContent =
      "Saving Job...";


    try {

      const data =
        new FormData(
          jobForm
        );

      const pricing =
        calculatePricing();


      const payload = {

        customer_id:
          clean(
            data.get(
              "customer_id"
            )
          ),

        lead_id:
          clean(
            data.get(
              "lead_id"
            )
          ),

        service_type:
          clean(
            data.get(
              "service_type"
            )
          ),

        job_status:
          clean(
            data.get(
              "job_status"
            )
          ) ||
          "SCHEDULED",

        move_date:
          clean(
            data.get(
              "move_date"
            )
          ),

        arrival_time:
          clean(
            data.get(
              "arrival_time"
            )
          ),

        estimated_hours:
          nullableNumber(
            data.get(
              "estimated_hours"
            )
          ),

        pickup_address:
          clean(
            data.get(
              "pickup_address"
            )
          ),

        pickup_city:
          clean(
            data.get(
              "pickup_city"
            )
          ),

        pickup_state:
          clean(
            data.get(
              "pickup_state"
            )
          ),

        pickup_zip:
          clean(
            data.get(
              "pickup_zip"
            )
          ),

        pickup_stairs:
          integerValue(
            data.get(
              "pickup_stairs"
            )
          ),

        pickup_elevator:
          booleanValue(
            data.get(
              "pickup_elevator"
            )
          ),

        destination_address:
          clean(
            data.get(
              "destination_address"
            )
          ),

        destination_city:
          clean(
            data.get(
              "destination_city"
            )
          ),

        destination_state:
          clean(
            data.get(
              "destination_state"
            )
          ),

        destination_zip:
          clean(
            data.get(
              "destination_zip"
            )
          ),

        destination_stairs:
          integerValue(
            data.get(
              "destination_stairs"
            )
          ),

        destination_elevator:
          booleanValue(
            data.get(
              "destination_elevator"
            )
          ),

        home_size:
          clean(
            data.get(
              "home_size"
            )
          ),

        packing_needed:
          booleanValue(
            data.get(
              "packing_needed"
            )
          ),

        specialty_items:
          clean(
            data.get(
              "specialty_items"
            )
          ),

        inventory_notes:
          clean(
            data.get(
              "inventory_notes"
            )
          ),

        crew_size:
          nullableInteger(
            data.get(
              "crew_size"
            )
          ),

        truck_required:
          booleanValue(
            data.get(
              "truck_required"
            )
          ),

        truck_notes:
          clean(
            data.get(
              "truck_notes"
            )
          ),

        internal_notes:
          clean(
            data.get(
              "internal_notes"
            )
          ),

        customer_notes:
          clean(
            data.get(
              "customer_notes"
            )
          ),

        pricing_type:
          clean(
            data.get(
              "pricing_type"
            )
          ) ||
          "HOURLY",

        hourly_rate:
          nullableNumber(
            data.get(
              "hourly_rate"
            )
          ),

        labor_hours:
          nullableNumber(
            data.get(
              "labor_hours"
            )
          ),

        labor_amount:
          pricing.labor,

        travel_fee:
          numberValue(
            data.get(
              "travel_fee"
            )
          ),

        truck_fee:
          numberValue(
            data.get(
              "truck_fee"
            )
          ),

        packing_fee:
          numberValue(
            data.get(
              "packing_fee"
            )
          ),

        specialty_fee:
          numberValue(
            data.get(
              "specialty_fee"
            )
          ),

        disposal_fee:
          numberValue(
            data.get(
              "disposal_fee"
            )
          ),

        other_fee:
          numberValue(
            data.get(
              "other_fee"
            )
          ),

        discount:
          numberValue(
            data.get(
              "discount"
            )
          ),

        tax_amount:
          pricing.taxAmount,

        subtotal:
          pricing.subtotal,

        total_amount:
          pricing.total,

        deposit_amount:
          numberValue(
            data.get(
              "deposit_amount"
            )
          ),

        amount_paid:
          pricing.amountPaid,

        balance_due:
          pricing.balance,

        payment_status:
          clean(
            data.get(
              "payment_status"
            )
          ) ||
          "UNPAID"
      };


      let query;

      const existingJobId =
        jobIdInput?.value;


      if (existingJobId) {

        query =
          db
            .from("jobs")
            .update(payload)
            .eq(
              "id",
              existingJobId
            )
            .select(`
              *,
              customer:customers (
                id,
                first_name,
                last_name,
                company_name,
                phone,
                email
              )
            `)
            .single();

      } else {

        /*
          job_number is intentionally NOT sent.
          Supabase generates it.
        */

        query =
          db
            .from("jobs")
            .insert(payload)
            .select(`
              *,
              customer:customers (
                id,
                first_name,
                last_name,
                company_name,
                phone,
                email
              )
            `)
            .single();
      }


      const {
        data: saved,
        error
      } =
        await query;


      if (error) {
        throw error;
      }


      if (
        saved.lead_id &&
        [
          "SCHEDULED",
          "CONFIRMED",
          "IN_PROGRESS",
          "COMPLETED"
        ].includes(
          saved.job_status
        )
      ) {

        const {
          error: leadError
        } =
          await db
            .from("leads")
            .update({
              status:
                "booked"
            })
            .eq(
              "id",
              saved.lead_id
            );

        if (leadError) {

          console.warn(
            "Job saved but linked lead status could not be updated:",
            leadError
          );
        }
      }


      closeJobModal();


      await loadJobs();


      const refreshed =
        jobs.find(
          item =>
            item.id ===
            saved.id
        );


      if (refreshed) {

        await openViewJob(
          refreshed
        );
      }


    } catch (error) {

      console.error(
        "Save job error:",
        error
      );

      showJobError(
        error?.message ||
        "The job could not be saved."
      );

    } finally {

      saveJobButton.disabled =
        false;

      saveJobButton.textContent =
        "Save Job";
    }
  }


  /* ======================================================
     VIEW JOB
  ====================================================== */

  async function openViewJob(job) {

    currentJob =
      job;


    if (viewJobNumber) {

      viewJobNumber.textContent =
        job.job_number ||
        "Job";
    }


    if (viewJobCustomer) {

      viewJobCustomer.textContent =
        fullName(
          job.customer
        );
    }


    if (viewJobContent) {

      const pickup =
        [
          job.pickup_address,
          job.pickup_city,
          job.pickup_state,
          job.pickup_zip
        ]
          .filter(Boolean)
          .join(", ");


      const destination =
        [
          job.destination_address,
          job.destination_city,
          job.destination_state,
          job.destination_zip
        ]
          .filter(Boolean)
          .join(", ");


      viewJobContent.innerHTML = `

        <div class="admin-job-detail-grid">

          ${detailHTML(
            "Service",
            serviceLabel(
              job.service_type
            )
          )}

          ${detailHTML(
            "Status",
            statusLabel(
              job.job_status
            )
          )}

          ${detailHTML(
            "Move Date",
            formatDate(
              job.move_date
            )
          )}

          ${detailHTML(
            "Arrival",
            formatTime(
              job.arrival_time
            )
          )}

          ${detailHTML(
            "Crew Size",
            job.crew_size
          )}

          ${detailHTML(
            "Estimated Hours",
            job.estimated_hours
          )}

        </div>


        <div class="admin-job-route">

          <div>

            <span>
              Pickup
            </span>

            <strong>

              ${escapeHTML(
                pickup ||
                "Not provided"
              )}

            </strong>

          </div>


          <div class="admin-job-route-arrow">
            →
          </div>


          <div>

            <span>
              Destination
            </span>

            <strong>

              ${escapeHTML(
                destination ||
                "Not provided"
              )}

            </strong>

          </div>

        </div>


        <div class="admin-job-financials">

          <div>

            <span>
              Total
            </span>

            <strong>
              ${money(
                job.total_amount
              )}
            </strong>

          </div>


          <div>

            <span>
              Paid
            </span>

            <strong>
              ${money(
                job.amount_paid
              )}
            </strong>

          </div>


          <div>

            <span>
              Balance
            </span>

            <strong>
              ${money(
                job.balance_due
              )}
            </strong>

          </div>

        </div>


        <div
          class="admin-job-detail-grid"
          style="margin-top:15px;"
        >

          ${detailHTML(
            "Payment Status",
            statusLabel(
              job.payment_status
            )
          )}

          ${detailHTML(
            "Pricing",
            statusLabel(
              job.pricing_type
            )
          )}

          ${detailHTML(
            "Hourly / Base Rate",
            job.hourly_rate !== null
              ? money(
                  job.hourly_rate
                )
              : null
          )}

          ${detailHTML(
            "Labor Hours",
            job.labor_hours
          )}

          ${detailHTML(
            "Pickup Stairs",
            job.pickup_stairs
          )}

          ${detailHTML(
            "Pickup Elevator",
            job.pickup_elevator
              ? "Yes"
              : "No"
          )}

          ${detailHTML(
            "Destination Stairs",
            job.destination_stairs
          )}

          ${detailHTML(
            "Destination Elevator",
            job.destination_elevator
              ? "Yes"
              : "No"
          )}

          ${detailHTML(
            "Packing Needed",
            job.packing_needed
              ? "Yes"
              : "No"
          )}

          ${detailHTML(
            "Truck Required",
            job.truck_required
              ? "Yes"
              : "No"
          )}

          ${detailHTML(
            "Specialty Items",
            job.specialty_items,
            true
          )}

          ${detailHTML(
            "Inventory Notes",
            job.inventory_notes,
            true
          )}

          ${detailHTML(
            "Truck Notes",
            job.truck_notes,
            true
          )}

          ${detailHTML(
            "Customer Notes",
            job.customer_notes,
            true
          )}

          ${detailHTML(
            "Internal Notes",
            job.internal_notes,
            true
          )}

        </div>
      `;
    }


    updateJobActionButtons(
      job
    );


    if (viewJobModal) {

      viewJobModal.hidden =
        false;
    }


    document.body.style.overflow =
      "hidden";


    await loadJobCrew(
      job.id
    );
  }


  function closeViewJob() {

    if (viewJobModal) {

      viewJobModal.hidden =
        true;
    }

    document.body.style.overflow =
      "";
  }


  /* ======================================================
     JOB STATUS
  ====================================================== */

  function updateJobActionButtons(job) {

    if (confirmJobButton) {

      confirmJobButton.disabled =
        [
          "CONFIRMED",
          "IN_PROGRESS",
          "COMPLETED",
          "CANCELLED"
        ].includes(
          job.job_status
        );
    }


    if (startJobButton) {

      startJobButton.disabled =
        [
          "IN_PROGRESS",
          "COMPLETED",
          "CANCELLED"
        ].includes(
          job.job_status
        );
    }


    if (completeJobButton) {

      completeJobButton.disabled =
        [
          "COMPLETED",
          "CANCELLED"
        ].includes(
          job.job_status
        );
    }
  }


  async function updateJobStatus(status) {

    if (!currentJob) {
      return;
    }


    const {
      error
    } =
      await db
        .from("jobs")
        .update({
          job_status:
            status
        })
        .eq(
          "id",
          currentJob.id
        );


    if (error) {
      throw error;
    }


    const jobId =
      currentJob.id;


    await loadJobs();


    const refreshed =
      jobs.find(
        item =>
          item.id ===
          jobId
      );


    if (refreshed) {

      await openViewJob(
        refreshed
      );
    }
  }


  /* ======================================================
     LOAD CREW ASSIGNMENTS
  ====================================================== */

  async function loadJobCrew(jobId) {

    if (!jobCrewList) {
      return;
    }


    jobCrewList.innerHTML = `
      <div class="admin-loading">
        Loading crew...
      </div>
    `;


    const {
      data,
      error
    } =
      await db
        .from("crew_assignments")
        .select(`
          id,
          job_id,
          crew_member_id,
          assignment_role,
          scheduled_start,
          scheduled_end,
          checked_in_at,
          checked_out_at,
          notes,
          created_at,

          crew_member:crew_members (
            id,
            first_name,
            last_name,
            phone,
            email,
            role,
            active,
            hourly_cost
          )
        `)
        .eq(
          "job_id",
          jobId
        )
        .order(
          "created_at",
          {
            ascending: true
          }
        );


    if (error) {

      console.error(
        "Load job crew error:",
        error
      );

      crewAssignments =
        [];

      jobCrewList.innerHTML = `
        <div class="admin-job-crew-empty">
          Crew could not be loaded.
        </div>
      `;

      return;
    }


    crewAssignments =
      data || [];


    populateCrewSelect();

    renderJobCrew();
  }


  /* ======================================================
     RENDER CREW
  ====================================================== */

  function renderJobCrew() {

    if (!jobCrewList) {
      return;
    }


    if (!crewAssignments.length) {

      jobCrewList.innerHTML = `
        <div class="admin-job-crew-empty">
          No crew members are assigned yet.
        </div>
      `;

      return;
    }


    jobCrewList.innerHTML =
      crewAssignments
        .map(
          assignment => {

            const member =
              assignment.crew_member ||
              {};


            let shiftStatus =
              "Not Checked In";

            let shiftClass =
              "status-draft";


            if (
              assignment.checked_in_at &&
              !assignment.checked_out_at
            ) {

              shiftStatus =
                "Checked In";

              shiftClass =
                "status-in_progress";
            }


            if (
              assignment.checked_out_at
            ) {

              shiftStatus =
                "Checked Out";

              shiftClass =
                "status-completed";
            }


            return `

              <article class="admin-job-crew-card">


                <div class="admin-job-crew-avatar">

                  ${escapeHTML(
                    crewInitials(
                      member
                    )
                  )}

                </div>


                <div class="admin-job-crew-info">


                  <h4>

                    ${escapeHTML(
                      crewName(
                        member
                      )
                    )}

                  </h4>


                  <div
                    style="
                      display:flex;
                      align-items:center;
                      flex-wrap:wrap;
                      gap:6px;
                    "
                  >

                    <span class="admin-job-crew-role">

                      ${escapeHTML(
                        roleLabel(
                          assignment.assignment_role
                        )
                      )}

                    </span>


                    <span
                      class="
                        admin-status
                        ${shiftClass}
                      "
                    >

                      ${escapeHTML(
                        shiftStatus
                      )}

                    </span>

                  </div>


                  ${
                    assignment.scheduled_start
                      ? `
                        <p>

                          Scheduled:
                          ${escapeHTML(
                            formatDateTime(
                              assignment.scheduled_start
                            )
                          )}

                        </p>
                      `
                      : ""
                  }


                  ${
                    assignment.checked_in_at
                      ? `
                        <p>

                          Checked in:
                          ${escapeHTML(
                            formatDateTime(
                              assignment.checked_in_at
                            )
                          )}

                        </p>
                      `
                      : ""
                  }


                  ${
                    assignment.checked_out_at
                      ? `
                        <p>

                          Checked out:
                          ${escapeHTML(
                            formatDateTime(
                              assignment.checked_out_at
                            )
                          )}

                        </p>
                      `
                      : ""
                  }


                  ${
                    assignment.notes
                      ? `
                        <p>
                          ${escapeHTML(
                            assignment.notes
                          )}
                        </p>
                      `
                      : ""
                  }


                </div>


                <div class="admin-crew-shift-actions">


                  ${
                    !assignment.checked_in_at
                      ? `

                        <button
                          type="button"
                          class="admin-table-action"
                          data-check-in="${escapeHTML(
                            assignment.id
                          )}"
                        >
                          Check In
                        </button>

                      `
                      : ""
                  }


                  ${
                    assignment.checked_in_at &&
                    !assignment.checked_out_at
                      ? `

                        <button
                          type="button"
                          class="admin-table-action"
                          data-check-out="${escapeHTML(
                            assignment.id
                          )}"
                        >
                          Check Out
                        </button>

                      `
                      : ""
                  }


                  <button
                    type="button"
                    class="admin-job-crew-remove"
                    data-remove-assignment="${escapeHTML(
                      assignment.id
                    )}"
                  >
                    Remove
                  </button>


                </div>


              </article>

            `;
          }
        )
        .join("");
  }


  /* ======================================================
     ASSIGN CREW
  ====================================================== */

  function openAssignCrew() {

    if (!currentJob) {
      return;
    }


    assignCrewForm?.reset();

    clearCrewError();

    populateCrewSelect();


    if (assignCrewJobLabel) {

      assignCrewJobLabel.textContent =
        currentJob.job_number ||
        "Moving Job";
    }


    if (
      currentJob.move_date &&
      assignmentStart
    ) {

      const time =
        currentJob.arrival_time
          ? String(
              currentJob.arrival_time
            ).slice(0, 5)
          : "08:00";


      assignmentStart.value =
        `${currentJob.move_date}T${time}`;
    }


    if (assignCrewModal) {

      assignCrewModal.hidden =
        false;
    }


    document.body.style.overflow =
      "hidden";
  }


  function closeAssignCrew() {

    if (assignCrewModal) {

      assignCrewModal.hidden =
        true;
    }


    document.body.style.overflow =
      viewJobModal &&
      !viewJobModal.hidden
        ? "hidden"
        : "";
  }


  async function saveCrewAssignment(event) {

    event.preventDefault();


    if (
      !currentJob ||
      !assignmentCrewMember?.value ||
      !assignmentRole?.value
    ) {

      showCrewError(
        "Select a crew member and assignment role."
      );

      return;
    }


    if (!saveCrewAssignmentButton) {
      return;
    }


    saveCrewAssignmentButton.disabled =
      true;

    saveCrewAssignmentButton.textContent =
      "Assigning...";


    try {

      const payload = {

        job_id:
          currentJob.id,

        crew_member_id:
          assignmentCrewMember.value,

        assignment_role:
          assignmentRole.value,

        scheduled_start:
          assignmentStart?.value
            ? new Date(
                assignmentStart.value
              ).toISOString()
            : null,

        scheduled_end:
          assignmentEnd?.value
            ? new Date(
                assignmentEnd.value
              ).toISOString()
            : null,

        notes:
          clean(
            assignmentNotes?.value
          )
      };


      const {
        error
      } =
        await db
          .from("crew_assignments")
          .insert(payload);


      if (error) {

        if (
          error.code ===
          "23505"
        ) {

          throw new Error(
            "This crew member is already assigned to this job."
          );
        }

        throw error;
      }


      closeAssignCrew();


      await loadJobCrew(
        currentJob.id
      );


    } catch (error) {

      console.error(
        "Save crew assignment error:",
        error
      );

      showCrewError(
        error?.message ||
        "Crew member could not be assigned."
      );

    } finally {

      saveCrewAssignmentButton.disabled =
        false;

      saveCrewAssignmentButton.textContent =
        "Assign Crew Member";
    }
  }


  /* ======================================================
     CHECK IN
  ====================================================== */

  async function checkInCrewMember(
    assignmentId
  ) {

    if (
      !assignmentId ||
      !currentJob
    ) {
      return;
    }


    const assignment =
      crewAssignments.find(
        item =>
          String(item.id) ===
          String(assignmentId)
      );


    if (!assignment) {
      return;
    }


    if (
      assignment.checked_in_at
    ) {
      return;
    }


    const confirmed =
      window.confirm(
        `Check ${crewName(
          assignment.crew_member
        )} in now?`
      );


    if (!confirmed) {
      return;
    }


    try {

      const {
        error
      } =
        await db
          .from("crew_assignments")
          .update({
            checked_in_at:
              new Date()
                .toISOString(),

            checked_out_at:
              null
          })
          .eq(
            "id",
            assignmentId
          );


      if (error) {
        throw error;
      }


      /*
        First crew check-in automatically
        moves the job into IN_PROGRESS.
      */

      if (
        [
          "SCHEDULED",
          "CONFIRMED"
        ].includes(
          currentJob.job_status
        )
      ) {

        const {
          error: jobError
        } =
          await db
            .from("jobs")
            .update({
              job_status:
                "IN_PROGRESS"
            })
            .eq(
              "id",
              currentJob.id
            );


        if (jobError) {

          console.warn(
            "Crew checked in but job status was not updated:",
            jobError
          );
        }
      }


      await loadJobCrew(
        currentJob.id
      );


      await refreshCurrentJob();


    } catch (error) {

      console.error(
        "Crew check-in error:",
        error
      );


      alert(
        error?.message ||
        "Crew member could not be checked in."
      );
    }
  }


  /* ======================================================
     CHECK OUT
  ====================================================== */

  async function checkOutCrewMember(
    assignmentId
  ) {

    if (
      !assignmentId ||
      !currentJob
    ) {
      return;
    }


    const assignment =
      crewAssignments.find(
        item =>
          String(item.id) ===
          String(assignmentId)
      );


    if (!assignment) {
      return;
    }


    if (
      !assignment.checked_in_at ||
      assignment.checked_out_at
    ) {
      return;
    }


    const confirmed =
      window.confirm(
        `Check ${crewName(
          assignment.crew_member
        )} out now?`
      );


    if (!confirmed) {
      return;
    }


    try {

      const {
        error
      } =
        await db
          .from("crew_assignments")
          .update({
            checked_out_at:
              new Date()
                .toISOString()
          })
          .eq(
            "id",
            assignmentId
          );


      if (error) {
        throw error;
      }


      await loadJobCrew(
        currentJob.id
      );


    } catch (error) {

      console.error(
        "Crew check-out error:",
        error
      );


      alert(
        error?.message ||
        "Crew member could not be checked out."
      );
    }
  }


  /* ======================================================
     REMOVE CREW
  ====================================================== */

  async function removeCrewAssignment(
    assignmentId
  ) {

    if (
      !assignmentId ||
      !currentJob
    ) {
      return;
    }


    const confirmed =
      window.confirm(
        "Remove this crew member from this job?"
      );


    if (!confirmed) {
      return;
    }


    try {

      const {
        error
      } =
        await db
          .from("crew_assignments")
          .delete()
          .eq(
            "id",
            assignmentId
          );


      if (error) {
        throw error;
      }


      await loadJobCrew(
        currentJob.id
      );


    } catch (error) {

      console.error(
        "Remove crew assignment error:",
        error
      );


      alert(
        error?.message ||
        "Crew member could not be removed."
      );
    }
  }


  /* ======================================================
     REFRESH CURRENT JOB
  ====================================================== */

  async function refreshCurrentJob() {

    if (!currentJob) {
      return;
    }


    const currentJobId =
      currentJob.id;


    await loadJobs();


    const refreshed =
      jobs.find(
        item =>
          item.id ===
          currentJobId
      );


    if (refreshed) {

      currentJob =
        refreshed;


      updateJobActionButtons(
        refreshed
      );


      if (viewJobNumber) {

        viewJobNumber.textContent =
          refreshed.job_number ||
          "Job";
      }
    }
  }


  /* ======================================================
     EVENTS
  ====================================================== */

  searchInput
    ?.addEventListener(
      "input",
      renderJobs
    );


  statusFilter
    ?.addEventListener(
      "change",
      renderJobs
    );


  paymentFilter
    ?.addEventListener(
      "change",
      renderJobs
    );


  customerSelect
    ?.addEventListener(
      "change",
      fillFromCustomer
    );


  leadSelect
    ?.addEventListener(
      "change",
      fillFromSelectedLead
    );


  newJobButton
    ?.addEventListener(
      "click",
      openNewJob
    );


  closeJobModalButton
    ?.addEventListener(
      "click",
      closeJobModal
    );


  cancelJobButton
    ?.addEventListener(
      "click",
      closeJobModal
    );


  jobModalBackdrop
    ?.addEventListener(
      "click",
      closeJobModal
    );


  jobForm
    ?.addEventListener(
      "submit",
      saveJob
    );


  tableBody
    ?.addEventListener(
      "click",
      event => {

        const button =
          event.target.closest(
            "[data-view-job]"
          );


        if (!button) {
          return;
        }


        const job =
          jobs.find(
            item =>
              String(item.id) ===
              String(
                button.dataset.viewJob
              )
          );


        if (job) {

          openViewJob(
            job
          );
        }
      }
    );


  closeViewJobButton
    ?.addEventListener(
      "click",
      closeViewJob
    );


  viewJobBackdrop
    ?.addEventListener(
      "click",
      closeViewJob
    );


  editJobButton
    ?.addEventListener(
      "click",
      () => {

        if (currentJob) {

          editJob(
            currentJob
          );
        }
      }
    );


  confirmJobButton
    ?.addEventListener(
      "click",
      async () => {

        try {

          await updateJobStatus(
            "CONFIRMED"
          );

        } catch (error) {

          console.error(
            error
          );

          alert(
            error?.message ||
            "Job could not be confirmed."
          );
        }
      }
    );


  startJobButton
    ?.addEventListener(
      "click",
      async () => {

        try {

          await updateJobStatus(
            "IN_PROGRESS"
          );

        } catch (error) {

          console.error(
            error
          );

          alert(
            error?.message ||
            "Job could not be started."
          );
        }
      }
    );


  completeJobButton
    ?.addEventListener(
      "click",
      async () => {

        const confirmed =
          window.confirm(
            "Mark this job as completed?"
          );


        if (!confirmed) {
          return;
        }


        try {

          await updateJobStatus(
            "COMPLETED"
          );

        } catch (error) {

          console.error(
            error
          );

          alert(
            error?.message ||
            "Job could not be completed."
          );
        }
      }
    );


  assignCrewButton
    ?.addEventListener(
      "click",
      openAssignCrew
    );


  closeAssignCrewButton
    ?.addEventListener(
      "click",
      closeAssignCrew
    );


  cancelAssignCrewButton
    ?.addEventListener(
      "click",
      closeAssignCrew
    );


  assignCrewBackdrop
    ?.addEventListener(
      "click",
      closeAssignCrew
    );


  assignCrewForm
    ?.addEventListener(
      "submit",
      saveCrewAssignment
    );


  jobCrewList
    ?.addEventListener(
      "click",
      event => {

        const checkInButton =
          event.target.closest(
            "[data-check-in]"
          );


        if (checkInButton) {

          checkInCrewMember(
            checkInButton.dataset
              .checkIn
          );

          return;
        }


        const checkOutButton =
          event.target.closest(
            "[data-check-out]"
          );


        if (checkOutButton) {

          checkOutCrewMember(
            checkOutButton.dataset
              .checkOut
          );

          return;
        }


        const removeButton =
          event.target.closest(
            "[data-remove-assignment]"
          );


        if (removeButton) {

          removeCrewAssignment(
            removeButton.dataset
              .removeAssignment
          );
        }
      }
    );


  /* ======================================================
     URL ACTIONS
  ====================================================== */

  async function processURLActions() {

    const params =
      new URLSearchParams(
        window.location.search
      );


    /*
      Create job mode.

      Supports:
      ?new=1
      ?new=1&customer_id=UUID
      ?new=1&lead_id=UUID
      ?new=1&move_date=YYYY-MM-DD

      These can also be combined.
    */

    if (
      params.get("new") ===
      "1"
    ) {

      openNewJob();

      return;
    }


    /*
      Open an existing job.
    */

    const jobId =
      params.get(
        "id"
      );


    if (!jobId) {
      return;
    }


    const job =
      jobs.find(
        item =>
          String(item.id) ===
          String(jobId)
      );


    if (job) {

      await openViewJob(
        job
      );
    }
  }


  /* ======================================================
     INITIALIZE
  ====================================================== */

  try {

    const loggedIn =
      await verifyLogin();


    if (!loggedIn) {
      return;
    }


    await Promise.all([

      loadCustomers(),

      loadLeads(),

      loadCrewMembers(),

      loadBusinessSettings()

    ]);


    await loadJobs();


    calculatePricing();


    await processURLActions();


  } catch (error) {

    console.error(
      "Metro Haul Jobs initialization error:",
      error
    );


    if (tableBody) {

      tableBody.innerHTML = `
        <tr>
          <td colspan="9">
            Jobs could not be loaded.
            Check the browser console.
          </td>
        </tr>
      `;
    }
  }

});
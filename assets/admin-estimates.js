"use strict";

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    /* ======================================================
       SUPABASE
    ====================================================== */

    const cfg =
      window.METRO_HAUL_SUPABASE;


    if (
      !cfg?.url ||
      !cfg?.publishableKey
    ) {

      console.error(
        "Metro Haul Supabase configuration missing."
      );

      return;
    }


    if (
      !window.supabase?.createClient
    ) {

      console.error(
        "Supabase library not loaded."
      );

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


    window.metroHaulDb =
      db;


    /* ======================================================
       ELEMENTS
    ====================================================== */

    const tableBody =
      document.getElementById(
        "estimatesTableBody"
      );


    const resultCount =
      document.getElementById(
        "estimateResultCount"
      );


    const allCount =
      document.getElementById(
        "allEstimatesCount"
      );


    const draftCount =
      document.getElementById(
        "draftEstimatesCount"
      );


    const sentCount =
      document.getElementById(
        "sentEstimatesCount"
      );


    const acceptedCount =
      document.getElementById(
        "acceptedEstimatesCount"
      );


    const searchInput =
      document.getElementById(
        "estimateSearch"
      );


    const statusFilter =
      document.getElementById(
        "estimateStatusFilter"
      );


    const newEstimateButton =
      document.getElementById(
        "newEstimateButton"
      );


    const estimateModal =
      document.getElementById(
        "estimateModal"
      );


    const estimateModalBackdrop =
      document.getElementById(
        "estimateModalBackdrop"
      );


    const closeEstimateModalButton =
      document.getElementById(
        "closeEstimateModal"
      );


    const cancelEstimateButton =
      document.getElementById(
        "cancelEstimateButton"
      );


    const estimateForm =
      document.getElementById(
        "estimateForm"
      );


    const estimateFormError =
      document.getElementById(
        "estimateFormError"
      );


    const saveEstimateButton =
      document.getElementById(
        "saveEstimateButton"
      );


    const estimateIdInput =
      document.getElementById(
        "estimateId"
      );


    const estimateModalTitle =
      document.getElementById(
        "estimateModalTitle"
      );


    const estimateNumberDisplay =
      document.getElementById(
        "estimateNumberDisplay"
      );


    const customerSelect =
      document.getElementById(
        "customer_id"
      );


    const leadSelect =
      document.getElementById(
        "lead_id"
      );


    /*
      View modal
    */

    const viewEstimateModal =
      document.getElementById(
        "viewEstimateModal"
      );


    const viewEstimateBackdrop =
      document.getElementById(
        "viewEstimateBackdrop"
      );


    const closeViewEstimateButton =
      document.getElementById(
        "closeViewEstimate"
      );


    const viewEstimateNumber =
      document.getElementById(
        "viewEstimateNumber"
      );


    const viewEstimateCustomer =
      document.getElementById(
        "viewEstimateCustomer"
      );


    const viewEstimateContent =
      document.getElementById(
        "viewEstimateContent"
      );


    const editEstimateButton =
      document.getElementById(
        "editEstimateButton"
      );


    const markEstimateSentButton =
      document.getElementById(
        "markEstimateSentButton"
      );


    const acceptEstimateButton =
      document.getElementById(
        "acceptEstimateButton"
      );


    const convertEstimateButton =
      document.getElementById(
        "convertEstimateButton"
      );


    /* ======================================================
       DATA
    ====================================================== */

    let estimates = [];
    let customers = [];
    let leads = [];

    let currentEstimate = null;
    let businessSettings = null;
    let currentAdminUser = null;


    /* ======================================================
       HELPERS
    ====================================================== */

    function text(
      value
    ) {

      return String(
        value ?? ""
      );
    }


    function clean(
      value
    ) {

      if (
        value === null ||
        value === undefined
      ) {

        return null;
      }


      const result =
        String(value)
          .trim();


      return result === ""
        ? null
        : result;
    }


    function numberValue(
      value
    ) {

      const number =
        Number(value);


      return Number.isFinite(
        number
      )
        ? number
        : 0;
    }


    function nullableNumber(
      value
    ) {

      if (
        value === null ||
        value === undefined ||
        String(value).trim() === ""
      ) {

        return null;
      }


      const number =
        Number(value);


      return Number.isFinite(
        number
      )
        ? number
        : null;
    }


    function nullableInteger(
      value
    ) {

      if (
        value === null ||
        value === undefined ||
        String(value).trim() === ""
      ) {

        return null;
      }


      const number =
        parseInt(
          value,
          10
        );


      return Number.isFinite(
        number
      )
        ? number
        : null;
    }


    function escapeHTML(
      value
    ) {

      return text(value)
        .replaceAll(
          "&",
          "&amp;"
        )
        .replaceAll(
          "<",
          "&lt;"
        )
        .replaceAll(
          ">",
          "&gt;"
        )
        .replaceAll(
          '"',
          "&quot;"
        )
        .replaceAll(
          "'",
          "&#039;"
        );
    }


    function money(
      value
    ) {

      return new Intl.NumberFormat(
        "en-US",
        {
          style: "currency",
          currency: "USD"
        }
      ).format(
        Number(
          value || 0
        )
      );
    }


    function fullName(
      customer
    ) {

      return [
        customer?.first_name,
        customer?.last_name
      ]
        .filter(Boolean)
        .join(" ") ||
        customer?.company_name ||
        "Customer";
    }


    function serviceLabel(
      value
    ) {

      const labels = {

        residential:
          "Residential Moving",

        apartment:
          "Apartment Moving",

        office:
          "Office Moving",

        loading:
          "Loading / Unloading",

        delivery:
          "Furniture Delivery",

        junk:
          "Junk Removal"
      };


      return labels[value] ||
        value ||
        "—";
    }


    function statusLabel(
      value
    ) {

      return String(
        value || ""
      )
        .replaceAll(
          "_",
          " "
        )
        .toLowerCase()
        .replace(
          /\b\w/g,
          character =>
            character.toUpperCase()
        );
    }


    function formatDate(
      value
    ) {

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


      return date
        .toLocaleDateString(
          "en-US",
          {
            month: "short",
            day: "numeric",
            year: "numeric"
          }
        );
    }


    function formatDateTime(
      value
    ) {

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


      return date
        .toLocaleString(
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


    function datetimeLocalValue(
      value
    ) {

      if (!value) {
        return "";
      }


      const date =
        new Date(value);


      if (
        Number.isNaN(
          date.getTime()
        )
      ) {

        return "";
      }


      const offset =
        date.getTimezoneOffset();


      return new Date(
        date.getTime() -
        offset * 60000
      )
        .toISOString()
        .slice(
          0,
          16
        );
    }


    function setElementValue(
      id,
      value
    ) {

      const element =
        document.getElementById(id);


      if (element) {

        element.value =
          value ?? "";
      }
    }


    function setElementText(
      id,
      value
    ) {

      const element =
        document.getElementById(id);


      if (element) {

        element.textContent =
          value;
      }
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


    /* ======================================================
       ERROR
    ====================================================== */

    function showFormError(
      message
    ) {

      if (!estimateFormError) {
        return;
      }


      estimateFormError.textContent =
        message;


      estimateFormError.hidden =
        false;


      estimateFormError
        .scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
    }


    function clearFormError() {

      if (!estimateFormError) {
        return;
      }


      estimateFormError.textContent =
        "";


      estimateFormError.hidden =
        true;
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


      currentAdminUser =
        data.user;


      const {
        data: profile,
        error: profileError
      } =
        await db
          .from(
            "admin_users"
          )
          .select(
            `
              id,
              full_name,
              role,
              is_active
            `
          )
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


    /* ======================================================
       APPLY ESTIMATE DEFAULTS
    ====================================================== */

    function applyEstimateDefaults() {

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
          Number(
            element.value
          ) === 0
        ) {

          element.value =
            String(value);
        }
      }


      setDefault(
        "hourly_rate",
        businessSettings
          .default_hourly_rate
      );


      setDefault(
        "travel_fee",
        businessSettings
          .default_travel_fee
      );


      setDefault(
        "truck_fee",
        businessSettings
          .default_truck_fee
      );


      setDefault(
        "deposit_required",
        businessSettings
          .default_deposit_amount
      );


      const terms =
        document.getElementById(
          "terms"
        );


      if (
        terms &&
        !terms.value &&
        businessSettings
          .estimate_terms
      ) {

        terms.value =
          businessSettings
            .estimate_terms;
      }


      calculateEstimate();
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
          .from(
            "customers"
          )
          .select(
            `
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
            `
          )
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


      customerSelect.innerHTML =
        `

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


          customerSelect
            .appendChild(
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
          .from(
            "leads"
          )
          .select(
            `
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
              packing_needed,
              specialty_items,
              notes,
              status
            `
          )
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


      leadSelect.innerHTML =
        `

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
            lead.phone ||
            lead.email ||
            "Lead";


          leadSelect
            .appendChild(
              option
            );
        }
      );
    }


    /* ======================================================
       CUSTOMER AUTO-FILL
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


      const pickup =
        document.getElementById(
          "pickup_address"
        );


      if (
        pickup &&
        !pickup.value &&
        customer.billing_address
      ) {

        pickup.value =
          [
            customer.billing_address,
            customer.billing_city,
            customer.billing_state,
            customer.billing_zip
          ]
            .filter(Boolean)
            .join(", ");
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
       LEAD AUTO-FILL
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
        [
          lead.pickup_address,
          lead.pickup_city,
          lead.pickup_state,
          lead.pickup_zip
        ]
          .filter(Boolean)
          .join(", ")
      );


      setIf(
        "destination_address",
        [
          lead.destination_address,
          lead.destination_city,
          lead.destination_state,
          lead.destination_zip
        ]
          .filter(Boolean)
          .join(", ")
      );


      setIf(
        "customer_notes",
        lead.notes
      );
    }


    /* ======================================================
       LOAD ESTIMATES
    ====================================================== */

    async function loadEstimates() {

      if (!tableBody) {
        return;
      }


      tableBody.innerHTML =
        `

          <tr>

            <td colspan="8">
              Loading estimates...
            </td>

          </tr>

        `;


      const {
        data,
        error
      } =
        await db
          .from(
            "estimates"
          )
          .select(
            `
              *,
              customer:customers (
                id,
                first_name,
                last_name,
                company_name,
                phone,
                email
              )
            `
          )
          .order(
            "created_at",
            {
              ascending: false
            }
          );


      if (error) {
        throw error;
      }


      estimates =
        data || [];


      updateStatistics();

      renderEstimates();
    }


    /* ======================================================
       STATISTICS
    ====================================================== */

    function updateStatistics() {

      setElementText(
        "allEstimatesCount",
        estimates.length
      );


      setElementText(
        "draftEstimatesCount",
        estimates.filter(
          estimate =>
            estimate.status ===
            "draft"
        ).length
      );


      setElementText(
        "sentEstimatesCount",
        estimates.filter(
          estimate =>
            estimate.status ===
            "sent"
        ).length
      );


      setElementText(
        "acceptedEstimatesCount",
        estimates.filter(
          estimate =>
            estimate.status ===
            "accepted"
        ).length
      );
    }


    /* ======================================================
       FILTERS
    ====================================================== */

    function getFilteredEstimates() {

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


      return estimates.filter(
        estimate => {

          if (
            status &&
            estimate.status !==
              status
          ) {

            return false;
          }


          if (!search) {
            return true;
          }


          const haystack =
            [
              estimate.estimate_number,
              fullName(
                estimate.customer
              ),
              estimate.customer?.phone,
              estimate.customer?.email,
              estimate.service_type,
              estimate.pickup_address,
              estimate.destination_address
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();


          return haystack
            .includes(
              search
            );
        }
      );
    }


    /* ======================================================
       RENDER TABLE
    ====================================================== */

    function renderEstimates() {

      if (!tableBody) {
        return;
      }


      const filtered =
        getFilteredEstimates();


      if (resultCount) {

        resultCount.textContent =
          `${filtered.length} ${
            filtered.length === 1
              ? "estimate"
              : "estimates"
          }`;
      }


      if (!filtered.length) {

        tableBody.innerHTML =
          `

            <tr>

              <td colspan="8">
                No estimates found.
              </td>

            </tr>

          `;

        return;
      }


      tableBody.innerHTML =
        filtered
          .map(
            estimate => {

              return `

                <tr>


                  <td>

                    <strong>
                      #${escapeHTML(
                        estimate.estimate_number
                      )}
                    </strong>

                  </td>


                  <td>

                    <strong>

                      ${escapeHTML(
                        fullName(
                          estimate.customer
                        )
                      )}

                    </strong>

                    <div class="admin-table-muted">

                      ${escapeHTML(
                        estimate.customer?.phone ||
                        ""
                      )}

                    </div>

                  </td>


                  <td>

                    ${escapeHTML(
                      formatDate(
                        estimate.move_date
                      )
                    )}

                  </td>


                  <td>

                    ${escapeHTML(
                      serviceLabel(
                        estimate.service_type
                      )
                    )}

                  </td>


                  <td>

                    <span
                      class="
                        admin-status
                        status-${escapeHTML(
                          estimate.status
                        )}
                      "
                    >

                      ${escapeHTML(
                        statusLabel(
                          estimate.status
                        )
                      )}

                    </span>

                  </td>


                  <td>

                    <strong>

                      ${escapeHTML(
                        money(
                          estimate.total
                        )
                      )}

                    </strong>

                  </td>


                  <td>

                    ${escapeHTML(
                      money(
                        estimate.deposit_required
                      )
                    )}

                  </td>


                  <td>

                    <button
                      type="button"
                      class="admin-table-action"
                      data-view-estimate="${escapeHTML(
                        estimate.id
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
       ESTIMATE CALCULATOR
    ====================================================== */

    function fieldNumber(
      id
    ) {

      return numberValue(
        document
          .getElementById(id)
          ?.value
      );
    }


    function calculateEstimate() {

      const estimatedHours =
        fieldNumber(
          "estimated_hours"
        );


      const hourlyRate =
        fieldNumber(
          "hourly_rate"
        );


      const travelFee =
        fieldNumber(
          "travel_fee"
        );


      const truckFee =
        fieldNumber(
          "truck_fee"
        );


      const materialsFee =
        fieldNumber(
          "materials_fee"
        );


      const junkFee =
        fieldNumber(
          "junk_fee"
        );


      const discount =
        fieldNumber(
          "discount"
        );


      const manualTax =
        fieldNumber(
          "tax"
        );


      const labor =
        estimatedHours *
        hourlyRate;


      const fees =
        travelFee +
        truckFee +
        materialsFee +
        junkFee;


      const subtotal =
        Math.max(
          0,
          labor +
          fees -
          discount
        );


      /*
        If Settings has a tax percentage,
        automatically calculate the dollar tax.

        Example:
        default_tax_rate = 6
        subtotal = $1,000
        tax = $60

        If default_tax_rate is zero,
        the manual tax field is used.
      */

      let tax =
        manualTax;


      const taxRate =
        Number(
          businessSettings
            ?.default_tax_rate ||
          0
        );


      if (
        taxRate > 0 &&
        document
          .getElementById(
            "tax"
          )
      ) {

        tax =
          subtotal *
          (
            taxRate /
            100
          );


        document
          .getElementById(
            "tax"
          )
          .value =
            tax.toFixed(2);
      }


      const total =
        Math.max(
          0,
          subtotal +
          tax
        );


      const laborAmountPreview =
        document.getElementById(
          "laborAmountPreview"
        );


      if (laborAmountPreview) {

        laborAmountPreview.value =
          money(labor);
      }


      setElementText(
        "laborPreview",
        money(labor)
      );


      setElementText(
        "estimateFeesPreview",
        money(fees)
      );


      setElementText(
        "estimateDiscountPreview",
        `-${money(discount)}`
      );


      setElementText(
        "estimateSubtotalPreview",
        money(subtotal)
      );


      setElementText(
        "estimateTaxPreview",
        money(tax)
      );


      setElementText(
        "estimateTotalPreview",
        money(total)
      );


      return {
        labor,
        fees,
        subtotal,
        tax,
        total
      };
    }


    [
      "estimated_hours",
      "hourly_rate",
      "travel_fee",
      "truck_fee",
      "materials_fee",
      "junk_fee",
      "discount",
      "tax",
      "deposit_required"
    ]
      .forEach(
        id => {

          document
            .getElementById(id)
            ?.addEventListener(
              "input",
              calculateEstimate
            );


          document
            .getElementById(id)
            ?.addEventListener(
              "change",
              calculateEstimate
            );
        }
      );


    /* ======================================================
       RESET
    ====================================================== */

    function resetEstimateForm() {

      estimateForm?.reset();


      currentEstimate =
        null;


      if (estimateIdInput) {

        estimateIdInput.value =
          "";
      }


      if (estimateModalTitle) {

        estimateModalTitle.textContent =
          "Create Estimate";
      }


      if (estimateNumberDisplay) {

        estimateNumberDisplay.textContent =
          "Estimate number will be generated automatically.";
      }


      const defaults = {

        status:
          "draft",

        travel_fee:
          "0",

        truck_fee:
          "0",

        materials_fee:
          "0",

        junk_fee:
          "0",

        discount:
          "0",

        tax:
          "0",

        deposit_required:
          "0"

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


      clearFormError();

      calculateEstimate();
    }


    /* ======================================================
       OPEN NEW ESTIMATE
    ====================================================== */

    function openNewEstimate() {

      resetEstimateForm();


      applyEstimateDefaults();


      const params =
        new URLSearchParams(
          window.location.search
        );


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


      if (estimateModal) {

        estimateModal.hidden =
          false;
      }


      document.body.style.overflow =
        "hidden";
    }


    function closeEstimateModal() {

      if (estimateModal) {

        estimateModal.hidden =
          true;
      }


      document.body.style.overflow =
        "";
    }


    /* ======================================================
       EDIT ESTIMATE
    ====================================================== */

    function editEstimate(
      estimate
    ) {

      currentEstimate =
        estimate;


      clearFormError();


      if (estimateIdInput) {

        estimateIdInput.value =
          estimate.id;
      }


      if (estimateModalTitle) {

        estimateModalTitle.textContent =
          "Edit Estimate";
      }


      if (estimateNumberDisplay) {

        estimateNumberDisplay.textContent =
          `Estimate #${estimate.estimate_number}`;
      }


      const values = {

        customer_id:
          estimate.customer_id,

        lead_id:
          estimate.lead_id,

        status:
          estimate.status,

        service_type:
          estimate.service_type,

        move_date:
          estimate.move_date,

        pickup_address:
          estimate.pickup_address,

        destination_address:
          estimate.destination_address,

        crew_size:
          estimate.crew_size,

        estimated_hours:
          estimate.estimated_hours,

        hourly_rate:
          estimate.hourly_rate,

        travel_fee:
          estimate.travel_fee,

        truck_fee:
          estimate.truck_fee,

        materials_fee:
          estimate.materials_fee,

        junk_fee:
          estimate.junk_fee,

        discount:
          estimate.discount,

        tax:
          estimate.tax,

        deposit_required:
          estimate.deposit_required,

        expires_at:
          datetimeLocalValue(
            estimate.expires_at
          ),

        terms:
          estimate.terms,

        internal_notes:
          estimate.internal_notes,

        customer_notes:
          estimate.customer_notes

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


      calculateEstimate();


      closeViewEstimate();


      if (estimateModal) {

        estimateModal.hidden =
          false;
      }


      document.body.style.overflow =
        "hidden";
    }


    /* ======================================================
       SAVE ESTIMATE
    ====================================================== */

    async function saveEstimate(
      event
    ) {

      event.preventDefault();


      clearFormError();


      if (
        !estimateForm?.checkValidity()
      ) {

        estimateForm
          ?.reportValidity();

        return;
      }


      if (!saveEstimateButton) {
        return;
      }


      saveEstimateButton.disabled =
        true;


      saveEstimateButton.textContent =
        "Saving Estimate...";


      try {

        const formData =
          new FormData(
            estimateForm
          );


        const pricing =
          calculateEstimate();


        const status =
          clean(
            formData.get(
              "status"
            )
          ) ||
          "draft";


        const payload = {

          customer_id:
            clean(
              formData.get(
                "customer_id"
              )
            ),

          lead_id:
            clean(
              formData.get(
                "lead_id"
              )
            ),

          status,

          service_type:
            clean(
              formData.get(
                "service_type"
              )
            ),

          move_date:
            clean(
              formData.get(
                "move_date"
              )
            ),

          pickup_address:
            clean(
              formData.get(
                "pickup_address"
              )
            ),

          destination_address:
            clean(
              formData.get(
                "destination_address"
              )
            ),

          crew_size:
            nullableInteger(
              formData.get(
                "crew_size"
              )
            ),

          estimated_hours:
            nullableNumber(
              formData.get(
                "estimated_hours"
              )
            ),

          hourly_rate:
            nullableNumber(
              formData.get(
                "hourly_rate"
              )
            ),

          travel_fee:
            numberValue(
              formData.get(
                "travel_fee"
              )
            ),

          truck_fee:
            numberValue(
              formData.get(
                "truck_fee"
              )
            ),

          materials_fee:
            numberValue(
              formData.get(
                "materials_fee"
              )
            ),

          junk_fee:
            numberValue(
              formData.get(
                "junk_fee"
              )
            ),

          discount:
            numberValue(
              formData.get(
                "discount"
              )
            ),

          tax:
            pricing.tax,

          subtotal:
            pricing.subtotal,

          total:
            pricing.total,

          deposit_required:
            numberValue(
              formData.get(
                "deposit_required"
              )
            ),

          expires_at:
            clean(
              formData.get(
                "expires_at"
              )
            )
              ? new Date(
                  formData.get(
                    "expires_at"
                  )
                ).toISOString()
              : null,

          terms:
            clean(
              formData.get(
                "terms"
              )
            ),

          internal_notes:
            clean(
              formData.get(
                "internal_notes"
              )
            ),

          customer_notes:
            clean(
              formData.get(
                "customer_notes"
              )
            ),

          accepted_at:
            status ===
              "accepted"
              ? (
                  currentEstimate
                    ?.accepted_at ||
                  new Date()
                    .toISOString()
                )
              : null,

          created_by:
            currentEstimate
              ? currentEstimate
                  .created_by
              : currentAdminUser
                  ?.id ||
                null

        };


        let query;


        if (
          estimateIdInput?.value
        ) {

          query =
            db
              .from(
                "estimates"
              )
              .update(
                payload
              )
              .eq(
                "id",
                estimateIdInput.value
              )
              .select(
                `
                  *,
                  customer:customers (
                    id,
                    first_name,
                    last_name,
                    company_name,
                    phone,
                    email
                  )
                `
              )
              .single();

        } else {

          /*
            estimate_number is generated
            by the database trigger.
          */

          query =
            db
              .from(
                "estimates"
              )
              .insert(
                payload
              )
              .select(
                `
                  *,
                  customer:customers (
                    id,
                    first_name,
                    last_name,
                    company_name,
                    phone,
                    email
                  )
                `
              )
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


        closeEstimateModal();


        await loadEstimates();


        const refreshed =
          estimates.find(
            item =>
              item.id ===
              saved.id
          );


        if (refreshed) {

          openViewEstimate(
            refreshed
          );
        }


      } catch (error) {

        console.error(
          "Save estimate error:",
          error
        );


        showFormError(
          error?.message ||
          "Estimate could not be saved."
        );


      } finally {

        saveEstimateButton.disabled =
          false;


        saveEstimateButton.textContent =
          "Save Estimate";
      }
    }


    /* ======================================================
       VIEW ESTIMATE
    ====================================================== */

    function openViewEstimate(
      estimate
    ) {

      currentEstimate =
        estimate;


      if (viewEstimateNumber) {

        viewEstimateNumber.textContent =
          `Estimate #${estimate.estimate_number}`;
      }


      if (viewEstimateCustomer) {

        viewEstimateCustomer.textContent =
          fullName(
            estimate.customer
          );
      }


      if (viewEstimateContent) {

        viewEstimateContent.innerHTML =
          `

            <div class="admin-job-detail-grid">

              ${detailHTML(
                "Status",
                statusLabel(
                  estimate.status
                )
              )}

              ${detailHTML(
                "Service",
                serviceLabel(
                  estimate.service_type
                )
              )}

              ${detailHTML(
                "Move Date",
                formatDate(
                  estimate.move_date
                )
              )}

              ${detailHTML(
                "Expires",
                formatDateTime(
                  estimate.expires_at
                )
              )}

              ${detailHTML(
                "Crew Size",
                estimate.crew_size
              )}

              ${detailHTML(
                "Estimated Hours",
                estimate.estimated_hours
              )}

              ${detailHTML(
                "Hourly Rate",
                estimate.hourly_rate !==
                  null
                  ? money(
                      estimate.hourly_rate
                    )
                  : null
              )}

              ${detailHTML(
                "Deposit Required",
                money(
                  estimate.deposit_required
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
                    estimate.pickup_address ||
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
                    estimate.destination_address ||
                    "Not provided"
                  )}

                </strong>

              </div>

            </div>


            <div class="admin-job-financials">

              <div>

                <span>
                  Subtotal
                </span>

                <strong>

                  ${escapeHTML(
                    money(
                      estimate.subtotal
                    )
                  )}

                </strong>

              </div>


              <div>

                <span>
                  Tax
                </span>

                <strong>

                  ${escapeHTML(
                    money(
                      estimate.tax
                    )
                  )}

                </strong>

              </div>


              <div>

                <span>
                  Total
                </span>

                <strong>

                  ${escapeHTML(
                    money(
                      estimate.total
                    )
                  )}

                </strong>

              </div>

            </div>


            <div
              class="admin-job-detail-grid"
              style="margin-top:15px;"
            >

              ${detailHTML(
                "Travel Fee",
                money(
                  estimate.travel_fee
                )
              )}

              ${detailHTML(
                "Truck Fee",
                money(
                  estimate.truck_fee
                )
              )}

              ${detailHTML(
                "Materials Fee",
                money(
                  estimate.materials_fee
                )
              )}

              ${detailHTML(
                "Junk Fee",
                money(
                  estimate.junk_fee
                )
              )}

              ${detailHTML(
                "Discount",
                money(
                  estimate.discount
                )
              )}

              ${detailHTML(
                "Accepted",
                estimate.accepted_at
                  ? formatDateTime(
                      estimate.accepted_at
                    )
                  : null
              )}

              ${detailHTML(
                "Customer Notes",
                estimate.customer_notes,
                true
              )}

              ${detailHTML(
                "Terms",
                estimate.terms,
                true
              )}

              ${detailHTML(
                "Internal Notes",
                estimate.internal_notes,
                true
              )}

            </div>

          `;
      }


      updateViewButtons();


      if (viewEstimateModal) {

        viewEstimateModal.hidden =
          false;
      }


      document.body.style.overflow =
        "hidden";
    }


    function closeViewEstimate() {

      if (viewEstimateModal) {

        viewEstimateModal.hidden =
          true;
      }


      document.body.style.overflow =
        "";
    }


    function updateViewButtons() {

      if (!currentEstimate) {
        return;
      }


      const status =
        currentEstimate.status;


      if (markEstimateSentButton) {

        markEstimateSentButton.disabled =
          [
            "sent",
            "accepted",
            "declined",
            "expired",
            "converted"
          ].includes(
            status
          );
      }


      if (acceptEstimateButton) {

        acceptEstimateButton.disabled =
          [
            "accepted",
            "converted"
          ].includes(
            status
          );
      }


      if (convertEstimateButton) {

        convertEstimateButton.disabled =
          status !==
            "accepted";
      }
    }


    /* ======================================================
       UPDATE STATUS
    ====================================================== */

    async function updateEstimateStatus(
      status
    ) {

      if (!currentEstimate) {
        return;
      }


      const payload = {
        status
      };


      if (
        status ===
        "accepted"
      ) {

        payload.accepted_at =
          currentEstimate
            .accepted_at ||
          new Date()
            .toISOString();
      }


      const {
        error
      } =
        await db
          .from(
            "estimates"
          )
          .update(
            payload
          )
          .eq(
            "id",
            currentEstimate.id
          );


      if (error) {
        throw error;
      }


      const estimateId =
        currentEstimate.id;


      await loadEstimates();


      const refreshed =
        estimates.find(
          item =>
            item.id ===
            estimateId
        );


      if (refreshed) {

        openViewEstimate(
          refreshed
        );
      }
    }


    /* ======================================================
       CONVERT ESTIMATE TO JOB
    ====================================================== */

    async function convertEstimateToJob() {

      if (!currentEstimate) {
        return;
      }


      if (
        currentEstimate.status !==
        "accepted"
      ) {

        alert(
          "Accept the estimate before converting it to a job."
        );

        return;
      }


      const confirmed =
        window.confirm(
          `Convert Estimate #${currentEstimate.estimate_number} into a scheduled job?`
        );


      if (!confirmed) {
        return;
      }


      if (convertEstimateButton) {

        convertEstimateButton.disabled =
          true;


        convertEstimateButton.textContent =
          "Creating Job...";
      }


      try {

        /*
          Estimate only stores full pickup/destination
          strings, while Jobs requires address fields.

          We store each estimate address string
          in the main address column.
        */

        const jobPayload = {

          customer_id:
            currentEstimate
              .customer_id,

          lead_id:
            currentEstimate
              .lead_id,

          service_type:
            currentEstimate
              .service_type,

          job_status:
            "SCHEDULED",

          move_date:
            currentEstimate
              .move_date,

          arrival_time:
            null,

          estimated_hours:
            currentEstimate
              .estimated_hours,

          pickup_address:
            currentEstimate
              .pickup_address ||
            "Address to be confirmed",

          pickup_city:
            null,

          pickup_state:
            null,

          pickup_zip:
            null,

          pickup_stairs:
            0,

          pickup_elevator:
            false,

          destination_address:
            currentEstimate
              .destination_address ||
            "Address to be confirmed",

          destination_city:
            null,

          destination_state:
            null,

          destination_zip:
            null,

          destination_stairs:
            0,

          destination_elevator:
            false,

          crew_size:
            currentEstimate
              .crew_size,

          packing_needed:
            false,

          truck_required:
            true,

          specialty_items:
            null,

          inventory_notes:
            null,

          truck_notes:
            null,

          customer_notes:
            currentEstimate
              .customer_notes,

          internal_notes:
            currentEstimate
              .internal_notes,

          pricing_type:
            "HOURLY",

          hourly_rate:
            currentEstimate
              .hourly_rate,

          labor_hours:
            currentEstimate
              .estimated_hours,

          labor_amount:
            (
              Number(
                currentEstimate
                  .estimated_hours ||
                0
              ) *
              Number(
                currentEstimate
                  .hourly_rate ||
                0
              )
            ),

          travel_fee:
            currentEstimate
              .travel_fee ||
            0,

          truck_fee:
            currentEstimate
              .truck_fee ||
            0,

          packing_fee:
            currentEstimate
              .materials_fee ||
            0,

          specialty_fee:
            0,

          disposal_fee:
            currentEstimate
              .junk_fee ||
            0,

          other_fee:
            0,

          discount:
            currentEstimate
              .discount ||
            0,

          tax_amount:
            currentEstimate
              .tax ||
            0,

          subtotal:
            currentEstimate
              .subtotal ||
            0,

          total_amount:
            currentEstimate
              .total ||
            0,

          deposit_amount:
            currentEstimate
              .deposit_required ||
            0,

          amount_paid:
            0,

          balance_due:
            currentEstimate
              .total ||
            0,

          payment_status:
            "UNPAID"

        };


        const {
          data: job,
          error: jobError
        } =
          await db
            .from(
              "jobs"
            )
            .insert(
              jobPayload
            )
            .select(
              `
                id,
                job_number
              `
            )
            .single();


        if (jobError) {
          throw jobError;
        }


        const {
          error: estimateError
        } =
          await db
            .from(
              "estimates"
            )
            .update({
              status:
                "converted"
            })
            .eq(
              "id",
              currentEstimate.id
            );


        if (estimateError) {
          throw estimateError;
        }


        if (
          currentEstimate
            .lead_id
        ) {

          const {
            error: leadError
          } =
            await db
              .from(
                "leads"
              )
              .update({
                status:
                  "booked"
              })
              .eq(
                "id",
                currentEstimate
                  .lead_id
              );


          if (leadError) {

            console.warn(
              "Job created but lead status update failed:",
              leadError
            );
          }
        }


        window.location.href =
          `jobs.html?id=${encodeURIComponent(
            job.id
          )}`;


      } catch (error) {

        console.error(
          "Convert estimate error:",
          error
        );


        alert(
          error?.message ||
          "The estimate could not be converted to a job."
        );


      } finally {

        if (convertEstimateButton) {

          convertEstimateButton.disabled =
            false;


          convertEstimateButton.textContent =
            "Convert to Job";
        }
      }
    }


    /* ======================================================
       EVENTS
    ====================================================== */

    searchInput
      ?.addEventListener(
        "input",
        renderEstimates
      );


    statusFilter
      ?.addEventListener(
        "change",
        renderEstimates
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


    newEstimateButton
      ?.addEventListener(
        "click",
        openNewEstimate
      );


    closeEstimateModalButton
      ?.addEventListener(
        "click",
        closeEstimateModal
      );


    cancelEstimateButton
      ?.addEventListener(
        "click",
        closeEstimateModal
      );


    estimateModalBackdrop
      ?.addEventListener(
        "click",
        closeEstimateModal
      );


    estimateForm
      ?.addEventListener(
        "submit",
        saveEstimate
      );


    tableBody
      ?.addEventListener(
        "click",
        event => {

          const button =
            event.target.closest(
              "[data-view-estimate]"
            );


          if (!button) {
            return;
          }


          const estimate =
            estimates.find(
              item =>
                String(item.id) ===
                String(
                  button.dataset
                    .viewEstimate
                )
            );


          if (estimate) {

            openViewEstimate(
              estimate
            );
          }
        }
      );


    closeViewEstimateButton
      ?.addEventListener(
        "click",
        closeViewEstimate
      );


    viewEstimateBackdrop
      ?.addEventListener(
        "click",
        closeViewEstimate
      );


    editEstimateButton
      ?.addEventListener(
        "click",
        () => {

          if (currentEstimate) {

            editEstimate(
              currentEstimate
            );
          }
        }
      );


    markEstimateSentButton
      ?.addEventListener(
        "click",
        async () => {

          try {

            await updateEstimateStatus(
              "sent"
            );

          } catch (error) {

            console.error(
              error
            );


            alert(
              "Estimate could not be marked sent."
            );
          }
        }
      );


    acceptEstimateButton
      ?.addEventListener(
        "click",
        async () => {

          try {

            await updateEstimateStatus(
              "accepted"
            );

          } catch (error) {

            console.error(
              error
            );


            alert(
              "Estimate could not be accepted."
            );
          }
        }
      );


    convertEstimateButton
      ?.addEventListener(
        "click",
        convertEstimateToJob
      );


    /* ======================================================
       URL ACTIONS
    ====================================================== */

    async function processURLActions() {

      const params =
        new URLSearchParams(
          window.location.search
        );


      if (
        params.get("new") ===
        "1"
      ) {

        openNewEstimate();

        return;
      }


      const estimateId =
        params.get(
          "id"
        );


      if (!estimateId) {
        return;
      }


      const estimate =
        estimates.find(
          item =>
            String(item.id) ===
            String(estimateId)
        );


      if (estimate) {

        openViewEstimate(
          estimate
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

        loadBusinessSettings()

      ]);


      await loadEstimates();


      calculateEstimate();


      await processURLActions();


    } catch (error) {

      console.error(
        "Metro Haul Estimates initialization error:",
        error
      );


      if (tableBody) {

        tableBody.innerHTML =
          `

            <tr>

              <td colspan="8">

                Estimates could not be loaded.
                Check the browser console.

              </td>

            </tr>

          `;
      }
    }

  }
);
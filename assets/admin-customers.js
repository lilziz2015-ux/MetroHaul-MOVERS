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
      "Metro Haul Supabase client is unavailable. Load supabase.js before admin-customers.js."
    );
    return;
  }


  /* ======================================================
     ELEMENTS
  ====================================================== */

  const tableBody =
    document.getElementById("customersTableBody");

  const resultCount =
    document.getElementById("customerResultCount");

  const customerCount =
    document.getElementById("customerCount");

  const customersWithEmailCount =
    document.getElementById("customersWithEmailCount");

  const customersFromLeadCount =
    document.getElementById("customersFromLeadCount");

  const customersThisMonthCount =
    document.getElementById("customersThisMonthCount");

  const searchInput =
    document.getElementById("customerSearch");

  const newCustomerButton =
    document.getElementById("newCustomerButton");


  /* ======================================================
     CUSTOMER FORM
  ====================================================== */

  const customerModal =
    document.getElementById("customerModal");

  const customerModalBackdrop =
    document.getElementById("customerModalBackdrop");

  const closeCustomerModalButton =
    document.getElementById("closeCustomerModal");

  const cancelCustomerButton =
    document.getElementById("cancelCustomerButton");

  const customerForm =
    document.getElementById("customerForm");

  const customerFormError =
    document.getElementById("customerFormError");

  const saveCustomerButton =
    document.getElementById("saveCustomerButton");

  const customerIdInput =
    document.getElementById("customerId");

  const customerModalTitle =
    document.getElementById("customerModalTitle");

  const customerModalSubtitle =
    document.getElementById("customerModalSubtitle");

  const sourceLeadSelect =
    document.getElementById("source_lead_id");


  /* ======================================================
     CUSTOMER VIEW
  ====================================================== */

  const viewCustomerModal =
    document.getElementById("viewCustomerModal");

  const viewCustomerBackdrop =
    document.getElementById("viewCustomerBackdrop");

  const closeViewCustomerButton =
    document.getElementById("closeViewCustomer");

  const viewCustomerName =
    document.getElementById("viewCustomerName");

  const viewCustomerCompany =
    document.getElementById("viewCustomerCompany");

  const viewCustomerContent =
    document.getElementById("viewCustomerContent");

  const editCustomerButton =
    document.getElementById("editCustomerButton");

  const newEstimateForCustomerButton =
    document.getElementById("newEstimateForCustomerButton");

  const newJobForCustomerButton =
    document.getElementById("newJobForCustomerButton");


  /* ======================================================
     STATE
  ====================================================== */

  let customers = [];
  let leads = [];

  let currentCustomer = null;
  let currentAdminUser = null;


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

    return result || null;
  }


  function escapeHTML(value) {
    return text(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
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


  function leadName(lead) {
    return [
      lead?.first_name,
      lead?.last_name
    ]
      .filter(Boolean)
      .join(" ") ||
      lead?.email ||
      lead?.phone ||
      "Lead";
  }


  function formatDate(value) {
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

    return date.toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric"
      }
    );
  }


  function setValue(
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


  function getLeadById(id) {
    if (!id) {
      return null;
    }

    return leads.find(
      lead =>
        String(lead.id) ===
        String(id)
    ) || null;
  }


  function getCustomerBySourceLeadId(
    leadId
  ) {
    if (!leadId) {
      return null;
    }

    return customers.find(
      customer =>
        String(
          customer.source_lead_id
        ) ===
        String(leadId)
    ) || null;
  }


  /* ======================================================
     FORM ERROR
  ====================================================== */

  function showFormError(message) {
    if (!customerFormError) {
      return;
    }

    customerFormError.textContent =
      message;

    customerFormError.hidden =
      false;

    customerFormError.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }


  function clearFormError() {
    if (!customerFormError) {
      return;
    }

    customerFormError.textContent =
      "";

    customerFormError.hidden =
      true;
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

        function finish(success) {
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
          phone,
          email,
          pickup_address,
          pickup_city,
          pickup_state,
          pickup_zip,
          status,
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

    leads =
      data || [];

    populateLeadSelect();
  }


  /* ======================================================
     POPULATE SOURCE LEADS
  ====================================================== */

  function populateLeadSelect() {
    if (!sourceLeadSelect) {
      return;
    }

    const previousValue =
      sourceLeadSelect.value;

    sourceLeadSelect.innerHTML = `
      <option value="">
        No linked lead
      </option>
    `;

    leads.forEach(
      lead => {
        const existingCustomer =
          getCustomerBySourceLeadId(
            lead.id
          );

        /*
          A lead can only belong to one customer.
          Keep the currently-linked lead available
          while editing its customer.
        */

        if (
          existingCustomer &&
          String(
            existingCustomer.id
          ) !==
          String(
            currentCustomer?.id
          )
        ) {
          return;
        }

        const option =
          document.createElement(
            "option"
          );

        option.value =
          lead.id;

        option.textContent =
          `${leadName(lead)}${
            lead.phone
              ? ` • ${lead.phone}`
              : ""
          }`;

        sourceLeadSelect.appendChild(
          option
        );
      }
    );

    if (
      previousValue &&
      [...sourceLeadSelect.options]
        .some(
          option =>
            option.value ===
            previousValue
        )
    ) {
      sourceLeadSelect.value =
        previousValue;
    }
  }


  /* ======================================================
     LOAD CUSTOMERS
  ====================================================== */

  async function loadCustomers() {
    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7">
            Loading customers...
          </td>
        </tr>
      `;
    }

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
          alternate_phone,
          company_name,
          billing_address,
          billing_city,
          billing_state,
          billing_zip,
          notes,
          source_lead_id,
          created_by,
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

    customers =
      data || [];

    updateStatistics();
    renderCustomers();

    /*
      Repopulate after customers load so
      already-converted leads can be excluded.
    */

    populateLeadSelect();
  }


  /* ======================================================
     STATS
  ====================================================== */

  function updateStatistics() {
    if (customerCount) {
      customerCount.textContent =
        String(
          customers.length
        );
    }

    if (customersWithEmailCount) {
      customersWithEmailCount.textContent =
        String(
          customers.filter(
            customer =>
              Boolean(
                customer.email
              )
          ).length
        );
    }

    if (customersFromLeadCount) {
      customersFromLeadCount.textContent =
        String(
          customers.filter(
            customer =>
              Boolean(
                customer.source_lead_id
              )
          ).length
        );
    }

    if (customersThisMonthCount) {
      const now =
        new Date();

      const currentMonth =
        now.getMonth();

      const currentYear =
        now.getFullYear();

      customersThisMonthCount.textContent =
        String(
          customers.filter(
            customer => {
              if (!customer.created_at) {
                return false;
              }

              const created =
                new Date(
                  customer.created_at
                );

              if (
                Number.isNaN(
                  created.getTime()
                )
              ) {
                return false;
              }

              return (
                created.getMonth() ===
                  currentMonth &&
                created.getFullYear() ===
                  currentYear
              );
            }
          ).length
        );
    }
  }


  /* ======================================================
     FILTERING
  ====================================================== */

  function getFilteredCustomers() {
    const search =
      String(
        searchInput?.value || ""
      )
        .trim()
        .toLowerCase();

    if (!search) {
      return customers;
    }

    return customers.filter(
      customer => {
        const linkedLead =
          getLeadById(
            customer.source_lead_id
          );

        const haystack =
          [
            customer.first_name,
            customer.last_name,
            customer.company_name,
            customer.phone,
            customer.alternate_phone,
            customer.email,
            customer.billing_address,
            customer.billing_city,
            customer.billing_state,
            customer.billing_zip,
            customer.notes,
            linkedLead
              ? leadName(
                  linkedLead
                )
              : ""
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

  function renderCustomers() {
    if (!tableBody) {
      return;
    }

    const filtered =
      getFilteredCustomers();

    if (resultCount) {
      resultCount.textContent =
        `${filtered.length} ${
          filtered.length === 1
            ? "customer"
            : "customers"
        }`;
    }

    if (!filtered.length) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7">
            No customers found.
          </td>
        </tr>
      `;

      return;
    }

    tableBody.innerHTML =
      filtered
        .map(
          customer => {
            const address =
              [
                customer.billing_address,
                customer.billing_city,
                customer.billing_state,
                customer.billing_zip
              ]
                .filter(Boolean)
                .join(", ") ||
              "—";

            const linkedLead =
              getLeadById(
                customer.source_lead_id
              );

            return `
              <tr>

                <td>
                  <strong>
                    ${escapeHTML(
                      fullName(
                        customer
                      )
                    )}
                  </strong>

                  ${
                    customer.company_name
                      ? `
                        <div class="admin-table-muted">
                          ${escapeHTML(
                            customer.company_name
                          )}
                        </div>
                      `
                      : ""
                  }
                </td>


                <td>
                  ${
                    customer.phone
                      ? `
                        <a
                          href="tel:${escapeHTML(
                            customer.phone
                          )}"
                          style="
                            color:inherit;
                            text-decoration:none;
                          "
                        >
                          ${escapeHTML(
                            customer.phone
                          )}
                        </a>
                      `
                      : "—"
                  }
                </td>


                <td>
                  ${
                    customer.email
                      ? `
                        <a
                          href="mailto:${escapeHTML(
                            customer.email
                          )}"
                          style="
                            color:inherit;
                            text-decoration:none;
                          "
                        >
                          ${escapeHTML(
                            customer.email
                          )}
                        </a>
                      `
                      : "—"
                  }
                </td>


                <td>
                  ${escapeHTML(
                    address
                  )}
                </td>


                <td>
                  ${
                    linkedLead
                      ? `
                        <span
                          class="
                            admin-status
                            status-scheduled
                          "
                        >
                          Lead
                        </span>

                        <div class="admin-table-muted">
                          ${escapeHTML(
                            leadName(
                              linkedLead
                            )
                          )}
                        </div>
                      `
                      : `
                        <span
                          class="
                            admin-status
                            status-draft
                          "
                        >
                          Manual
                        </span>
                      `
                  }
                </td>


                <td>
                  ${escapeHTML(
                    formatDate(
                      customer.created_at
                    )
                  )}
                </td>


                <td>
                  <button
                    type="button"
                    class="admin-table-action"
                    data-view-customer="${escapeHTML(
                      customer.id
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
     RESET FORM
  ====================================================== */

  function resetCustomerForm() {
    customerForm?.reset();

    currentCustomer =
      null;

    if (customerIdInput) {
      customerIdInput.value =
        "";
    }

    if (customerModalTitle) {
      customerModalTitle.textContent =
        "New Customer";
    }

    if (customerModalSubtitle) {
      customerModalSubtitle.textContent =
        "Add customer information.";
    }

    clearFormError();

    populateLeadSelect();
  }


  /* ======================================================
     LEAD AUTOFILL
  ====================================================== */

  function fillFromLead(
    leadId,
    overwrite = false
  ) {
    const lead =
      getLeadById(
        leadId
      );

    if (!lead) {
      return;
    }

    const values = {
      first_name:
        lead.first_name,

      last_name:
        lead.last_name,

      phone:
        lead.phone,

      email:
        lead.email,

      billing_address:
        lead.pickup_address,

      billing_city:
        lead.pickup_city,

      billing_state:
        lead.pickup_state,

      billing_zip:
        lead.pickup_zip
    };

    Object.entries(
      values
    )
      .forEach(
        ([id, value]) => {
          const element =
            document.getElementById(
              id
            );

          if (
            !element ||
            !value
          ) {
            return;
          }

          if (
            overwrite ||
            !element.value
          ) {
            element.value =
              value;
          }
        }
      );
  }


  /* ======================================================
     OPEN / CLOSE FORM
  ====================================================== */

  function openNewCustomer() {
    resetCustomerForm();

    const params =
      new URLSearchParams(
        window.location.search
      );

    const leadId =
      params.get(
        "lead_id"
      );

    if (
      leadId &&
      sourceLeadSelect
    ) {
      const existingCustomer =
        getCustomerBySourceLeadId(
          leadId
        );

      if (existingCustomer) {
        window.location.href =
          `customers.html?id=${encodeURIComponent(
            existingCustomer.id
          )}`;

        return;
      }

      sourceLeadSelect.value =
        leadId;

      fillFromLead(
        leadId,
        true
      );
    }

    if (customerModal) {
      customerModal.hidden =
        false;
    }

    document.body.style.overflow =
      "hidden";
  }


  function closeCustomerModal() {
    if (customerModal) {
      customerModal.hidden =
        true;
    }

    document.body.style.overflow =
      "";
  }


  /* ======================================================
     EDIT CUSTOMER
  ====================================================== */

  function editCustomer(customer) {
    currentCustomer =
      customer;

    clearFormError();

    /*
      Rebuild lead options so this customer's
      existing source lead remains selectable.
    */

    populateLeadSelect();

    if (customerIdInput) {
      customerIdInput.value =
        customer.id;
    }

    if (customerModalTitle) {
      customerModalTitle.textContent =
        "Edit Customer";
    }

    if (customerModalSubtitle) {
      customerModalSubtitle.textContent =
        fullName(
          customer
        );
    }

    const values = {
      first_name:
        customer.first_name,

      last_name:
        customer.last_name,

      company_name:
        customer.company_name,

      phone:
        customer.phone,

      alternate_phone:
        customer.alternate_phone,

      email:
        customer.email,

      billing_address:
        customer.billing_address,

      billing_city:
        customer.billing_city,

      billing_state:
        customer.billing_state,

      billing_zip:
        customer.billing_zip,

      source_lead_id:
        customer.source_lead_id,

      notes:
        customer.notes
    };

    Object.entries(
      values
    )
      .forEach(
        ([id, value]) => {
          setValue(
            id,
            value
          );
        }
      );

    closeViewCustomer();

    if (customerModal) {
      customerModal.hidden =
        false;
    }

    document.body.style.overflow =
      "hidden";
  }


  /* ======================================================
     SAVE CUSTOMER
  ====================================================== */

  async function saveCustomer(event) {
    event.preventDefault();

    clearFormError();

    if (
      !customerForm?.checkValidity()
    ) {
      customerForm.reportValidity();
      return;
    }

    if (!saveCustomerButton) {
      return;
    }

    saveCustomerButton.disabled =
      true;

    saveCustomerButton.textContent =
      "Saving Customer...";

    try {
      const data =
        new FormData(
          customerForm
        );

      const firstName =
        clean(
          data.get(
            "first_name"
          )
        );

      const lastName =
        clean(
          data.get(
            "last_name"
          )
        );

      const phone =
        clean(
          data.get(
            "phone"
          )
        );

      const sourceLeadId =
        clean(
          data.get(
            "source_lead_id"
          )
        );

      if (!firstName) {
        throw new Error(
          "First name is required."
        );
      }

      if (!lastName) {
        throw new Error(
          "Last name is required."
        );
      }

      if (!phone) {
        throw new Error(
          "Phone number is required."
        );
      }

      /*
        Prevent a second customer from
        being attached to the same lead.
      */

      if (sourceLeadId) {
        const existing =
          getCustomerBySourceLeadId(
            sourceLeadId
          );

        if (
          existing &&
          String(existing.id) !==
          String(
            customerIdInput?.value
          )
        ) {
          throw new Error(
            "This lead is already connected to another customer."
          );
        }
      }

      const payload = {
        first_name:
          firstName,

        last_name:
          lastName,

        email:
          clean(
            data.get(
              "email"
            )
          ),

        phone,

        alternate_phone:
          clean(
            data.get(
              "alternate_phone"
            )
          ),

        company_name:
          clean(
            data.get(
              "company_name"
            )
          ),

        billing_address:
          clean(
            data.get(
              "billing_address"
            )
          ),

        billing_city:
          clean(
            data.get(
              "billing_city"
            )
          ),

        billing_state:
          clean(
            data.get(
              "billing_state"
            )
          ),

        billing_zip:
          clean(
            data.get(
              "billing_zip"
            )
          ),

        notes:
          clean(
            data.get(
              "notes"
            )
          ),

        source_lead_id:
          sourceLeadId,

        created_by:
          currentCustomer
            ? currentCustomer.created_by
            : currentAdminUser?.id ||
              null
      };

      let query;

      const existingCustomerId =
        customerIdInput?.value;

      if (existingCustomerId) {
        query =
          db
            .from("customers")
            .update(
              payload
            )
            .eq(
              "id",
              existingCustomerId
            )
            .select()
            .single();

      } else {
        query =
          db
            .from("customers")
            .insert(
              payload
            )
            .select()
            .single();
      }

      const {
        data: saved,
        error
      } =
        await query;

      if (error) {
        if (
          error.code ===
          "23505"
        ) {
          throw new Error(
            "This lead is already connected to a customer."
          );
        }

        throw error;
      }

      closeCustomerModal();

      await loadCustomers();

      const refreshed =
        customers.find(
          item =>
            String(item.id) ===
            String(saved.id)
        );

      if (refreshed) {
        openViewCustomer(
          refreshed
        );
      }

    } catch (error) {
      console.error(
        "Save customer error:",
        error
      );

      showFormError(
        error?.message ||
        "Customer could not be saved."
      );

    } finally {
      saveCustomerButton.disabled =
        false;

      saveCustomerButton.textContent =
        "Save Customer";
    }
  }


  /* ======================================================
     VIEW CUSTOMER
  ====================================================== */

  function openViewCustomer(customer) {
    currentCustomer =
      customer;

    if (viewCustomerName) {
      viewCustomerName.textContent =
        fullName(
          customer
        );
    }

    if (viewCustomerCompany) {
      viewCustomerCompany.textContent =
        customer.company_name ||
        "";
    }

    const address =
      [
        customer.billing_address,
        customer.billing_city,
        customer.billing_state,
        customer.billing_zip
      ]
        .filter(Boolean)
        .join(", ");

    const sourceLead =
      getLeadById(
        customer.source_lead_id
      );

    if (viewCustomerContent) {
      viewCustomerContent.innerHTML = `

        <div class="admin-job-detail-grid">

          ${detailHTML(
            "Phone",
            customer.phone
          )}

          ${detailHTML(
            "Alternate Phone",
            customer.alternate_phone
          )}

          ${detailHTML(
            "Email",
            customer.email
          )}

          ${detailHTML(
            "Company",
            customer.company_name
          )}

          ${detailHTML(
            "Billing Address",
            address,
            true
          )}

          ${detailHTML(
            "Source",
            sourceLead
              ? `Lead: ${leadName(
                  sourceLead
                )}`
              : "Manual customer"
          )}

          ${detailHTML(
            "Created",
            formatDate(
              customer.created_at
            )
          )}

          ${detailHTML(
            "Updated",
            formatDate(
              customer.updated_at
            )
          )}

          ${detailHTML(
            "Notes",
            customer.notes,
            true
          )}

        </div>


        <div
          class="admin-form-actions admin-customer-contact-actions"
          style="
            justify-content:flex-start;
            padding-left:0;
            padding-right:0;
            padding-bottom:0;
          "
        >

          ${
            customer.phone
              ? `
                <a
                  href="tel:${escapeHTML(
                    customer.phone
                  )}"
                  class="admin-secondary-button"
                  style="text-decoration:none;"
                >
                  Call
                </a>

                <a
                  href="sms:${escapeHTML(
                    customer.phone
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
            customer.email
              ? `
                <a
                  href="mailto:${escapeHTML(
                    customer.email
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

    if (viewCustomerModal) {
      viewCustomerModal.hidden =
        false;
    }

    document.body.style.overflow =
      "hidden";
  }


  function closeViewCustomer() {
    if (viewCustomerModal) {
      viewCustomerModal.hidden =
        true;
    }

    document.body.style.overflow =
      "";
  }


  /* ======================================================
     EVENTS
  ====================================================== */

  searchInput
    ?.addEventListener(
      "input",
      renderCustomers
    );


  newCustomerButton
    ?.addEventListener(
      "click",
      openNewCustomer
    );


  sourceLeadSelect
    ?.addEventListener(
      "change",
      () => {
        if (
          !sourceLeadSelect.value
        ) {
          return;
        }

        const existing =
          getCustomerBySourceLeadId(
            sourceLeadSelect.value
          );

        if (
          existing &&
          String(existing.id) !==
          String(
            currentCustomer?.id
          )
        ) {
          showFormError(
            "This lead is already connected to another customer."
          );

          sourceLeadSelect.value =
            "";

          return;
        }

        clearFormError();

        fillFromLead(
          sourceLeadSelect.value,
          false
        );
      }
    );


  closeCustomerModalButton
    ?.addEventListener(
      "click",
      closeCustomerModal
    );


  cancelCustomerButton
    ?.addEventListener(
      "click",
      closeCustomerModal
    );


  customerModalBackdrop
    ?.addEventListener(
      "click",
      closeCustomerModal
    );


  customerForm
    ?.addEventListener(
      "submit",
      saveCustomer
    );


  tableBody
    ?.addEventListener(
      "click",
      event => {
        const button =
          event.target.closest(
            "[data-view-customer]"
          );

        if (!button) {
          return;
        }

        const customer =
          customers.find(
            item =>
              String(item.id) ===
              String(
                button.dataset
                  .viewCustomer
              )
          );

        if (customer) {
          openViewCustomer(
            customer
          );
        }
      }
    );


  closeViewCustomerButton
    ?.addEventListener(
      "click",
      closeViewCustomer
    );


  viewCustomerBackdrop
    ?.addEventListener(
      "click",
      closeViewCustomer
    );


  editCustomerButton
    ?.addEventListener(
      "click",
      () => {
        if (currentCustomer) {
          editCustomer(
            currentCustomer
          );
        }
      }
    );


  newEstimateForCustomerButton
    ?.addEventListener(
      "click",
      () => {
        if (!currentCustomer) {
          return;
        }

        const params =
          new URLSearchParams({
            new: "1",
            customer_id:
              currentCustomer.id
          });

        if (
          currentCustomer
            .source_lead_id
        ) {
          params.set(
            "lead_id",
            currentCustomer
              .source_lead_id
          );
        }

        window.location.href =
          `estimates.html?${params.toString()}`;
      }
    );


  newJobForCustomerButton
    ?.addEventListener(
      "click",
      () => {
        if (!currentCustomer) {
          return;
        }

        const params =
          new URLSearchParams({
            new: "1",
            customer_id:
              currentCustomer.id
          });

        if (
          currentCustomer
            .source_lead_id
        ) {
          params.set(
            "lead_id",
            currentCustomer
              .source_lead_id
          );
        }

        window.location.href =
          `jobs.html?${params.toString()}`;
      }
    );


  document.addEventListener(
    "keydown",
    event => {
      if (
        event.key !==
        "Escape"
      ) {
        return;
      }

      if (
        customerModal &&
        !customerModal.hidden
      ) {
        closeCustomerModal();
        return;
      }

      if (
        viewCustomerModal &&
        !viewCustomerModal.hidden
      ) {
        closeViewCustomer();
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

    if (
      params.get("new") ===
      "1"
    ) {
      openNewCustomer();
      return;
    }

    const customerId =
      params.get(
        "id"
      );

    if (!customerId) {
      return;
    }

    const customer =
      customers.find(
        item =>
          String(item.id) ===
          String(customerId)
      );

    if (customer) {
      openViewCustomer(
        customer
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

    /*
      Leads first, then customers.
      This allows the customer source-lead
      selector to correctly exclude already
      converted leads.
    */

    await loadLeads();
    await loadCustomers();

    await processURLActions();

  } catch (error) {
    console.error(
      "Metro Haul Customers initialization error:",
      error
    );

    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7">
            Customers could not be loaded.
            Check the browser console.
          </td>
        </tr>
      `;
    }
  }

});
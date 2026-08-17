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
    document.getElementById("paymentsTableBody");

  const resultCount =
    document.getElementById("paymentResultCount");

  const totalCollectedAmount =
    document.getElementById("totalCollectedAmount");

  const paidPaymentCount =
    document.getElementById("paidPaymentCount");

  const pendingPaymentCount =
    document.getElementById("pendingPaymentCount");

  const refundedPaymentCount =
    document.getElementById("refundedPaymentCount");

  const paymentSearch =
    document.getElementById("paymentSearch");

  const paymentStatusFilter =
    document.getElementById("paymentStatusFilter");

  const paymentMethodFilter =
    document.getElementById("paymentMethodFilter");

  const newPaymentButton =
    document.getElementById("newPaymentButton");


  /* ======================================================
     PAYMENT MODAL
  ====================================================== */

  const paymentModal =
    document.getElementById("paymentModal");

  const paymentModalBackdrop =
    document.getElementById("paymentModalBackdrop");

  const closePaymentModalButton =
    document.getElementById("closePaymentModal");

  const cancelPaymentButton =
    document.getElementById("cancelPaymentButton");

  const paymentForm =
    document.getElementById("paymentForm");

  const paymentFormError =
    document.getElementById("paymentFormError");

  const savePaymentButton =
    document.getElementById("savePaymentButton");

  const paymentIdInput =
    document.getElementById("paymentId");

  const paymentModalTitle =
    document.getElementById("paymentModalTitle");

  const paymentModalSubtitle =
    document.getElementById("paymentModalSubtitle");

  const customerSelect =
    document.getElementById("customer_id");

  const jobSelect =
    document.getElementById("job_id");

  const estimateSelect =
    document.getElementById("estimate_id");

  const amountInput =
    document.getElementById("amount");

  const methodInput =
    document.getElementById("method");

  const statusInput =
    document.getElementById("status");

  const paidAtInput =
    document.getElementById("paid_at");

  const receivedAtInput =
    document.getElementById("received_at");

  const externalReferenceInput =
    document.getElementById("external_reference");

  const notesInput =
    document.getElementById("notes");


  /* ======================================================
     JOB BALANCE PREVIEW
  ====================================================== */

  const paymentJobSummary =
    document.getElementById("paymentJobSummary");

  const paymentJobTotal =
    document.getElementById("paymentJobTotal");

  const paymentJobPaid =
    document.getElementById("paymentJobPaid");

  const paymentJobBalance =
    document.getElementById("paymentJobBalance");

  const paymentNewBalance =
    document.getElementById("paymentNewBalance");


  /* ======================================================
     VIEW MODAL
  ====================================================== */

  const viewPaymentModal =
    document.getElementById("viewPaymentModal");

  const viewPaymentBackdrop =
    document.getElementById("viewPaymentBackdrop");

  const closeViewPaymentButton =
    document.getElementById("closeViewPayment");

  const viewPaymentAmount =
    document.getElementById("viewPaymentAmount");

  const viewPaymentCustomer =
    document.getElementById("viewPaymentCustomer");

  const viewPaymentContent =
    document.getElementById("viewPaymentContent");

  const editPaymentButton =
    document.getElementById("editPaymentButton");

  const markPaymentPaidButton =
    document.getElementById("markPaymentPaidButton");

  const viewPaymentJobButton =
    document.getElementById("viewPaymentJobButton");


  /* ======================================================
     DATA
  ====================================================== */

  let payments = [];
  let customers = [];
  let jobs = [];
  let estimates = [];

  let currentPayment = null;
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


  function methodLabel(value) {

    const labels = {
      cash: "Cash",
      card: "Card",
      zelle: "Zelle",
      check: "Check",
      ach: "ACH",
      other: "Other"
    };

    return labels[value] ||
      "—";
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


  function localDateTimeInput(value) {

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

    const localDate =
      new Date(
        date.getTime() -
        offset * 60000
      );

    return localDate
      .toISOString()
      .slice(0, 16);
  }


  function toISOStringOrNull(value) {

    if (!value) {
      return null;
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return null;
    }

    return date.toISOString();
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


  function showFormError(message) {

    if (!paymentFormError) {
      return;
    }

    paymentFormError.textContent =
      message;

    paymentFormError.hidden =
      false;
  }


  function clearFormError() {

    if (!paymentFormError) {
      return;
    }

    paymentFormError.textContent =
      "";

    paymentFormError.hidden =
      true;
  }


  function getCustomerById(id) {

    return customers.find(
      customer =>
        String(customer.id) ===
        String(id)
    );
  }


  function getJobById(id) {

    return jobs.find(
      job =>
        String(job.id) ===
        String(id)
    );
  }


  function getEstimateById(id) {

    return estimates.find(
      estimate =>
        String(estimate.id) ===
        String(id)
    );
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
          email
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

    populateCustomerSelect();
  }


  function populateCustomerSelect() {

    if (!customerSelect) {
      return;
    }

    const current =
      customerSelect.value;

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

    if (current) {
      customerSelect.value =
        current;
    }
  }


  /* ======================================================
     LOAD JOBS
  ====================================================== */

  async function loadJobs() {

    const {
      data,
      error
    } =
      await db
        .from("jobs")
        .select(`
          id,
          job_number,
          customer_id,
          move_date,
          service_type,
          total_amount,
          amount_paid,
          balance_due,
          payment_status,
          job_status
        `)
        .order(
          "move_date",
          {
            ascending: false
          }
        );

    if (error) {
      throw error;
    }

    jobs =
      data || [];

    populateJobSelect();
  }


  function populateJobSelect() {

    if (!jobSelect) {
      return;
    }

    const current =
      jobSelect.value;

    const customerId =
      customerSelect?.value ||
      "";

    jobSelect.innerHTML = `
      <option value="">
        No linked job
      </option>
    `;

    jobs
      .filter(
        job =>
          !customerId ||
          String(job.customer_id) ===
          String(customerId)
      )
      .forEach(
        job => {

          const option =
            document.createElement(
              "option"
            );

          option.value =
            job.id;

          option.textContent =
            `${job.job_number} • ${formatDate(
              job.move_date
            )} • ${money(
              job.balance_due
            )} balance`;

          jobSelect.appendChild(
            option
          );
        }
      );

    if (
      current &&
      [...jobSelect.options]
        .some(
          option =>
            option.value ===
            current
        )
    ) {
      jobSelect.value =
        current;
    }
  }


  /* ======================================================
     LOAD ESTIMATES
  ====================================================== */

  async function loadEstimates() {

    const {
      data,
      error
    } =
      await db
        .from("estimates")
        .select(`
          id,
          estimate_number,
          customer_id,
          status,
          total,
          deposit_required,
          move_date
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

    estimates =
      data || [];

    populateEstimateSelect();
  }


  function populateEstimateSelect() {

    if (!estimateSelect) {
      return;
    }

    const current =
      estimateSelect.value;

    const customerId =
      customerSelect?.value ||
      "";

    estimateSelect.innerHTML = `
      <option value="">
        No linked estimate
      </option>
    `;

    estimates
      .filter(
        estimate =>
          !customerId ||
          String(
            estimate.customer_id
          ) ===
          String(customerId)
      )
      .forEach(
        estimate => {

          const option =
            document.createElement(
              "option"
            );

          option.value =
            estimate.id;

          option.textContent =
            `EST-${estimate.estimate_number} • ${money(
              estimate.total
            )}`;

          estimateSelect.appendChild(
            option
          );
        }
      );

    if (
      current &&
      [...estimateSelect.options]
        .some(
          option =>
            option.value ===
            current
        )
    ) {
      estimateSelect.value =
        current;
    }
  }


  /* ======================================================
     LOAD PAYMENTS
  ====================================================== */

  async function loadPayments() {

    if (tableBody) {

      tableBody.innerHTML = `
        <tr>
          <td colspan="9">
            Loading payments...
          </td>
        </tr>
      `;
    }

    const {
      data,
      error
    } =
      await db
        .from("payments")
        .select(`
          id,
          customer_id,
          job_id,
          estimate_id,
          amount,
          method,
          status,
          external_reference,
          paid_at,
          received_at,
          notes,
          created_by,
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

    payments =
      data || [];

    updateStatistics();
    renderPayments();
  }


  /* ======================================================
     STATISTICS
  ====================================================== */

  function updateStatistics() {

    const totalCollected =
      payments
        .filter(
          payment =>
            payment.status ===
            "paid"
        )
        .reduce(
          (
            total,
            payment
          ) =>
            total +
            numberValue(
              payment.amount
            ),
          0
        );

    if (totalCollectedAmount) {

      totalCollectedAmount.textContent =
        money(totalCollected);
    }

    if (paidPaymentCount) {

      paidPaymentCount.textContent =
        payments.filter(
          payment =>
            payment.status ===
            "paid"
        ).length;
    }

    if (pendingPaymentCount) {

      pendingPaymentCount.textContent =
        payments.filter(
          payment =>
            payment.status ===
            "pending"
        ).length;
    }

    if (refundedPaymentCount) {

      refundedPaymentCount.textContent =
        payments.filter(
          payment =>
            [
              "refunded",
              "partially_refunded"
            ].includes(
              payment.status
            )
        ).length;
    }
  }


  /* ======================================================
     FILTERING
  ====================================================== */

  function getFilteredPayments() {

    const search =
      String(
        paymentSearch?.value ||
        ""
      )
        .trim()
        .toLowerCase();

    const status =
      paymentStatusFilter?.value ||
      "";

    const method =
      paymentMethodFilter?.value ||
      "";

    return payments.filter(
      payment => {

        if (
          status &&
          payment.status !== status
        ) {
          return false;
        }

        if (
          method &&
          payment.method !== method
        ) {
          return false;
        }

        if (!search) {
          return true;
        }

        const customer =
          getCustomerById(
            payment.customer_id
          );

        const job =
          getJobById(
            payment.job_id
          );

        const haystack =
          [
            fullName(customer),
            customer?.phone,
            customer?.email,
            job?.job_number,
            payment.external_reference,
            payment.method,
            payment.status,
            payment.amount
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
     RENDER PAYMENTS
  ====================================================== */

  function renderPayments() {

    if (!tableBody) {
      return;
    }

    const filtered =
      getFilteredPayments();

    if (resultCount) {

      resultCount.textContent =
        `${filtered.length} ${
          filtered.length === 1
            ? "payment"
            : "payments"
        }`;
    }

    if (!filtered.length) {

      tableBody.innerHTML = `
        <tr>
          <td colspan="9">
            No payments found.
          </td>
        </tr>
      `;

      return;
    }

    tableBody.innerHTML =
      filtered
        .map(
          payment => {

            const customer =
              getCustomerById(
                payment.customer_id
              );

            const job =
              getJobById(
                payment.job_id
              );

            const primaryDate =
              payment.received_at ||
              payment.paid_at;

            return `

              <tr>

                <td>

                  <strong>
                    ${escapeHTML(
                      fullName(customer)
                    )}
                  </strong>

                  <div class="admin-table-muted">
                    ${escapeHTML(
                      customer?.phone ||
                      ""
                    )}
                  </div>

                </td>


                <td>

                  ${
                    job
                      ? `
                        <button
                          type="button"
                          class="admin-table-action"
                          data-open-job="${escapeHTML(
                            job.id
                          )}"
                        >
                          ${escapeHTML(
                            job.job_number
                          )}
                        </button>
                      `
                      : "—"
                  }

                </td>


                <td>

                  <strong>
                    ${money(
                      payment.amount
                    )}
                  </strong>

                </td>


                <td>

                  ${escapeHTML(
                    methodLabel(
                      payment.method
                    )
                  )}

                </td>


                <td>

                  <span
                    class="
                      admin-status
                      status-${escapeHTML(
                        String(
                          payment.status ||
                          ""
                        )
                          .replaceAll(
                            "_",
                            "-"
                          )
                      )}
                    "
                  >
                    ${escapeHTML(
                      statusLabel(
                        payment.status
                      )
                    )}
                  </span>

                </td>


                <td>

                  ${escapeHTML(
                    formatDateTime(
                      primaryDate
                    )
                  )}

                </td>


                <td>

                  ${escapeHTML(
                    payment.external_reference ||
                    "—"
                  )}

                </td>


                <td>

                  ${escapeHTML(
                    formatDate(
                      payment.created_at
                    )
                  )}

                </td>


                <td>

                  <button
                    type="button"
                    class="admin-table-action"
                    data-view-payment="${escapeHTML(
                      payment.id
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
     JOB PAYMENT TOTAL
  ====================================================== */

  function getPaidTotalForJob(
    jobId,
    excludePaymentId = null
  ) {

    return payments
      .filter(
        payment => {

          if (
            String(
              payment.job_id
            ) !==
            String(jobId)
          ) {
            return false;
          }

          if (
            excludePaymentId &&
            String(
              payment.id
            ) ===
            String(
              excludePaymentId
            )
          ) {
            return false;
          }

          return payment.status ===
            "paid";
        }
      )
      .reduce(
        (
          total,
          payment
        ) =>
          total +
          numberValue(
            payment.amount
          ),
        0
      );
  }


  async function syncJobPaymentTotals(
    jobId
  ) {

    if (!jobId) {
      return;
    }

    const job =
      getJobById(jobId);

    if (!job) {
      return;
    }

    const {
      data,
      error
    } =
      await db
        .from("payments")
        .select(`
          id,
          amount,
          status
        `)
        .eq(
          "job_id",
          jobId
        );

    if (error) {
      throw error;
    }

    const paidTotal =
      (data || [])
        .filter(
          payment =>
            payment.status ===
            "paid"
        )
        .reduce(
          (
            total,
            payment
          ) =>
            total +
            numberValue(
              payment.amount
            ),
          0
        );

    const total =
      numberValue(
        job.total_amount
      );

    const balance =
      Math.max(
        0,
        total -
        paidTotal
      );

    let paymentStatus =
      "UNPAID";

    if (
      paidTotal > 0 &&
      balance > 0
    ) {

      paymentStatus =
        "PARTIAL";
    }

    if (
      total > 0 &&
      paidTotal >= total
    ) {

      paymentStatus =
        "PAID";
    }

    const {
      error: updateError
    } =
      await db
        .from("jobs")
        .update({
          amount_paid:
            paidTotal,

          balance_due:
            balance,

          payment_status:
            paymentStatus
        })
        .eq(
          "id",
          jobId
        );

    if (updateError) {
      throw updateError;
    }

    const localJob =
      jobs.find(
        item =>
          String(item.id) ===
          String(jobId)
      );

    if (localJob) {

      localJob.amount_paid =
        paidTotal;

      localJob.balance_due =
        balance;

      localJob.payment_status =
        paymentStatus;
    }
  }


  /* ======================================================
     PAYMENT BALANCE PREVIEW
  ====================================================== */

  function updateJobBalancePreview() {

    const jobId =
      jobSelect?.value;

    const job =
      getJobById(jobId);

    if (
      !job ||
      !paymentJobSummary
    ) {

      if (paymentJobSummary) {
        paymentJobSummary.hidden =
          true;
      }

      return;
    }

    paymentJobSummary.hidden =
      false;

    const editingPaymentId =
      paymentIdInput?.value ||
      null;

    const currentlyPaid =
      getPaidTotalForJob(
        job.id,
        editingPaymentId
      );

    const currentBalance =
      Math.max(
        0,
        numberValue(
          job.total_amount
        ) -
        currentlyPaid
      );

    const paymentAmount =
      numberValue(
        amountInput?.value
      );

    const paymentWillCount =
      statusInput?.value ===
      "paid";

    const newPaidTotal =
      currentlyPaid +
      (
        paymentWillCount
          ? paymentAmount
          : 0
      );

    const newBalance =
      Math.max(
        0,
        numberValue(
          job.total_amount
        ) -
        newPaidTotal
      );

    if (paymentJobTotal) {

      paymentJobTotal.textContent =
        money(
          job.total_amount
        );
    }

    if (paymentJobPaid) {

      paymentJobPaid.textContent =
        money(
          currentlyPaid
        );
    }

    if (paymentJobBalance) {

      paymentJobBalance.textContent =
        money(
          currentBalance
        );
    }

    if (paymentNewBalance) {

      paymentNewBalance.textContent =
        money(
          newBalance
        );
    }
  }


  /* ======================================================
     CUSTOMER CHANGE
  ====================================================== */

  function handleCustomerChange() {

    populateJobSelect();
    populateEstimateSelect();

    updateJobBalancePreview();
  }


  /* ======================================================
     JOB CHANGE
  ====================================================== */

  function handleJobChange() {

    const job =
      getJobById(
        jobSelect?.value
      );

    if (
      job &&
      customerSelect
    ) {

      customerSelect.value =
        job.customer_id;

      populateEstimateSelect();
    }

    updateJobBalancePreview();
  }


  /* ======================================================
     ESTIMATE CHANGE
  ====================================================== */

  function handleEstimateChange() {

    const estimate =
      getEstimateById(
        estimateSelect?.value
      );

    if (
      estimate &&
      customerSelect
    ) {

      customerSelect.value =
        estimate.customer_id;

      populateJobSelect();
    }
  }


  /* ======================================================
     RESET FORM
  ====================================================== */

  function resetPaymentForm() {

    paymentForm?.reset();

    currentPayment =
      null;

    if (paymentIdInput) {
      paymentIdInput.value =
        "";
    }

    if (paymentModalTitle) {

      paymentModalTitle.textContent =
        "Record Payment";
    }

    if (paymentModalSubtitle) {

      paymentModalSubtitle.textContent =
        "Add a customer payment to the CRM.";
    }

    if (statusInput) {

      statusInput.value =
        "pending";
    }

    const now =
      new Date();

    if (receivedAtInput) {

      receivedAtInput.value =
        localDateTimeInput(
          now
        );
    }

    clearFormError();

    populateJobSelect();
    populateEstimateSelect();

    updateJobBalancePreview();
  }


  /* ======================================================
     OPEN / CLOSE PAYMENT MODAL
  ====================================================== */

  function openNewPayment() {

    resetPaymentForm();

    const params =
      new URLSearchParams(
        window.location.search
      );

    const customerId =
      params.get(
        "customer_id"
      );

    const jobId =
      params.get(
        "job_id"
      );

    const estimateId =
      params.get(
        "estimate_id"
      );

    if (
      customerId &&
      customerSelect
    ) {

      customerSelect.value =
        customerId;
    }

    populateJobSelect();
    populateEstimateSelect();

    if (
      jobId &&
      jobSelect
    ) {

      jobSelect.value =
        jobId;

      handleJobChange();
    }

    if (
      estimateId &&
      estimateSelect
    ) {

      estimateSelect.value =
        estimateId;

      handleEstimateChange();
    }

    if (paymentModal) {
      paymentModal.hidden =
        false;
    }

    document.body.style.overflow =
      "hidden";
  }


  function closePaymentModal() {

    if (paymentModal) {
      paymentModal.hidden =
        true;
    }

    document.body.style.overflow =
      "";
  }


  /* ======================================================
     EDIT PAYMENT
  ====================================================== */

  function editPayment(payment) {

    currentPayment =
      payment;

    clearFormError();

    if (paymentIdInput) {

      paymentIdInput.value =
        payment.id;
    }

    if (paymentModalTitle) {

      paymentModalTitle.textContent =
        "Edit Payment";
    }

    if (paymentModalSubtitle) {

      paymentModalSubtitle.textContent =
        money(
          payment.amount
        );
    }

    if (customerSelect) {

      customerSelect.value =
        payment.customer_id ||
        "";
    }

    populateJobSelect();
    populateEstimateSelect();

    if (jobSelect) {

      jobSelect.value =
        payment.job_id ||
        "";
    }

    if (estimateSelect) {

      estimateSelect.value =
        payment.estimate_id ||
        "";
    }

    if (amountInput) {

      amountInput.value =
        payment.amount ??
        "";
    }

    if (methodInput) {

      methodInput.value =
        payment.method ||
        "";
    }

    if (statusInput) {

      statusInput.value =
        payment.status ||
        "pending";
    }

    if (paidAtInput) {

      paidAtInput.value =
        localDateTimeInput(
          payment.paid_at
        );
    }

    if (receivedAtInput) {

      receivedAtInput.value =
        localDateTimeInput(
          payment.received_at
        );
    }

    if (externalReferenceInput) {

      externalReferenceInput.value =
        payment.external_reference ||
        "";
    }

    if (notesInput) {

      notesInput.value =
        payment.notes ||
        "";
    }

    updateJobBalancePreview();

    closeViewPayment();

    if (paymentModal) {
      paymentModal.hidden =
        false;
    }

    document.body.style.overflow =
      "hidden";
  }


  /* ======================================================
     SAVE PAYMENT
  ====================================================== */

  async function savePayment(event) {

    event.preventDefault();

    clearFormError();

    if (
      !paymentForm?.checkValidity()
    ) {

      paymentForm.reportValidity();

      return;
    }

    savePaymentButton.disabled =
      true;

    savePaymentButton.textContent =
      "Saving...";

    try {

      const formData =
        new FormData(
          paymentForm
        );

      const existingPaymentId =
        paymentIdInput?.value ||
        null;

      const oldPayment =
        existingPaymentId
          ? payments.find(
              payment =>
                String(payment.id) ===
                String(
                  existingPaymentId
                )
            )
          : null;

      const payload = {

        customer_id:
          clean(
            formData.get(
              "customer_id"
            )
          ),

        job_id:
          clean(
            formData.get(
              "job_id"
            )
          ),

        estimate_id:
          clean(
            formData.get(
              "estimate_id"
            )
          ),

        amount:
          numberValue(
            formData.get(
              "amount"
            )
          ),

        method:
          clean(
            formData.get(
              "method"
            )
          ),

        status:
          clean(
            formData.get(
              "status"
            )
          ) ||
          "pending",

        external_reference:
          clean(
            formData.get(
              "external_reference"
            )
          ),

        paid_at:
          toISOStringOrNull(
            formData.get(
              "paid_at"
            )
          ),

        received_at:
          toISOStringOrNull(
            formData.get(
              "received_at"
            )
          ),

        notes:
          clean(
            formData.get(
              "notes"
            )
          )
      };

      if (
        payload.status ===
        "paid" &&
        !payload.paid_at
      ) {

        payload.paid_at =
          new Date()
            .toISOString();
      }

      let query;

      if (existingPaymentId) {

        query =
          db
            .from("payments")
            .update(payload)
            .eq(
              "id",
              existingPaymentId
            )
            .select()
            .single();

      } else {

        query =
          db
            .from("payments")
            .insert({
              ...payload,

              created_by:
                currentAdminUser?.id ||
                null
            })
            .select()
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

      const affectedJobIds =
        new Set();

      if (oldPayment?.job_id) {

        affectedJobIds.add(
          oldPayment.job_id
        );
      }

      if (saved?.job_id) {

        affectedJobIds.add(
          saved.job_id
        );
      }

      await loadPayments();

      for (
        const jobId of
        affectedJobIds
      ) {

        await syncJobPaymentTotals(
          jobId
        );
      }

      await loadJobs();

      closePaymentModal();

      const refreshed =
        payments.find(
          payment =>
            String(payment.id) ===
            String(saved.id)
        );

      if (refreshed) {

        openViewPayment(
          refreshed
        );
      }

    } catch (error) {

      console.error(
        "Save payment error:",
        error
      );

      showFormError(
        error?.message ||
        "Payment could not be saved."
      );

    } finally {

      savePaymentButton.disabled =
        false;

      savePaymentButton.textContent =
        "Save Payment";
    }
  }


  /* ======================================================
     VIEW PAYMENT
  ====================================================== */

  function openViewPayment(payment) {

    currentPayment =
      payment;

    const customer =
      getCustomerById(
        payment.customer_id
      );

    const job =
      getJobById(
        payment.job_id
      );

    const estimate =
      getEstimateById(
        payment.estimate_id
      );

    if (viewPaymentAmount) {

      viewPaymentAmount.textContent =
        money(
          payment.amount
        );
    }

    if (viewPaymentCustomer) {

      viewPaymentCustomer.textContent =
        fullName(customer);
    }

    if (viewPaymentContent) {

      viewPaymentContent.innerHTML = `

        <div class="admin-job-detail-grid">

          ${detailHTML(
            "Status",
            statusLabel(
              payment.status
            )
          )}

          ${detailHTML(
            "Method",
            methodLabel(
              payment.method
            )
          )}

          ${detailHTML(
            "Customer",
            fullName(
              customer
            )
          )}

          ${detailHTML(
            "Job",
            job?.job_number
          )}

          ${detailHTML(
            "Estimate",
            estimate
              ? `EST-${estimate.estimate_number}`
              : null
          )}

          ${detailHTML(
            "Reference",
            payment.external_reference
          )}

          ${detailHTML(
            "Paid At",
            formatDateTime(
              payment.paid_at
            )
          )}

          ${detailHTML(
            "Received At",
            formatDateTime(
              payment.received_at
            )
          )}

          ${detailHTML(
            "Created",
            formatDateTime(
              payment.created_at
            )
          )}

          ${detailHTML(
            "Notes",
            payment.notes,
            true
          )}

        </div>
      `;
    }

    if (markPaymentPaidButton) {

      markPaymentPaidButton.hidden =
        payment.status ===
        "paid";
    }

    if (viewPaymentJobButton) {

      viewPaymentJobButton.hidden =
        !payment.job_id;
    }

    if (viewPaymentModal) {

      viewPaymentModal.hidden =
        false;
    }

    document.body.style.overflow =
      "hidden";
  }


  function closeViewPayment() {

    if (viewPaymentModal) {

      viewPaymentModal.hidden =
        true;
    }

    document.body.style.overflow =
      "";
  }


  /* ======================================================
     MARK PAYMENT PAID
  ====================================================== */

  async function markCurrentPaymentPaid() {

    if (!currentPayment) {
      return;
    }

    const confirmed =
      window.confirm(
        `Mark this ${money(
          currentPayment.amount
        )} payment as paid?`
      );

    if (!confirmed) {
      return;
    }

    markPaymentPaidButton.disabled =
      true;

    try {

      const {
        data,
        error
      } =
        await db
          .from("payments")
          .update({
            status:
              "paid",

            paid_at:
              currentPayment.paid_at ||
              new Date()
                .toISOString(),

            received_at:
              currentPayment.received_at ||
              new Date()
                .toISOString()
          })
          .eq(
            "id",
            currentPayment.id
          )
          .select()
          .single();

      if (error) {
        throw error;
      }

      await loadPayments();

      if (data.job_id) {

        await syncJobPaymentTotals(
          data.job_id
        );

        await loadJobs();
      }

      const refreshed =
        payments.find(
          payment =>
            String(payment.id) ===
            String(data.id)
        );

      if (refreshed) {

        openViewPayment(
          refreshed
        );
      }

    } catch (error) {

      console.error(
        "Mark payment paid error:",
        error
      );

      alert(
        error?.message ||
        "Payment could not be marked paid."
      );

    } finally {

      markPaymentPaidButton.disabled =
        false;
    }
  }


  /* ======================================================
     EVENTS
  ====================================================== */

  paymentSearch
    ?.addEventListener(
      "input",
      renderPayments
    );

  paymentStatusFilter
    ?.addEventListener(
      "change",
      renderPayments
    );

  paymentMethodFilter
    ?.addEventListener(
      "change",
      renderPayments
    );

  newPaymentButton
    ?.addEventListener(
      "click",
      openNewPayment
    );

  closePaymentModalButton
    ?.addEventListener(
      "click",
      closePaymentModal
    );

  cancelPaymentButton
    ?.addEventListener(
      "click",
      closePaymentModal
    );

  paymentModalBackdrop
    ?.addEventListener(
      "click",
      closePaymentModal
    );

  paymentForm
    ?.addEventListener(
      "submit",
      savePayment
    );

  customerSelect
    ?.addEventListener(
      "change",
      handleCustomerChange
    );

  jobSelect
    ?.addEventListener(
      "change",
      handleJobChange
    );

  estimateSelect
    ?.addEventListener(
      "change",
      handleEstimateChange
    );

  amountInput
    ?.addEventListener(
      "input",
      updateJobBalancePreview
    );

  statusInput
    ?.addEventListener(
      "change",
      updateJobBalancePreview
    );


  tableBody
    ?.addEventListener(
      "click",
      event => {

        const viewButton =
          event.target.closest(
            "[data-view-payment]"
          );

        if (viewButton) {

          const payment =
            payments.find(
              item =>
                String(item.id) ===
                String(
                  viewButton.dataset
                    .viewPayment
                )
            );

          if (payment) {

            openViewPayment(
              payment
            );
          }

          return;
        }

        const jobButton =
          event.target.closest(
            "[data-open-job]"
          );

        if (jobButton) {

          window.location.href =
            `jobs.html?id=${encodeURIComponent(
              jobButton.dataset.openJob
            )}`;
        }
      }
    );


  closeViewPaymentButton
    ?.addEventListener(
      "click",
      closeViewPayment
    );

  viewPaymentBackdrop
    ?.addEventListener(
      "click",
      closeViewPayment
    );

  editPaymentButton
    ?.addEventListener(
      "click",
      () => {

        if (currentPayment) {

          editPayment(
            currentPayment
          );
        }
      }
    );

  markPaymentPaidButton
    ?.addEventListener(
      "click",
      markCurrentPaymentPaid
    );

  viewPaymentJobButton
    ?.addEventListener(
      "click",
      () => {

        if (
          !currentPayment?.job_id
        ) {
          return;
        }

        window.location.href =
          `jobs.html?id=${encodeURIComponent(
            currentPayment.job_id
          )}`;
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

      openNewPayment();

      return;
    }

    const paymentId =
      params.get(
        "id"
      );

    if (!paymentId) {
      return;
    }

    const payment =
      payments.find(
        item =>
          String(item.id) ===
          String(paymentId)
      );

    if (payment) {

      openViewPayment(
        payment
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
      loadJobs(),
      loadEstimates()
    ]);

    await loadPayments();

    await processURLActions();

  } catch (error) {

    console.error(
      "Metro Haul Payments initialization error:",
      error
    );

    if (tableBody) {

      tableBody.innerHTML = `
        <tr>
          <td colspan="9">
            Payments could not be loaded.
            Check the browser console.
          </td>
        </tr>
      `;
    }
  }

});
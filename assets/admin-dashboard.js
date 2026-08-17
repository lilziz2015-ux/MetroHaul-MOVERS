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
      "Metro Haul Supabase client is unavailable. Load supabase.js before admin-dashboard.js."
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

  const VALID_JOB_STATUSES = new Set([
    "DRAFT",
    "ESTIMATE",
    "SCHEDULED",
    "CONFIRMED",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED"
  ]);

  const VALID_PAYMENT_STATUSES = new Set([
    "pending",
    "paid",
    "failed",
    "refunded",
    "partially_refunded"
  ]);


  /* ======================================================
     ELEMENTS
  ====================================================== */

  const greeting =
    document.getElementById("dashboardGreeting");

  const newLeadsCount =
    document.getElementById("dashboardNewLeads");

  const upcomingJobsCount =
    document.getElementById("dashboardUpcomingJobs");

  const collectedAmount =
    document.getElementById("dashboardCollected");

  const outstandingAmount =
    document.getElementById("dashboardOutstanding");

  const customerCount =
    document.getElementById("dashboardCustomerCount");

  const estimateCount =
    document.getElementById("dashboardEstimateCount");

  const activeJobsCount =
    document.getElementById("dashboardActiveJobs");

  const activeCrewCount =
    document.getElementById("dashboardActiveCrew");

  const todaySubtitle =
    document.getElementById("dashboardTodaySubtitle");

  const todayJobsList =
    document.getElementById("dashboardTodayJobs");

  const leadList =
    document.getElementById("dashboardLeadList");

  const upcomingTable =
    document.getElementById("dashboardUpcomingTable");

  const paymentList =
    document.getElementById("dashboardPaymentList");

  const crewList =
    document.getElementById("dashboardCrewList");

  const newLeadButton =
    document.getElementById("dashboardNewLeadButton");

  const newEstimateButton =
    document.getElementById("dashboardNewEstimateButton");

  const newJobButton =
    document.getElementById("dashboardNewJobButton");


  /* ======================================================
     STATE
  ====================================================== */

  let leads = [];
  let customers = [];
  let estimates = [];
  let jobs = [];
  let payments = [];
  let crewMembers = [];

  let adminProfile = null;


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


  function numberValue(value) {
    const number =
      Number(value);

    return Number.isFinite(number)
      ? number
      : 0;
  }


  function money(value) {
    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency: "USD"
      }
    ).format(
      numberValue(value)
    );
  }


  function fullName(record) {
    return [
      record?.first_name,
      record?.last_name
    ]
      .filter(Boolean)
      .join(" ") ||
      record?.company_name ||
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


  function crewName(member) {
    return [
      member?.first_name,
      member?.last_name
    ]
      .filter(Boolean)
      .join(" ") ||
      "Crew Member";
  }


  function initials(record) {
    const value =
      [
        record?.first_name,
        record?.last_name
      ]
        .filter(Boolean)
        .slice(0, 2)
        .map(
          part =>
            String(part)
              .charAt(0)
              .toUpperCase()
        )
        .join("");

    return value || "MH";
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

    return labels[value] ||
      value ||
      "—";
  }


  function roleLabel(value) {
    const labels = {
      mover:
        "Mover",

      driver:
        "Driver",

      crew_lead:
        "Crew Lead",

      dispatcher:
        "Dispatcher",

      manager:
        "Manager"
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


  function paymentMethodLabel(value) {
    const labels = {
      cash: "Cash",
      card: "Card",
      zelle: "Zelle",
      check: "Check",
      ach: "ACH",
      other: "Other"
    };

    return labels[value] ||
      statusLabel(value) ||
      "Payment";
  }


  function parseLocalDate(value) {
    if (!value) {
      return null;
    }

    const raw =
      String(value)
        .slice(0, 10);

    const parts =
      raw
        .split("-")
        .map(Number);

    if (
      parts.length !== 3 ||
      !parts[0] ||
      !parts[1] ||
      !parts[2]
    ) {
      return null;
    }

    return new Date(
      parts[0],
      parts[1] - 1,
      parts[2]
    );
  }


  function toDateKey(date) {
    const year =
      date.getFullYear();

    const month =
      String(
        date.getMonth() + 1
      ).padStart(
        2,
        "0"
      );

    const day =
      String(
        date.getDate()
      ).padStart(
        2,
        "0"
      );

    return `${year}-${month}-${day}`;
  }


  function todayKey() {
    return toDateKey(
      new Date()
    );
  }


  function formatDate(value) {
    const date =
      parseLocalDate(
        value
      );

    if (!date) {
      return "—";
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


  function formatShortDate(value) {
    const date =
      parseLocalDate(
        value
      );

    if (!date) {
      return "—";
    }

    return date.toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric"
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
        hour: "numeric",
        minute: "2-digit"
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
      hour,
      minute
    ] =
      raw
        .split(":")
        .map(Number);

    if (
      !Number.isFinite(hour) ||
      !Number.isFinite(minute)
    ) {
      return raw;
    }

    const date =
      new Date();

    date.setHours(
      hour,
      minute,
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


  function isToday(value) {
    return String(
      value || ""
    )
      .slice(0, 10) ===
      todayKey();
  }


  function isUpcoming(value) {
    const date =
      parseLocalDate(
        value
      );

    if (!date) {
      return false;
    }

    const today =
      new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    return date >= today;
  }


  function getCustomerById(id) {
    if (!id) {
      return null;
    }

    return customers.find(
      customer =>
        String(customer.id) ===
        String(id)
    ) || null;
  }


  /* ======================================================
     AUTH
  ====================================================== */

  async function waitForAdminAccess() {
    if (
      window.MetroHaulAdmin
        ?.isAuthenticated
    ) {
      return window.MetroHaulAdmin;
    }

    return new Promise(
      resolve => {
        let finished = false;

        function finish(admin) {
          if (finished) {
            return;
          }

          finished = true;

          resolve(admin);
        }

        document.addEventListener(
          "metrohaul:admin-ready",
          () => {
            const admin =
              window.MetroHaulAdmin;

            finish(
              admin?.isAuthenticated
                ? admin
                : null
            );
          },
          {
            once: true
          }
        );

        setTimeout(
          () => {
            const admin =
              window.MetroHaulAdmin;

            finish(
              admin?.isAuthenticated
                ? admin
                : null
            );
          },
          5000
        );
      }
    );
  }


  /* ======================================================
     GREETING
  ====================================================== */

  function renderGreeting() {
    if (!greeting) {
      return;
    }

    const firstName =
      adminProfile?.full_name
        ? String(
            adminProfile.full_name
          )
            .trim()
            .split(/\s+/)[0]
        : "";

    greeting.textContent =
      firstName
        ? `Welcome back, ${firstName}. Here's what needs attention.`
        : "Here's what needs attention across Metro Haul.";
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
          pickup_city,
          pickup_state,
          destination_city,
          destination_state,
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

    leads.forEach(
      lead => {
        if (
          !VALID_LEAD_STATUSES.has(
            lead.status
          )
        ) {
          console.warn(
            "Unexpected lead status:",
            lead.status
          );
        }

        if (
          lead.service_type &&
          !VALID_SERVICE_TYPES.has(
            lead.service_type
          )
        ) {
          console.warn(
            "Unexpected lead service type:",
            lead.service_type
          );
        }
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
          company_name,
          phone,
          email,
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

    estimates =
      data || [];
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
          service_type,
          job_status,
          move_date,
          arrival_time,
          pickup_city,
          pickup_state,
          pickup_address,
          destination_city,
          destination_state,
          destination_address,
          total_amount,
          amount_paid,
          balance_due,
          payment_status,

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

    jobs.forEach(
      job => {
        if (
          !VALID_JOB_STATUSES.has(
            job.job_status
          )
        ) {
          console.warn(
            "Unexpected job status:",
            job.job_status
          );
        }

        if (
          job.service_type &&
          !VALID_SERVICE_TYPES.has(
            job.service_type
          )
        ) {
          console.warn(
            "Unexpected job service type:",
            job.service_type
          );
        }
      }
    );
  }


  /* ======================================================
     LOAD PAYMENTS
  ====================================================== */

  async function loadPayments() {
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
          paid_at,
          received_at,
          external_reference,
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

    payments.forEach(
      payment => {
        if (
          !VALID_PAYMENT_STATUSES.has(
            payment.status
          )
        ) {
          console.warn(
            "Unexpected payment status:",
            payment.status
          );
        }
      }
    );
  }


  /* ======================================================
     LOAD CREW
  ====================================================== */

  async function loadCrew() {
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
          role,
          phone,
          email,
          active
        `)
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
  }


  /* ======================================================
     MAIN STATS
  ====================================================== */

  function renderStats() {
    const newLeads =
      leads.filter(
        lead =>
          lead.status ===
          "new"
      );

    const upcomingJobs =
      jobs.filter(
        job =>
          isUpcoming(
            job.move_date
          ) &&
          ![
            "COMPLETED",
            "CANCELLED"
          ].includes(
            job.job_status
          )
      );

    const collected =
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

    const outstanding =
      jobs
        .filter(
          job =>
            job.job_status !==
            "CANCELLED"
        )
        .reduce(
          (
            total,
            job
          ) =>
            total +
            Math.max(
              0,
              numberValue(
                job.balance_due
              )
            ),
          0
        );

    const activeJobs =
      jobs.filter(
        job =>
          job.job_status ===
          "IN_PROGRESS"
      );

    const activeCrew =
      crewMembers.filter(
        member =>
          member.active === true
      );

    if (newLeadsCount) {
      newLeadsCount.textContent =
        String(
          newLeads.length
        );
    }

    if (upcomingJobsCount) {
      upcomingJobsCount.textContent =
        String(
          upcomingJobs.length
        );
    }

    if (collectedAmount) {
      collectedAmount.textContent =
        money(
          collected
        );
    }

    if (outstandingAmount) {
      outstandingAmount.textContent =
        money(
          outstanding
        );
    }

    if (customerCount) {
      customerCount.textContent =
        String(
          customers.length
        );
    }

    if (estimateCount) {
      estimateCount.textContent =
        String(
          estimates.length
        );
    }

    if (activeJobsCount) {
      activeJobsCount.textContent =
        String(
          activeJobs.length
        );
    }

    if (activeCrewCount) {
      activeCrewCount.textContent =
        String(
          activeCrew.length
        );
    }
  }


  /* ======================================================
     TODAY'S JOBS
  ====================================================== */

  function renderTodayJobs() {
    if (!todayJobsList) {
      return;
    }

    const todayJobs =
      jobs
        .filter(
          job =>
            isToday(
              job.move_date
            ) &&
            job.job_status !==
            "CANCELLED"
        )
        .sort(
          (a, b) =>
            String(
              a.arrival_time ||
              "99:99"
            ).localeCompare(
              String(
                b.arrival_time ||
                "99:99"
              )
            )
        );

    if (todaySubtitle) {
      todaySubtitle.textContent =
        `${todayJobs.length} ${
          todayJobs.length === 1
            ? "job"
            : "jobs"
        } scheduled today`;
    }

    if (!todayJobs.length) {
      todayJobsList.innerHTML = `
        <div class="admin-dashboard-empty">
          No jobs scheduled today.
        </div>
      `;

      return;
    }

    todayJobsList.innerHTML =
      todayJobs
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
              "Pickup";

            const destination =
              [
                job.destination_city,
                job.destination_state
              ]
                .filter(Boolean)
                .join(", ") ||
              job.destination_address ||
              "Destination";

            return `
              <button
                type="button"
                class="admin-dashboard-row"
                data-job-id="${escapeHTML(
                  job.id
                )}"
              >

                <div class="admin-dashboard-row-main">

                  <div class="admin-dashboard-row-title">

                    <strong>
                      ${escapeHTML(
                        fullName(
                          job.customer
                        )
                      )}
                    </strong>

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

                  </div>


                  <p>
                    ${escapeHTML(
                      job.job_number
                    )}
                    •
                    ${escapeHTML(
                      formatTime(
                        job.arrival_time
                      )
                    )}
                  </p>


                  <p>
                    ${escapeHTML(
                      pickup
                    )}
                    →
                    ${escapeHTML(
                      destination
                    )}
                  </p>

                </div>


                <div class="admin-dashboard-row-value">

                  <strong>
                    ${escapeHTML(
                      money(
                        job.total_amount
                      )
                    )}
                  </strong>

                  <span>
                    ${escapeHTML(
                      money(
                        job.balance_due
                      )
                    )} due
                  </span>

                </div>

              </button>
            `;
          }
        )
        .join("");
  }


  /* ======================================================
     NEW LEADS
  ====================================================== */

  function renderLeads() {
    if (!leadList) {
      return;
    }

    const recentLeads =
      leads
        .filter(
          lead =>
            lead.status ===
            "new"
        )
        .slice(
          0,
          6
        );

    if (!recentLeads.length) {
      leadList.innerHTML = `
        <div class="admin-dashboard-empty">
          No new leads waiting.
        </div>
      `;

      return;
    }

    leadList.innerHTML =
      recentLeads
        .map(
          lead => {
            const route =
              [
                [
                  lead.pickup_city,
                  lead.pickup_state
                ]
                  .filter(Boolean)
                  .join(", "),

                [
                  lead.destination_city,
                  lead.destination_state
                ]
                  .filter(Boolean)
                  .join(", ")
              ]
                .filter(Boolean)
                .join(" → ");

            return `
              <button
                type="button"
                class="admin-dashboard-row"
                data-lead-id="${escapeHTML(
                  lead.id
                )}"
              >

                <div class="admin-dashboard-avatar">
                  ${escapeHTML(
                    initials(
                      lead
                    )
                  )}
                </div>


                <div class="admin-dashboard-row-main">

                  <strong>
                    ${escapeHTML(
                      leadName(
                        lead
                      )
                    )}
                  </strong>

                  <p>
                    ${escapeHTML(
                      serviceLabel(
                        lead.service_type
                      )
                    )}
                  </p>

                  <p>
                    ${
                      route
                        ? escapeHTML(
                            route
                          )
                        : "Route not provided"
                    }
                  </p>

                </div>


                <div class="admin-dashboard-row-value">

                  <strong>
                    ${
                      lead.move_date
                        ? escapeHTML(
                            formatShortDate(
                              lead.move_date
                            )
                          )
                        : "No date"
                    }
                  </strong>

                  <span>
                    ${escapeHTML(
                      formatDateTime(
                        lead.created_at
                      )
                    )}
                  </span>

                </div>

              </button>
            `;
          }
        )
        .join("");
  }


  /* ======================================================
     UPCOMING JOBS
  ====================================================== */

  function renderUpcomingJobs() {
    if (!upcomingTable) {
      return;
    }

    const upcoming =
      jobs
        .filter(
          job =>
            isUpcoming(
              job.move_date
            ) &&
            ![
              "COMPLETED",
              "CANCELLED"
            ].includes(
              job.job_status
            )
        )
        .sort(
          (a, b) => {
            const dateA =
              parseLocalDate(
                a.move_date
              );

            const dateB =
              parseLocalDate(
                b.move_date
              );

            if (
              dateA &&
              dateB &&
              dateA.getTime() !==
                dateB.getTime()
            ) {
              return (
                dateA.getTime() -
                dateB.getTime()
              );
            }

            return String(
              a.arrival_time ||
              "99:99"
            ).localeCompare(
              String(
                b.arrival_time ||
                "99:99"
              )
            );
          }
        )
        .slice(
          0,
          10
        );

    if (!upcoming.length) {
      upcomingTable.innerHTML = `
        <tr>
          <td colspan="8">
            No upcoming jobs.
          </td>
        </tr>
      `;

      return;
    }

    upcomingTable.innerHTML =
      upcoming
        .map(
          job => `
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
                    job.customer
                      ?.phone ||
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

                <div class="admin-table-muted">
                  ${escapeHTML(
                    formatTime(
                      job.arrival_time
                    )
                  )}
                </div>
              </td>


              <td>
                ${escapeHTML(
                  serviceLabel(
                    job.service_type
                  )
                )}
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
                  ${escapeHTML(
                    money(
                      job.total_amount
                    )
                  )}
                </strong>
              </td>


              <td>
                ${escapeHTML(
                  money(
                    job.balance_due
                  )
                )}
              </td>


              <td>
                <button
                  type="button"
                  class="admin-table-action"
                  data-job-id="${escapeHTML(
                    job.id
                  )}"
                >
                  View
                </button>
              </td>

            </tr>
          `
        )
        .join("");
  }


  /* ======================================================
     RECENT PAYMENTS
  ====================================================== */

  function renderPayments() {
    if (!paymentList) {
      return;
    }

    const recent =
      payments.slice(
        0,
        6
      );

    if (!recent.length) {
      paymentList.innerHTML = `
        <div class="admin-dashboard-empty">
          No payment records yet.
        </div>
      `;

      return;
    }

    paymentList.innerHTML =
      recent
        .map(
          payment => {
            const customer =
              getCustomerById(
                payment.customer_id
              );

            return `
              <button
                type="button"
                class="admin-dashboard-row"
                data-payment-id="${escapeHTML(
                  payment.id
                )}"
              >

                <div class="admin-dashboard-avatar">
                  ${escapeHTML(
                    initials(
                      customer
                    )
                  )}
                </div>


                <div class="admin-dashboard-row-main">

                  <div class="admin-dashboard-row-title">

                    <strong>
                      ${escapeHTML(
                        fullName(
                          customer
                        )
                      )}
                    </strong>


                    <span
                      class="
                        admin-status
                        status-${escapeHTML(
                          String(
                            payment.status ||
                            ""
                          ).replaceAll(
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

                  </div>


                  <p>
                    ${escapeHTML(
                      paymentMethodLabel(
                        payment.method
                      )
                    )}
                  </p>


                  <p>
                    ${escapeHTML(
                      formatDateTime(
                        payment.received_at ||
                        payment.paid_at ||
                        payment.created_at
                      )
                    )}
                  </p>

                </div>


                <div class="admin-dashboard-row-value">

                  <strong>
                    ${escapeHTML(
                      money(
                        payment.amount
                      )
                    )}
                  </strong>

                  <span>
                    ${escapeHTML(
                      payment.external_reference ||
                      ""
                    )}
                  </span>

                </div>

              </button>
            `;
          }
        )
        .join("");
  }


  /* ======================================================
     CREW
  ====================================================== */

  function renderCrew() {
    if (!crewList) {
      return;
    }

    const active =
      crewMembers
        .filter(
          member =>
            member.active === true
        )
        .slice(
          0,
          8
        );

    if (!active.length) {
      crewList.innerHTML = `
        <div class="admin-dashboard-empty">
          No active crew members.
        </div>
      `;

      return;
    }

    crewList.innerHTML =
      active
        .map(
          member => `
            <button
              type="button"
              class="admin-dashboard-row"
              data-crew-id="${escapeHTML(
                member.id
              )}"
            >

              <div class="admin-dashboard-avatar">
                ${escapeHTML(
                  initials(
                    member
                  )
                )}
              </div>


              <div class="admin-dashboard-row-main">

                <strong>
                  ${escapeHTML(
                    crewName(
                      member
                    )
                  )}
                </strong>

                <p>
                  ${escapeHTML(
                    roleLabel(
                      member.role
                    )
                  )}
                </p>

                <p>
                  ${escapeHTML(
                    member.phone ||
                    member.email ||
                    ""
                  )}
                </p>

              </div>


              <span class="admin-dashboard-active-dot">
                Active
              </span>

            </button>
          `
        )
        .join("");
  }


  /* ======================================================
     RENDER ALL
  ====================================================== */

  function renderDashboard() {
    renderGreeting();
    renderStats();
    renderTodayJobs();
    renderLeads();
    renderUpcomingJobs();
    renderPayments();
    renderCrew();
  }


  /* ======================================================
     NAVIGATION
  ====================================================== */

  function openJob(id) {
    if (!id) {
      return;
    }

    window.location.href =
      `jobs.html?id=${encodeURIComponent(
        id
      )}`;
  }


  function openLead(id) {
    if (!id) {
      return;
    }

    window.location.href =
      `leads.html?id=${encodeURIComponent(
        id
      )}`;
  }


  function openPayment(id) {
    if (!id) {
      return;
    }

    window.location.href =
      `payments.html?id=${encodeURIComponent(
        id
      )}`;
  }


  function openCrew(id) {
    if (!id) {
      return;
    }

    window.location.href =
      `crew.html?id=${encodeURIComponent(
        id
      )}`;
  }


  /* ======================================================
     EVENTS
  ====================================================== */

  newLeadButton
    ?.addEventListener(
      "click",
      () => {
        window.location.href =
          "leads.html";
      }
    );


  newEstimateButton
    ?.addEventListener(
      "click",
      () => {
        window.location.href =
          "estimates.html?new=1";
      }
    );


  newJobButton
    ?.addEventListener(
      "click",
      () => {
        window.location.href =
          "jobs.html?new=1";
      }
    );


  todayJobsList
    ?.addEventListener(
      "click",
      event => {
        const target =
          event.target.closest(
            "[data-job-id]"
          );

        if (target) {
          openJob(
            target.dataset
              .jobId
          );
        }
      }
    );


  leadList
    ?.addEventListener(
      "click",
      event => {
        const target =
          event.target.closest(
            "[data-lead-id]"
          );

        if (target) {
          openLead(
            target.dataset
              .leadId
          );
        }
      }
    );


  upcomingTable
    ?.addEventListener(
      "click",
      event => {
        const target =
          event.target.closest(
            "[data-job-id]"
          );

        if (target) {
          openJob(
            target.dataset
              .jobId
          );
        }
      }
    );


  paymentList
    ?.addEventListener(
      "click",
      event => {
        const target =
          event.target.closest(
            "[data-payment-id]"
          );

        if (target) {
          openPayment(
            target.dataset
              .paymentId
          );
        }
      }
    );


  crewList
    ?.addEventListener(
      "click",
      event => {
        const target =
          event.target.closest(
            "[data-crew-id]"
          );

        if (target) {
          openCrew(
            target.dataset
              .crewId
          );
        }
      }
    );


  /* ======================================================
     INITIALIZE
  ====================================================== */

  try {
    const admin =
      await waitForAdminAccess();

    if (
      !admin?.isAuthenticated
    ) {
      console.error(
        "Admin authentication was not ready."
      );

      return;
    }

    adminProfile =
      admin.profile;

    await Promise.all([
      loadLeads(),
      loadCustomers(),
      loadEstimates(),
      loadJobs(),
      loadPayments(),
      loadCrew()
    ]);

    renderDashboard();

  } catch (error) {
    console.error(
      "Metro Haul Dashboard initialization error:",
      error
    );

    if (greeting) {
      greeting.textContent =
        "Dashboard could not be fully loaded.";
    }

    if (todayJobsList) {
      todayJobsList.innerHTML = `
        <div class="admin-dashboard-empty">
          Dashboard data could not be loaded.
          Check the browser console.
        </div>
      `;
    }

    if (leadList) {
      leadList.innerHTML = `
        <div class="admin-dashboard-empty">
          Leads could not be loaded.
        </div>
      `;
    }

    if (upcomingTable) {
      upcomingTable.innerHTML = `
        <tr>
          <td colspan="8">
            Upcoming jobs could not be loaded.
          </td>
        </tr>
      `;
    }
  }

});
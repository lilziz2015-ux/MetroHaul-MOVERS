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
      "Metro Haul Supabase client is unavailable. Load supabase.js before admin-calendar.js."
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

  const VALID_JOB_STATUSES = new Set([
    "DRAFT",
    "ESTIMATE",
    "SCHEDULED",
    "CONFIRMED",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED"
  ]);


  /* ======================================================
     ELEMENTS
  ====================================================== */

  const monthJobCount =
    document.getElementById("calendarMonthJobCount");

  const confirmedCount =
    document.getElementById("calendarConfirmedCount");

  const activeCount =
    document.getElementById("calendarActiveCount");

  const crewCount =
    document.getElementById("calendarCrewCount");

  const previousButton =
    document.getElementById("calendarPreviousButton");

  const todayButton =
    document.getElementById("calendarTodayButton");

  const nextButton =
    document.getElementById("calendarNextButton");

  const newJobButton =
    document.getElementById("calendarNewJobButton");

  const monthTitle =
    document.getElementById("calendarMonthTitle");

  const rangeLabel =
    document.getElementById("calendarRangeLabel");

  const statusFilter =
    document.getElementById("calendarStatusFilter");

  const serviceFilter =
    document.getElementById("calendarServiceFilter");

  const calendarGrid =
    document.getElementById("calendarGrid");

  const upcomingJobCount =
    document.getElementById("upcomingJobCount");

  const upcomingJobsList =
    document.getElementById("upcomingJobsList");


  /* ======================================================
     DAY MODAL
  ====================================================== */

  const dayModal =
    document.getElementById("calendarDayModal");

  const dayBackdrop =
    document.getElementById("calendarDayBackdrop");

  const closeDayButton =
    document.getElementById("closeCalendarDay");

  const dayTitle =
    document.getElementById("calendarDayTitle");

  const daySubtitle =
    document.getElementById("calendarDaySubtitle");

  const dayJobs =
    document.getElementById("calendarDayJobs");

  const dayCreateJobButton =
    document.getElementById("calendarDayCreateJobButton");


  /* ======================================================
     STATE
  ====================================================== */

  let jobs = [];
  let crewAssignments = [];

  let currentMonth =
    new Date();

  let selectedDate =
    null;


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


  function parseLocalDate(value) {
    if (!value) {
      return null;
    }

    const raw =
      String(value)
        .slice(0, 10);

    const [
      year,
      month,
      day
    ] =
      raw
        .split("-")
        .map(Number);

    if (
      !year ||
      !month ||
      !day
    ) {
      return null;
    }

    return new Date(
      year,
      month - 1,
      day
    );
  }


  function formatDate(value) {
    if (!value) {
      return "—";
    }

    const date =
      parseLocalDate(value);

    if (!date) {
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


  function formatLongDate(value) {
    if (!value) {
      return "—";
    }

    const date =
      typeof value === "string"
        ? parseLocalDate(value)
        : value;

    if (
      !date ||
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "—";
    }

    return date.toLocaleDateString(
      "en-US",
      {
        weekday: "long",
        month: "long",
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

    const hour =
      Number(hourText);

    const minute =
      Number(
        minuteText || 0
      );

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


  function sameDay(
    dateA,
    dateB
  ) {
    return (
      dateA.getFullYear() ===
        dateB.getFullYear() &&
      dateA.getMonth() ===
        dateB.getMonth() &&
      dateA.getDate() ===
        dateB.getDate()
    );
  }


  function startOfMonth(date) {
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      1
    );
  }


  function endOfMonth(date) {
    return new Date(
      date.getFullYear(),
      date.getMonth() + 1,
      0
    );
  }


  function getCalendarStart(date) {
    const first =
      startOfMonth(date);

    return new Date(
      first.getFullYear(),
      first.getMonth(),
      first.getDate() -
        first.getDay()
    );
  }


  function getCalendarEnd(date) {
    const last =
      endOfMonth(date);

    return new Date(
      last.getFullYear(),
      last.getMonth(),
      last.getDate() +
        (6 - last.getDay())
    );
  }


  function jobRoute(job) {
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

    return `${pickup} → ${destination}`;
  }


  function validateServiceType(value) {
    if (
      value &&
      !VALID_SERVICE_TYPES.has(
        value
      )
    ) {
      console.warn(
        `Unexpected service type in calendar: ${value}`
      );
    }
  }


  function validateJobStatus(value) {
    if (
      value &&
      !VALID_JOB_STATUSES.has(
        value
      )
    ) {
      console.warn(
        `Unexpected job status in calendar: ${value}`
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
          estimated_hours,

          pickup_address,
          pickup_city,
          pickup_state,
          pickup_zip,

          destination_address,
          destination_city,
          destination_state,
          destination_zip,

          crew_size,

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
        validateServiceType(
          job.service_type
        );

        validateJobStatus(
          job.job_status
        );
      }
    );
  }


  /* ======================================================
     LOAD CREW ASSIGNMENTS
  ====================================================== */

  async function loadCrewAssignments() {
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

          crew_member:crew_members (
            id,
            first_name,
            last_name,
            role,
            active
          )
        `);

    if (error) {
      console.warn(
        "Calendar crew assignments could not be loaded:",
        error
      );

      crewAssignments =
        [];

      return;
    }

    crewAssignments =
      data || [];
  }


  /* ======================================================
     FILTERS
  ====================================================== */

  function filteredJobs() {
    const status =
      statusFilter?.value ||
      "";

    const service =
      serviceFilter?.value ||
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
          service &&
          job.service_type !== service
        ) {
          return false;
        }

        return true;
      }
    );
  }


  function jobsForDate(date) {
    const key =
      toDateKey(date);

    return filteredJobs()
      .filter(
        job =>
          String(
            job.move_date || ""
          ).slice(0, 10) ===
          key
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
  }


  function crewForJob(jobId) {
    return crewAssignments
      .filter(
        assignment =>
          String(
            assignment.job_id
          ) ===
          String(jobId)
      );
  }


  /* ======================================================
     STATS
  ====================================================== */

  function updateStats() {
    const start =
      startOfMonth(
        currentMonth
      );

    const end =
      endOfMonth(
        currentMonth
      );

    const monthJobs =
      filteredJobs()
        .filter(
          job => {
            const date =
              parseLocalDate(
                job.move_date
              );

            if (!date) {
              return false;
            }

            return (
              date >= start &&
              date <= end
            );
          }
        );

    if (monthJobCount) {
      monthJobCount.textContent =
        String(
          monthJobs.length
        );
    }

    if (confirmedCount) {
      confirmedCount.textContent =
        String(
          monthJobs.filter(
            job =>
              job.job_status ===
              "CONFIRMED"
          ).length
        );
    }

    if (activeCount) {
      activeCount.textContent =
        String(
          monthJobs.filter(
            job =>
              job.job_status ===
              "IN_PROGRESS"
          ).length
        );
    }

    if (crewCount) {
      const jobIds =
        new Set(
          monthJobs.map(
            job =>
              String(job.id)
          )
        );

      const uniqueCrew =
        new Set(
          crewAssignments
            .filter(
              assignment =>
                jobIds.has(
                  String(
                    assignment.job_id
                  )
                )
            )
            .map(
              assignment =>
                String(
                  assignment.crew_member_id
                )
            )
        );

      crewCount.textContent =
        String(
          uniqueCrew.size
        );
    }
  }


  /* ======================================================
     MONTH HEADING
  ====================================================== */

  function updateMonthHeading() {
    if (monthTitle) {
      monthTitle.textContent =
        currentMonth.toLocaleDateString(
          "en-US",
          {
            month: "long",
            year: "numeric"
          }
        );
    }

    if (rangeLabel) {
      const start =
        getCalendarStart(
          currentMonth
        );

      const end =
        getCalendarEnd(
          currentMonth
        );

      rangeLabel.textContent =
        `${formatDate(
          toDateKey(start)
        )} – ${formatDate(
          toDateKey(end)
        )}`;
    }
  }


  /* ======================================================
     EVENT CARD
  ====================================================== */

  function calendarEventHTML(job) {
    const assignedCrew =
      crewForJob(
        job.id
      );

    return `
      <button
        type="button"
        class="
          admin-calendar-event
          calendar-status-${escapeHTML(
            String(
              job.job_status || ""
            ).toLowerCase()
          )}
        "
        data-job-id="${escapeHTML(
          job.id
        )}"
      >

        <span class="admin-calendar-event-time">
          ${escapeHTML(
            formatTime(
              job.arrival_time
            )
          )}
        </span>

        <strong>
          ${escapeHTML(
            fullName(
              job.customer
            )
          )}
        </strong>

        <span>
          ${escapeHTML(
            serviceLabel(
              job.service_type
            )
          )}
        </span>

        ${
          assignedCrew.length
            ? `
              <small>
                ${assignedCrew.length}
                ${
                  assignedCrew.length === 1
                    ? "crew member"
                    : "crew members"
                }
              </small>
            `
            : ""
        }

      </button>
    `;
  }


  /* ======================================================
     RENDER CALENDAR
  ====================================================== */

  function renderCalendar() {
    if (!calendarGrid) {
      return;
    }

    updateMonthHeading();
    updateStats();

    const start =
      getCalendarStart(
        currentMonth
      );

    const end =
      getCalendarEnd(
        currentMonth
      );

    const today =
      new Date();

    const cells = [];

    const cursor =
      new Date(start);

    while (
      cursor <= end
    ) {
      const date =
        new Date(cursor);

      const dateJobs =
        jobsForDate(date);

      const isCurrentMonth =
        date.getMonth() ===
        currentMonth.getMonth();

      const isToday =
        sameDay(
          date,
          today
        );

      const visibleJobs =
        dateJobs.slice(
          0,
          3
        );

      const moreCount =
        Math.max(
          0,
          dateJobs.length -
          visibleJobs.length
        );

      cells.push(`
        <div
          class="
            admin-calendar-day
            ${
              isCurrentMonth
                ? ""
                : "outside-month"
            }
            ${
              isToday
                ? "is-today"
                : ""
            }
          "
          data-calendar-date="${escapeHTML(
            toDateKey(date)
          )}"
        >

          <button
            type="button"
            class="admin-calendar-day-number"
            data-open-day="${escapeHTML(
              toDateKey(date)
            )}"
          >
            ${date.getDate()}
          </button>

          <div class="admin-calendar-events">

            ${
              visibleJobs
                .map(
                  job =>
                    calendarEventHTML(
                      job
                    )
                )
                .join("")
            }

            ${
              moreCount
                ? `
                  <button
                    type="button"
                    class="admin-calendar-more"
                    data-open-day="${escapeHTML(
                      toDateKey(date)
                    )}"
                  >
                    +${moreCount} more
                  </button>
                `
                : ""
            }

          </div>

        </div>
      `);

      cursor.setDate(
        cursor.getDate() + 1
      );
    }

    calendarGrid.innerHTML =
      cells.join("");

    renderUpcomingJobs();
  }


  /* ======================================================
     UPCOMING JOBS
  ====================================================== */

  function renderUpcomingJobs() {
    if (!upcomingJobsList) {
      return;
    }

    const today =
      new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    const upcoming =
      filteredJobs()
        .filter(
          job => {
            const date =
              parseLocalDate(
                job.move_date
              );

            if (!date) {
              return false;
            }

            return (
              date >= today &&
              job.job_status !==
                "CANCELLED"
            );
          }
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
          12
        );

    if (upcomingJobCount) {
      upcomingJobCount.textContent =
        `${upcoming.length} upcoming ${
          upcoming.length === 1
            ? "job"
            : "jobs"
        }`;
    }

    if (!upcoming.length) {
      upcomingJobsList.innerHTML = `
        <div class="admin-job-crew-empty">
          No upcoming jobs.
        </div>
      `;

      return;
    }

    upcomingJobsList.innerHTML =
      upcoming
        .map(
          job => {
            const assignedCrew =
              crewForJob(
                job.id
              );

            const moveDate =
              parseLocalDate(
                job.move_date
              );

            return `
              <article class="admin-calendar-upcoming-card">

                <div class="admin-calendar-upcoming-date">

                  <strong>
                    ${escapeHTML(
                      moveDate
                        ?.toLocaleDateString(
                          "en-US",
                          {
                            day: "numeric"
                          }
                        ) ||
                      "—"
                    )}
                  </strong>

                  <span>
                    ${escapeHTML(
                      moveDate
                        ?.toLocaleDateString(
                          "en-US",
                          {
                            month: "short"
                          }
                        ) ||
                      ""
                    )}
                  </span>

                </div>


                <div class="admin-calendar-upcoming-info">

                  <div class="admin-calendar-upcoming-top">

                    <div>
                      <h3>
                        ${escapeHTML(
                          fullName(
                            job.customer
                          )
                        )}
                      </h3>

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
                    </div>


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
                      serviceLabel(
                        job.service_type
                      )
                    )}
                  </p>

                  <p>
                    ${escapeHTML(
                      jobRoute(job)
                    )}
                  </p>

                  <div class="admin-calendar-upcoming-meta">

                    <span>
                      ${assignedCrew.length}
                      ${
                        assignedCrew.length === 1
                          ? "crew member"
                          : "crew members"
                      }
                    </span>

                    <span>
                      ${escapeHTML(
                        money(
                          job.total_amount
                        )
                      )}
                    </span>

                    <span>
                      Balance:
                      ${escapeHTML(
                        money(
                          job.balance_due
                        )
                      )}
                    </span>

                  </div>

                </div>


                <button
                  type="button"
                  class="admin-table-action"
                  data-job-id="${escapeHTML(
                    job.id
                  )}"
                >
                  View Job
                </button>

              </article>
            `;
          }
        )
        .join("");
  }


  /* ======================================================
     DAY MODAL
  ====================================================== */

  function openDay(dateKey) {
    const date =
      parseLocalDate(
        dateKey
      );

    if (!date) {
      return;
    }

    selectedDate =
      dateKey;

    const dateJobs =
      jobsForDate(date);

    if (dayTitle) {
      dayTitle.textContent =
        formatLongDate(
          date
        );
    }

    if (daySubtitle) {
      daySubtitle.textContent =
        `${dateJobs.length} ${
          dateJobs.length === 1
            ? "job"
            : "jobs"
        } scheduled`;
    }

    if (dayJobs) {
      if (!dateJobs.length) {
        dayJobs.innerHTML = `
          <div class="admin-job-crew-empty">
            No jobs scheduled for this date.
          </div>
        `;

      } else {
        dayJobs.innerHTML =
          dateJobs
            .map(
              job => {
                const assignedCrew =
                  crewForJob(
                    job.id
                  );

                return `
                  <article class="admin-calendar-day-job">

                    <div class="admin-calendar-day-job-header">

                      <div>
                        <h3>
                          ${escapeHTML(
                            fullName(
                              job.customer
                            )
                          )}
                        </h3>

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
                      </div>

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


                    <div class="admin-calendar-day-job-grid">

                      <div>
                        <span>
                          Service
                        </span>

                        <strong>
                          ${escapeHTML(
                            serviceLabel(
                              job.service_type
                            )
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Crew
                        </span>

                        <strong>
                          ${assignedCrew.length}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Total
                        </span>

                        <strong>
                          ${escapeHTML(
                            money(
                              job.total_amount
                            )
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Balance
                        </span>

                        <strong>
                          ${escapeHTML(
                            money(
                              job.balance_due
                            )
                          )}
                        </strong>
                      </div>

                    </div>


                    <div class="admin-calendar-day-route">
                      ${escapeHTML(
                        jobRoute(job)
                      )}
                    </div>


                    ${
                      assignedCrew.length
                        ? `
                          <div class="admin-calendar-day-crew">

                            ${assignedCrew
                              .map(
                                assignment => {
                                  const member =
                                    assignment
                                      .crew_member;

                                  return `
                                    <span>
                                      ${escapeHTML(
                                        [
                                          member?.first_name,
                                          member?.last_name
                                        ]
                                          .filter(Boolean)
                                          .join(" ") ||
                                        "Crew"
                                      )}
                                    </span>
                                  `;
                                }
                              )
                              .join("")}

                          </div>
                        `
                        : ""
                    }


                    <button
                      type="button"
                      class="admin-primary-button"
                      data-job-id="${escapeHTML(
                        job.id
                      )}"
                    >
                      Open Job
                    </button>

                  </article>
                `;
              }
            )
            .join("");
      }
    }

    if (dayModal) {
      dayModal.hidden =
        false;
    }

    document.body.style.overflow =
      "hidden";
  }


  function closeDay() {
    if (dayModal) {
      dayModal.hidden =
        true;
    }

    document.body.style.overflow =
      "";
  }


  /* ======================================================
     NAVIGATION
  ====================================================== */

  function previousMonth() {
    currentMonth =
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() - 1,
        1
      );

    renderCalendar();
  }


  function nextMonth() {
    currentMonth =
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        1
      );

    renderCalendar();
  }


  function goToday() {
    const now =
      new Date();

    currentMonth =
      new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      );

    renderCalendar();
  }


  function openJob(jobId) {
    if (!jobId) {
      return;
    }

    window.location.href =
      `jobs.html?id=${encodeURIComponent(
        jobId
      )}`;
  }


  function createJob(dateKey = null) {
    const params =
      new URLSearchParams();

    params.set(
      "new",
      "1"
    );

    if (dateKey) {
      params.set(
        "move_date",
        dateKey
      );
    }

    window.location.href =
      `jobs.html?${params.toString()}`;
  }


  /* ======================================================
     EVENTS
  ====================================================== */

  previousButton
    ?.addEventListener(
      "click",
      previousMonth
    );


  todayButton
    ?.addEventListener(
      "click",
      goToday
    );


  nextButton
    ?.addEventListener(
      "click",
      nextMonth
    );


  newJobButton
    ?.addEventListener(
      "click",
      () => {
        createJob();
      }
    );


  statusFilter
    ?.addEventListener(
      "change",
      renderCalendar
    );


  serviceFilter
    ?.addEventListener(
      "change",
      renderCalendar
    );


  calendarGrid
    ?.addEventListener(
      "click",
      event => {
        const jobButton =
          event.target.closest(
            "[data-job-id]"
          );

        if (jobButton) {
          openJob(
            jobButton.dataset
              .jobId
          );

          return;
        }

        const dayButton =
          event.target.closest(
            "[data-open-day]"
          );

        if (dayButton) {
          openDay(
            dayButton.dataset
              .openDay
          );
        }
      }
    );


  upcomingJobsList
    ?.addEventListener(
      "click",
      event => {
        const button =
          event.target.closest(
            "[data-job-id]"
          );

        if (!button) {
          return;
        }

        openJob(
          button.dataset
            .jobId
        );
      }
    );


  closeDayButton
    ?.addEventListener(
      "click",
      closeDay
    );


  dayBackdrop
    ?.addEventListener(
      "click",
      closeDay
    );


  dayJobs
    ?.addEventListener(
      "click",
      event => {
        const button =
          event.target.closest(
            "[data-job-id]"
          );

        if (!button) {
          return;
        }

        openJob(
          button.dataset
            .jobId
        );
      }
    );


  dayCreateJobButton
    ?.addEventListener(
      "click",
      () => {
        createJob(
          selectedDate
        );
      }
    );


  document.addEventListener(
    "keydown",
    event => {
      if (
        event.key === "Escape" &&
        dayModal &&
        !dayModal.hidden
      ) {
        closeDay();
      }
    }
  );


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
      loadJobs(),
      loadCrewAssignments()
    ]);

    const now =
      new Date();

    currentMonth =
      new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      );

    renderCalendar();

  } catch (error) {
    console.error(
      "Metro Haul Calendar initialization error:",
      error
    );

    if (calendarGrid) {
      calendarGrid.innerHTML = `
        <div class="admin-job-crew-empty">
          Calendar could not be loaded.
          Check the browser console.
        </div>
      `;
    }
  }

});
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
      "Metro Haul Supabase client is unavailable. Load supabase.js before admin-crew.js."
    );
    return;
  }


  /* ======================================================
     VALID DATABASE VALUES
  ====================================================== */

  const VALID_CREW_ROLES = new Set([
    "mover",
    "driver",
    "crew_lead",
    "dispatcher",
    "manager"
  ]);


  /* ======================================================
     ELEMENTS
  ====================================================== */

  const tableBody =
    document.getElementById("crewTableBody");

  const resultCount =
    document.getElementById("crewResultCount");

  const totalCrewCount =
    document.getElementById("totalCrewCount");

  const activeCrewCount =
    document.getElementById("activeCrewCount");

  const driverCrewCount =
    document.getElementById("driverCrewCount");

  const crewLeadCount =
    document.getElementById("crewLeadCount");

  const searchInput =
    document.getElementById("crewSearch");

  const roleFilter =
    document.getElementById("crewRoleFilter");

  const statusFilter =
    document.getElementById("crewStatusFilter");

  const newCrewButton =
    document.getElementById("newCrewButton");


  /* ======================================================
     CREATE / EDIT MODAL
  ====================================================== */

  const crewModal =
    document.getElementById("crewModal");

  const crewModalBackdrop =
    document.getElementById("crewModalBackdrop");

  const closeCrewModalButton =
    document.getElementById("closeCrewModal");

  const cancelCrewButton =
    document.getElementById("cancelCrewButton");

  const crewForm =
    document.getElementById("crewForm");

  const crewFormError =
    document.getElementById("crewFormError");

  const saveCrewButton =
    document.getElementById("saveCrewButton");

  const crewIdInput =
    document.getElementById("crewId");

  const crewModalTitle =
    document.getElementById("crewModalTitle");

  const crewModalSubtitle =
    document.getElementById("crewModalSubtitle");


  /* ======================================================
     VIEW MODAL
  ====================================================== */

  const viewCrewModal =
    document.getElementById("viewCrewModal");

  const viewCrewBackdrop =
    document.getElementById("viewCrewBackdrop");

  const closeViewCrewButton =
    document.getElementById("closeViewCrew");

  const viewCrewName =
    document.getElementById("viewCrewName");

  const viewCrewRole =
    document.getElementById("viewCrewRole");

  const viewCrewContent =
    document.getElementById("viewCrewContent");

  const crewAssignmentsList =
    document.getElementById("crewAssignmentsList");

  const editCrewButton =
    document.getElementById("editCrewButton");

  const toggleCrewStatusButton =
    document.getElementById("toggleCrewStatusButton");

  const viewCrewJobsButton =
    document.getElementById("viewCrewJobsButton");


  /* ======================================================
     STATE
  ====================================================== */

  let crewMembers = [];
  let currentCrewMember = null;
  let currentAssignments = [];
  let assignmentJobs = new Map();


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


  function escapeHTML(value) {
    return text(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }


  function fullName(member) {
    return [
      member?.first_name,
      member?.last_name
    ]
      .filter(Boolean)
      .join(" ") ||
      "Crew Member";
  }


  function initials(member) {
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


  function validateCrewRole(value) {
    if (
      !VALID_CREW_ROLES.has(value)
    ) {
      throw new Error(
        `Invalid crew role: ${value || "blank"}`
      );
    }
  }


  /* ======================================================
     HOURS / COST
  ====================================================== */

  function calculateWorkedHours(
    checkedInAt,
    checkedOutAt
  ) {
    if (
      !checkedInAt ||
      !checkedOutAt
    ) {
      return null;
    }

    const start =
      new Date(
        checkedInAt
      );

    const end =
      new Date(
        checkedOutAt
      );

    if (
      Number.isNaN(
        start.getTime()
      ) ||
      Number.isNaN(
        end.getTime()
      )
    ) {
      return null;
    }

    const milliseconds =
      end.getTime() -
      start.getTime();

    if (milliseconds < 0) {
      return null;
    }

    return milliseconds /
      3600000;
  }


  function formatHours(hours) {
    if (
      hours === null ||
      hours === undefined ||
      !Number.isFinite(hours)
    ) {
      return "—";
    }

    return `${hours.toFixed(2)} hrs`;
  }


  function calculateAssignmentCost(
    assignment,
    member
  ) {
    const hours =
      calculateWorkedHours(
        assignment.checked_in_at,
        assignment.checked_out_at
      );

    if (
      hours === null ||
      member?.hourly_cost === null ||
      member?.hourly_cost === undefined
    ) {
      return null;
    }

    return hours *
      Number(
        member.hourly_cost || 0
      );
  }


  function getCrewWorkSummary(member) {
    let totalHours = 0;
    let totalCost = 0;
    let completedShifts = 0;
    let openShifts = 0;

    currentAssignments.forEach(
      assignment => {
        if (
          assignment.checked_in_at &&
          !assignment.checked_out_at
        ) {
          openShifts += 1;
        }

        const hours =
          calculateWorkedHours(
            assignment.checked_in_at,
            assignment.checked_out_at
          );

        if (hours !== null) {
          totalHours += hours;
          completedShifts += 1;

          if (
            member?.hourly_cost !== null &&
            member?.hourly_cost !== undefined
          ) {
            totalCost +=
              hours *
              Number(
                member.hourly_cost || 0
              );
          }
        }
      }
    );

    return {
      totalHours,
      totalCost,
      completedShifts,
      openShifts
    };
  }


  /* ======================================================
     FORM ERRORS
  ====================================================== */

  function showFormError(message) {
    if (!crewFormError) {
      return;
    }

    crewFormError.textContent =
      message;

    crewFormError.hidden =
      false;

    crewFormError.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }


  function clearFormError() {
    if (!crewFormError) {
      return;
    }

    crewFormError.textContent =
      "";

    crewFormError.hidden =
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
     LOAD CREW
  ====================================================== */

  async function loadCrewMembers() {
    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8">
            Loading crew...
          </td>
        </tr>
      `;
    }

    const {
      data,
      error
    } =
      await db
        .from("crew_members")
        .select(`
          id,
          auth_user_id,
          first_name,
          last_name,
          phone,
          email,
          role,
          active,
          hourly_cost,
          notes,
          created_at,
          updated_at
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

    crewMembers.forEach(
      member => {
        if (
          !VALID_CREW_ROLES.has(
            member.role
          )
        ) {
          console.warn(
            "Unexpected crew role:",
            member.role
          );
        }
      }
    );

    updateStatistics();
    renderCrew();
  }


  /* ======================================================
     STATS
  ====================================================== */

  function updateStatistics() {
    if (totalCrewCount) {
      totalCrewCount.textContent =
        String(
          crewMembers.length
        );
    }

    if (activeCrewCount) {
      activeCrewCount.textContent =
        String(
          crewMembers.filter(
            member =>
              member.active === true
          ).length
        );
    }

    if (driverCrewCount) {
      driverCrewCount.textContent =
        String(
          crewMembers.filter(
            member =>
              member.role === "driver"
          ).length
        );
    }

    if (crewLeadCount) {
      crewLeadCount.textContent =
        String(
          crewMembers.filter(
            member =>
              member.role ===
              "crew_lead"
          ).length
        );
    }
  }


  /* ======================================================
     FILTERING
  ====================================================== */

  function getFilteredCrew() {
    const search =
      String(
        searchInput?.value || ""
      )
        .trim()
        .toLowerCase();

    const role =
      roleFilter?.value ||
      "";

    const status =
      statusFilter?.value ||
      "";

    return crewMembers.filter(
      member => {
        if (
          role &&
          member.role !== role
        ) {
          return false;
        }

        if (
          status === "active" &&
          member.active !== true
        ) {
          return false;
        }

        if (
          status === "inactive" &&
          member.active !== false
        ) {
          return false;
        }

        if (!search) {
          return true;
        }

        const haystack =
          [
            member.first_name,
            member.last_name,
            member.phone,
            member.email,
            roleLabel(
              member.role
            ),
            member.role,
            member.notes
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

  function renderCrew() {
    if (!tableBody) {
      return;
    }

    const filtered =
      getFilteredCrew();

    if (resultCount) {
      resultCount.textContent =
        `${filtered.length} ${
          filtered.length === 1
            ? "crew member"
            : "crew members"
        }`;
    }

    if (!filtered.length) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8">
            No crew members found.
          </td>
        </tr>
      `;

      return;
    }

    tableBody.innerHTML =
      filtered
        .map(
          member => `
            <tr>

              <td>
                <div class="admin-crew-table-person">

                  <div class="admin-job-crew-avatar">
                    ${escapeHTML(
                      initials(
                        member
                      )
                    )}
                  </div>

                  <div>
                    <strong>
                      ${escapeHTML(
                        fullName(
                          member
                        )
                      )}
                    </strong>

                    ${
                      member.auth_user_id
                        ? `
                          <div class="admin-table-muted">
                            Login connected
                          </div>
                        `
                        : ""
                    }
                  </div>

                </div>
              </td>


              <td>
                <span
                  class="
                    admin-status
                    ${
                      member.role === "driver"
                        ? "status-scheduled"
                        : member.role ===
                            "crew_lead"
                          ? "status-quoted"
                          : member.role ===
                              "manager"
                            ? "status-accepted"
                            : "status-draft"
                    }
                  "
                >
                  ${escapeHTML(
                    roleLabel(
                      member.role
                    )
                  )}
                </span>
              </td>


              <td>
                ${
                  member.phone
                    ? `
                      <a
                        href="tel:${escapeHTML(
                          member.phone
                        )}"
                      >
                        ${escapeHTML(
                          member.phone
                        )}
                      </a>
                    `
                    : "—"
                }
              </td>


              <td>
                ${
                  member.email
                    ? `
                      <a
                        href="mailto:${escapeHTML(
                          member.email
                        )}"
                      >
                        ${escapeHTML(
                          member.email
                        )}
                      </a>
                    `
                    : "—"
                }
              </td>


              <td>
                ${
                  member.hourly_cost !== null
                    ? escapeHTML(
                        money(
                          member.hourly_cost
                        )
                      )
                    : "—"
                }
              </td>


              <td>
                <span
                  class="
                    admin-status
                    ${
                      member.active
                        ? "status-accepted"
                        : "status-cancelled"
                    }
                  "
                >
                  ${
                    member.active
                      ? "Active"
                      : "Inactive"
                  }
                </span>
              </td>


              <td>
                ${escapeHTML(
                  formatDate(
                    member.created_at
                  )
                )}
              </td>


              <td>
                <button
                  type="button"
                  class="admin-table-action"
                  data-view-crew="${escapeHTML(
                    member.id
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
     RESET FORM
  ====================================================== */

  function resetCrewForm() {
    crewForm?.reset();

    currentCrewMember =
      null;

    if (crewIdInput) {
      crewIdInput.value =
        "";
    }

    if (crewModalTitle) {
      crewModalTitle.textContent =
        "Add Crew Member";
    }

    if (crewModalSubtitle) {
      crewModalSubtitle.textContent =
        "Add a mover, driver or operations team member.";
    }

    setValue(
      "role",
      "mover"
    );

    setValue(
      "active",
      "true"
    );

    setValue(
      "auth_user_id",
      ""
    );

    clearFormError();
  }


  /* ======================================================
     OPEN / CLOSE FORM
  ====================================================== */

  function openNewCrewMember() {
    resetCrewForm();

    if (crewModal) {
      crewModal.hidden =
        false;
    }

    document.body.style.overflow =
      "hidden";
  }


  function closeCrewModal() {
    if (crewModal) {
      crewModal.hidden =
        true;
    }

    document.body.style.overflow =
      "";
  }


  /* ======================================================
     EDIT CREW MEMBER
  ====================================================== */

  function editCrewMember(member) {
    currentCrewMember =
      member;

    clearFormError();

    if (crewIdInput) {
      crewIdInput.value =
        member.id;
    }

    if (crewModalTitle) {
      crewModalTitle.textContent =
        "Edit Crew Member";
    }

    if (crewModalSubtitle) {
      crewModalSubtitle.textContent =
        fullName(member);
    }

    const values = {
      first_name:
        member.first_name,

      last_name:
        member.last_name,

      phone:
        member.phone,

      email:
        member.email,

      role:
        member.role,

      active:
        member.active
          ? "true"
          : "false",

      hourly_cost:
        member.hourly_cost,

      auth_user_id:
        member.auth_user_id,

      notes:
        member.notes
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

    closeViewCrew();

    if (crewModal) {
      crewModal.hidden =
        false;
    }

    document.body.style.overflow =
      "hidden";
  }


  /* ======================================================
     SAVE CREW MEMBER
  ====================================================== */

  async function saveCrewMember(event) {
    event.preventDefault();

    clearFormError();

    if (
      !crewForm?.checkValidity()
    ) {
      crewForm.reportValidity();
      return;
    }

    if (!saveCrewButton) {
      return;
    }

    saveCrewButton.disabled =
      true;

    saveCrewButton.textContent =
      "Saving...";

    try {
      const data =
        new FormData(
          crewForm
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

      const role =
        clean(
          data.get(
            "role"
          )
        ) ||
        "mover";

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

      validateCrewRole(
        role
      );

      const hourlyCost =
        nullableNumber(
          data.get(
            "hourly_cost"
          )
        );

      if (
        hourlyCost !== null &&
        hourlyCost < 0
      ) {
        throw new Error(
          "Hourly cost cannot be negative."
        );
      }

      const authUserId =
        clean(
          data.get(
            "auth_user_id"
          )
        );

      const payload = {
        first_name:
          firstName,

        last_name:
          lastName,

        phone:
          clean(
            data.get(
              "phone"
            )
          ),

        email:
          clean(
            data.get(
              "email"
            )
          ),

        role,

        active:
          String(
            data.get(
              "active"
            )
          ) === "true",

        hourly_cost:
          hourlyCost,

        auth_user_id:
          authUserId,

        notes:
          clean(
            data.get(
              "notes"
            )
          )
      };

      let query;

      if (crewIdInput?.value) {
        query =
          db
            .from("crew_members")
            .update(
              payload
            )
            .eq(
              "id",
              crewIdInput.value
            )
            .select()
            .single();

      } else {
        query =
          db
            .from("crew_members")
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
          error.code === "23505"
        ) {
          throw new Error(
            "That login account is already connected to another crew member."
          );
        }

        throw error;
      }

      closeCrewModal();

      await loadCrewMembers();

      const refreshed =
        crewMembers.find(
          item =>
            String(item.id) ===
            String(saved.id)
        );

      if (refreshed) {
        await openViewCrew(
          refreshed
        );
      }

    } catch (error) {
      console.error(
        "Save crew member error:",
        error
      );

      showFormError(
        error?.message ||
        "Crew member could not be saved."
      );

    } finally {
      saveCrewButton.disabled =
        false;

      saveCrewButton.textContent =
        "Save Crew Member";
    }
  }


  /* ======================================================
     LOAD ASSIGNMENTS
  ====================================================== */

  async function loadCrewAssignments(
    crewMemberId
  ) {
    if (!crewAssignmentsList) {
      return;
    }

    crewAssignmentsList.innerHTML = `
      <div class="admin-loading">
        Loading assignments...
      </div>
    `;

    /*
      The job foreign key now exists, so
      retrieve the linked job directly.
    */

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

          job:jobs (
            id,
            job_number,
            job_status,
            move_date,
            arrival_time,
            service_type,
            pickup_address,
            pickup_city,
            pickup_state,
            destination_address,
            destination_city,
            destination_state,
            customer_id
          )
        `)
        .eq(
          "crew_member_id",
          crewMemberId
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        );

    if (error) {
      console.error(
        "Crew assignment load error:",
        error
      );

      currentAssignments =
        [];

      assignmentJobs =
        new Map();

      crewAssignmentsList.innerHTML = `
        <div class="admin-job-crew-empty">
          Assignments could not be loaded.
        </div>
      `;

      renderCrewProfile();

      return;
    }

    currentAssignments =
      data || [];

    assignmentJobs =
      new Map();

    currentAssignments.forEach(
      assignment => {
        if (
          assignment.job?.id
        ) {
          assignmentJobs.set(
            assignment.job.id,
            assignment.job
          );
        }
      }
    );

    renderCrewAssignments();
    renderCrewProfile();
  }


  /* ======================================================
     CREW PROFILE
  ====================================================== */

  function renderCrewProfile() {
    if (
      !viewCrewContent ||
      !currentCrewMember
    ) {
      return;
    }

    const member =
      currentCrewMember;

    const summary =
      getCrewWorkSummary(
        member
      );

    viewCrewContent.innerHTML = `

      <div class="admin-job-detail-grid">

        ${detailHTML(
          "Role",
          roleLabel(
            member.role
          )
        )}

        ${detailHTML(
          "Status",
          member.active
            ? "Active"
            : "Inactive"
        )}

        ${detailHTML(
          "Phone",
          member.phone
        )}

        ${detailHTML(
          "Email",
          member.email
        )}

        ${detailHTML(
          "Hourly Cost",
          member.hourly_cost !== null
            ? money(
                member.hourly_cost
              )
            : null
        )}

        ${detailHTML(
          "Login Connected",
          member.auth_user_id
            ? "Yes"
            : "No"
        )}

        ${detailHTML(
          "Completed Shifts",
          summary.completedShifts
        )}

        ${detailHTML(
          "Open Shifts",
          summary.openShifts
        )}

        ${detailHTML(
          "Actual Hours Worked",
          formatHours(
            summary.totalHours
          )
        )}

        ${detailHTML(
          "Estimated Labor Cost",
          member.hourly_cost !== null
            ? money(
                summary.totalCost
              )
            : "Hourly cost not set"
        )}

        ${detailHTML(
          "Added",
          formatDate(
            member.created_at
          )
        )}

        ${detailHTML(
          "Updated",
          formatDate(
            member.updated_at
          )
        )}

        ${detailHTML(
          "Notes",
          member.notes,
          true
        )}

      </div>


      <div
        class="admin-form-actions admin-crew-contact-actions"
      >

        ${
          member.phone
            ? `
              <a
                href="tel:${escapeHTML(
                  member.phone
                )}"
                class="admin-secondary-button"
              >
                Call
              </a>

              <a
                href="sms:${escapeHTML(
                  member.phone
                )}"
                class="admin-secondary-button"
              >
                Text
              </a>
            `
            : ""
        }


        ${
          member.email
            ? `
              <a
                href="mailto:${escapeHTML(
                  member.email
                )}"
                class="admin-secondary-button"
              >
                Email
              </a>
            `
            : ""
        }

      </div>
    `;
  }


  /* ======================================================
     RENDER ASSIGNMENTS
  ====================================================== */

  function renderCrewAssignments() {
    if (!crewAssignmentsList) {
      return;
    }

    if (!currentAssignments.length) {
      crewAssignmentsList.innerHTML = `
        <div class="admin-job-crew-empty">
          No job assignments yet.
        </div>
      `;

      return;
    }

    crewAssignmentsList.innerHTML =
      currentAssignments
        .map(
          assignment => {
            const job =
              assignment.job ||
              assignmentJobs.get(
                assignment.job_id
              );

            const hours =
              calculateWorkedHours(
                assignment.checked_in_at,
                assignment.checked_out_at
              );

            const cost =
              calculateAssignmentCost(
                assignment,
                currentCrewMember
              );

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

            const route =
              job
                ? [
                    [
                      job.pickup_city,
                      job.pickup_state
                    ]
                      .filter(Boolean)
                      .join(", ") ||
                    job.pickup_address,

                    [
                      job.destination_city,
                      job.destination_state
                    ]
                      .filter(Boolean)
                      .join(", ") ||
                    job.destination_address
                  ]
                    .filter(Boolean)
                    .join(" → ")
                : null;

            return `
              <article class="admin-job-crew-card">

                <div class="admin-job-crew-avatar">
                  ${escapeHTML(
                    job?.job_number
                      ? "J"
                      : "MH"
                  )}
                </div>


                <div class="admin-job-crew-info">

                  <h4>
                    ${escapeHTML(
                      job?.job_number ||
                      "Job Assignment"
                    )}
                  </h4>


                  <div class="admin-crew-assignment-badges">

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


                    ${
                      job?.job_status
                        ? `
                          <span
                            class="
                              admin-status
                              status-${escapeHTML(
                                String(
                                  job.job_status
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
                        `
                        : ""
                    }

                  </div>


                  ${
                    job?.move_date
                      ? `
                        <p>
                          Move date:
                          ${escapeHTML(
                            formatDate(
                              job.move_date
                            )
                          )}
                        </p>
                      `
                      : ""
                  }


                  ${
                    route
                      ? `
                        <p>
                          ${escapeHTML(
                            route
                          )}
                        </p>
                      `
                      : ""
                  }


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
                          ${
                            assignment.scheduled_end
                              ? ` → ${escapeHTML(
                                  formatDateTime(
                                    assignment.scheduled_end
                                  )
                                )}`
                              : ""
                          }
                        </p>
                      `
                      : ""
                  }


                  ${
                    assignment.checked_in_at
                      ? `
                        <p>
                          Check in:
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
                          Check out:
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
                    hours !== null
                      ? `
                        <div class="admin-crew-time-summary">

                          <span>
                            Actual time
                          </span>

                          <strong>
                            ${escapeHTML(
                              formatHours(
                                hours
                              )
                            )}
                          </strong>

                        </div>
                      `
                      : ""
                  }


                  ${
                    cost !== null
                      ? `
                        <div class="admin-crew-time-summary">

                          <span>
                            Labor cost
                          </span>

                          <strong>
                            ${escapeHTML(
                              money(
                                cost
                              )
                            )}
                          </strong>

                        </div>
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


                ${
                  assignment.job_id
                    ? `
                      <button
                        type="button"
                        class="admin-table-action"
                        data-open-job="${escapeHTML(
                          assignment.job_id
                        )}"
                      >
                        View Job
                      </button>
                    `
                    : ""
                }

              </article>
            `;
          }
        )
        .join("");
  }


  /* ======================================================
     OPEN CREW PROFILE
  ====================================================== */

  async function openViewCrew(member) {
    currentCrewMember =
      member;

    currentAssignments =
      [];

    assignmentJobs =
      new Map();

    if (viewCrewName) {
      viewCrewName.textContent =
        fullName(member);
    }

    if (viewCrewRole) {
      viewCrewRole.textContent =
        `${roleLabel(
          member.role
        )} • ${
          member.active
            ? "Active"
            : "Inactive"
        }`;
    }

    if (toggleCrewStatusButton) {
      toggleCrewStatusButton.textContent =
        member.active
          ? "Deactivate"
          : "Activate";
    }

    if (viewCrewContent) {
      viewCrewContent.innerHTML = `
        <div class="admin-loading">
          Loading crew profile...
        </div>
      `;
    }

    if (viewCrewModal) {
      viewCrewModal.hidden =
        false;
    }

    document.body.style.overflow =
      "hidden";

    await loadCrewAssignments(
      member.id
    );
  }


  function closeViewCrew() {
    if (viewCrewModal) {
      viewCrewModal.hidden =
        true;
    }

    document.body.style.overflow =
      "";
  }


  /* ======================================================
     TOGGLE ACTIVE
  ====================================================== */

  async function toggleCrewStatus() {
    if (!currentCrewMember) {
      return;
    }

    const newStatus =
      !currentCrewMember.active;

    const message =
      newStatus
        ? `Activate ${fullName(
            currentCrewMember
          )}?`
        : `Deactivate ${fullName(
            currentCrewMember
          )}?`;

    if (
      !window.confirm(message)
    ) {
      return;
    }

    if (toggleCrewStatusButton) {
      toggleCrewStatusButton.disabled =
        true;
    }

    try {
      const {
        error
      } =
        await db
          .from("crew_members")
          .update({
            active:
              newStatus
          })
          .eq(
            "id",
            currentCrewMember.id
          );

      if (error) {
        throw error;
      }

      const memberId =
        currentCrewMember.id;

      await loadCrewMembers();

      const refreshed =
        crewMembers.find(
          member =>
            String(member.id) ===
            String(memberId)
        );

      if (refreshed) {
        await openViewCrew(
          refreshed
        );
      }

    } catch (error) {
      console.error(
        "Crew status error:",
        error
      );

      alert(
        error?.message ||
        "Crew status could not be updated."
      );

    } finally {
      if (toggleCrewStatusButton) {
        toggleCrewStatusButton.disabled =
          false;
      }
    }
  }


  /* ======================================================
     CREW JOBS
  ====================================================== */

  function viewCrewJobs() {
    if (!currentCrewMember) {
      return;
    }

    /*
      No dedicated crew-member filter exists
      on jobs.html yet.
    */

    window.location.href =
      "jobs.html";
  }


  /* ======================================================
     EVENTS
  ====================================================== */

  searchInput
    ?.addEventListener(
      "input",
      renderCrew
    );


  roleFilter
    ?.addEventListener(
      "change",
      renderCrew
    );


  statusFilter
    ?.addEventListener(
      "change",
      renderCrew
    );


  newCrewButton
    ?.addEventListener(
      "click",
      openNewCrewMember
    );


  closeCrewModalButton
    ?.addEventListener(
      "click",
      closeCrewModal
    );


  cancelCrewButton
    ?.addEventListener(
      "click",
      closeCrewModal
    );


  crewModalBackdrop
    ?.addEventListener(
      "click",
      closeCrewModal
    );


  crewForm
    ?.addEventListener(
      "submit",
      saveCrewMember
    );


  tableBody
    ?.addEventListener(
      "click",
      event => {
        const button =
          event.target.closest(
            "[data-view-crew]"
          );

        if (!button) {
          return;
        }

        const member =
          crewMembers.find(
            item =>
              String(item.id) ===
              String(
                button.dataset
                  .viewCrew
              )
          );

        if (member) {
          openViewCrew(
            member
          );
        }
      }
    );


  closeViewCrewButton
    ?.addEventListener(
      "click",
      closeViewCrew
    );


  viewCrewBackdrop
    ?.addEventListener(
      "click",
      closeViewCrew
    );


  editCrewButton
    ?.addEventListener(
      "click",
      () => {
        if (currentCrewMember) {
          editCrewMember(
            currentCrewMember
          );
        }
      }
    );


  toggleCrewStatusButton
    ?.addEventListener(
      "click",
      toggleCrewStatus
    );


  viewCrewJobsButton
    ?.addEventListener(
      "click",
      viewCrewJobs
    );


  crewAssignmentsList
    ?.addEventListener(
      "click",
      event => {
        const button =
          event.target.closest(
            "[data-open-job]"
          );

        if (!button) {
          return;
        }

        window.location.href =
          `jobs.html?id=${encodeURIComponent(
            button.dataset
              .openJob
          )}`;
      }
    );


  document.addEventListener(
    "keydown",
    event => {
      if (
        event.key !== "Escape"
      ) {
        return;
      }

      if (
        crewModal &&
        !crewModal.hidden
      ) {
        closeCrewModal();
        return;
      }

      if (
        viewCrewModal &&
        !viewCrewModal.hidden
      ) {
        closeViewCrew();
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
      openNewCrewMember();
      return;
    }

    const crewId =
      params.get("id");

    if (!crewId) {
      return;
    }

    const member =
      crewMembers.find(
        item =>
          String(item.id) ===
          String(crewId)
      );

    if (member) {
      await openViewCrew(
        member
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

    await loadCrewMembers();

    await processURLActions();

  } catch (error) {
    console.error(
      "Metro Haul Crew initialization error:",
      error
    );

    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8">
            Crew could not be loaded.
            Check the browser console.
          </td>
        </tr>
      `;
    }
  }

});
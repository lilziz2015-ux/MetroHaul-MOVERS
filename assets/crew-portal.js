"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  const db = window.metroHaulDb || window.metroHaulDB || window.db;
  const list = document.getElementById("crewAssignments");
  const message = document.getElementById("crewPortalMessage");
  const filter = document.getElementById("crewAssignmentFilter");
  let profile = null;
  let assignments = [];

  const escapeHTML = value => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  function showMessage(text, error = false) {
    message.textContent = text;
    message.classList.toggle("error", error);
    message.hidden = false;
  }

  function formatDate(value) {
    if (!value) return "Date pending";
    return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric", year: "numeric"
    });
  }

  function formatTime(value) {
    if (!value) return "—";
    return new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  function render() {
    const mode = filter.value;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const visible = assignments.filter(assignment => {
      const completed = Boolean(assignment.checked_out_at) || assignment.job?.job_status === "COMPLETED";
      if (mode === "completed") return completed;
      if (mode === "current") {
        const moveDate = assignment.job?.move_date ? new Date(`${assignment.job.move_date}T12:00:00`) : null;
        return !completed && (!moveDate || moveDate >= today);
      }
      return true;
    });

    document.getElementById("crewUpcomingCount").textContent = assignments.filter(a => !a.checked_in_at && a.job?.job_status !== "COMPLETED").length;
    document.getElementById("crewActiveCount").textContent = assignments.filter(a => a.checked_in_at && !a.checked_out_at).length;
    document.getElementById("crewCompletedCount").textContent = assignments.filter(a => a.checked_out_at || a.job?.job_status === "COMPLETED").length;

    if (!visible.length) {
      list.innerHTML = '<div class="crew-empty">No assignments match this view.</div>';
      return;
    }

    list.innerHTML = visible.map(assignment => {
      const job = assignment.job || {};
      const active = assignment.checked_in_at && !assignment.checked_out_at;
      const finished = Boolean(assignment.checked_out_at);
      return `
        <article class="crew-assignment-card">
          <div class="crew-assignment-top">
            <div><span class="crew-job-number">${escapeHTML(job.job_number || "ASSIGNMENT")}</span><h3>${escapeHTML(job.service_type || "Moving job")}</h3></div>
            <span class="crew-status ${active ? "active" : finished ? "complete" : ""}">${active ? "On shift" : finished ? "Shift complete" : escapeHTML(job.job_status || "Scheduled")}</span>
          </div>
          <div class="crew-job-grid">
            <div><span>Date</span><strong>${escapeHTML(formatDate(job.move_date))}</strong></div>
            <div><span>Arrival</span><strong>${escapeHTML(job.arrival_time || "Pending")}</strong></div>
            <div><span>Your role</span><strong>${escapeHTML((assignment.assignment_role || "mover").replaceAll("_", " "))}</strong></div>
          </div>
          <div class="crew-route"><div><span>Pickup</span><p>${escapeHTML([job.pickup_address, job.pickup_city, job.pickup_state].filter(Boolean).join(", ") || "Pending")}</p></div><div><span>Destination</span><p>${escapeHTML([job.destination_address, job.destination_city, job.destination_state].filter(Boolean).join(", ") || "Pending")}</p></div></div>
          ${assignment.notes ? `<p class="crew-notes">${escapeHTML(assignment.notes)}</p>` : ""}
          <div class="crew-shift-row"><span>In: <strong>${escapeHTML(formatTime(assignment.checked_in_at))}</strong></span><span>Out: <strong>${escapeHTML(formatTime(assignment.checked_out_at))}</strong></span></div>
          <div class="crew-card-actions">
            ${!assignment.checked_in_at ? `<button class="crew-primary-button" data-action="check-in" data-id="${escapeHTML(assignment.id)}">Clock In</button>` : ""}
            ${active ? `<button class="crew-primary-button" data-action="check-out" data-id="${escapeHTML(assignment.id)}">Clock Out</button>` : ""}
            ${job.pickup_address ? `<a class="crew-secondary-button" href="https://maps.google.com/?q=${encodeURIComponent([job.pickup_address, job.pickup_city, job.pickup_state].filter(Boolean).join(", "))}" target="_blank" rel="noopener">Directions</a>` : ""}
          </div>
        </article>`;
    }).join("");
  }

  async function loadAssignments() {
    list.innerHTML = '<div class="crew-empty">Loading assignments…</div>';
    const { data, error } = await db.from("crew_assignments").select(`
      id, assignment_role, scheduled_start, scheduled_end, checked_in_at, checked_out_at, notes,
      job:jobs (id, job_number, job_status, move_date, arrival_time, service_type, pickup_address, pickup_city, pickup_state, destination_address, destination_city, destination_state)
    `).eq("crew_member_id", profile.id).order("scheduled_start", { ascending: true });
    if (error) throw error;
    assignments = data || [];
    render();
  }

  async function initialize() {
    if (!db) throw new Error("The crew portal could not connect. Please refresh the page.");
    const { data, error } = await db.auth.getUser();
    if (error || !data?.user) return window.location.replace("login.html");
    const result = await db.from("crew_members").select("id, first_name, last_name, role, active").eq("auth_user_id", data.user.id).maybeSingle();
    if (result.error || result.data?.active !== true) {
      await db.auth.signOut();
      return window.location.replace("login.html");
    }
    profile = result.data;
    document.getElementById("crewMemberName").textContent = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Crew Member";
    await loadAssignments();
  }

  list.addEventListener("click", async event => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    button.disabled = true;
    try {
      const action = button.dataset.action;
      const values = action === "check-in" ? { checked_in_at: new Date().toISOString() } : { checked_out_at: new Date().toISOString() };
      const { error } = await db.from("crew_assignments").update(values).eq("id", button.dataset.id).eq("crew_member_id", profile.id);
      if (error) throw error;
      showMessage(action === "check-in" ? "You are clocked in." : "You are clocked out.");
      await loadAssignments();
    } catch (error) {
      showMessage(error?.message || "The shift could not be updated.", true);
      button.disabled = false;
    }
  });

  filter.addEventListener("change", render);
  document.getElementById("crewRefreshButton").addEventListener("click", () => loadAssignments().catch(error => showMessage(error.message, true)));
  document.getElementById("crewLogoutButton").addEventListener("click", async () => { await db.auth.signOut(); window.location.replace("login.html"); });
  db?.auth.onAuthStateChange(event => { if (event === "SIGNED_OUT") window.location.replace("login.html"); });
  initialize().catch(error => { showMessage(error.message, true); list.innerHTML = '<div class="crew-empty">Assignments could not be loaded.</div>'; });
});

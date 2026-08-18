"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const db = window.metroHaulDb || window.metroHaulDB || window.db;
  const form = document.getElementById("crewLoginForm");
  const button = document.getElementById("crewLoginButton");
  const message = document.getElementById("crewLoginMessage");

  function showMessage(text) {
    message.textContent = text;
    message.hidden = false;
  }

  if (!db || !form) {
    showMessage("The login system could not load. Please refresh the page.");
    if (button) button.disabled = true;
    return;
  }

  async function getCrewProfile(userId) {
    const { data, error } = await db
      .from("crew_members")
      .select("id, active")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data?.active === true ? data : null;
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    message.hidden = true;
    button.disabled = true;
    button.textContent = "Signing In…";

    try {
      const { data, error } = await db.auth.signInWithPassword({
        email: document.getElementById("crewEmail").value.trim().toLowerCase(),
        password: document.getElementById("crewPassword").value
      });

      if (error) throw error;

      const profile = await getCrewProfile(data.user?.id);
      if (!profile) {
        await db.auth.signOut();
        throw new Error("This account is not connected to an active crew profile.");
      }

      window.location.replace("index.html");
    } catch (error) {
      showMessage(error?.message || "Sign-in failed. Check your email and password.");
      button.disabled = false;
      button.textContent = "Sign In";
    }
  });

  db.auth.getUser().then(async ({ data }) => {
    if (data?.user && await getCrewProfile(data.user.id)) {
      window.location.replace("index.html");
    }
  }).catch(() => {});
});

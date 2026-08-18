import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")?.trim() || "";
const SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")?.trim() || "";
const OWNER_EMAIL = "infometrohaulmovers@gmail.com";
const FROM_EMAIL =
  Deno.env.get("FROM_EMAIL")?.trim() ||
  "Metro Haul <onboarding@resend.dev>";

const headers = {
  "Access-Control-Allow-Origin": "https://metrohaulmovers.com",
  "Access-Control-Allow-Headers": "apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      throw new Error("Supabase server configuration is incomplete.");
    }
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured.");
    }

    const payload = await request.json();
    const leadId = String(payload?.lead_id || "").trim();

    if (!/^[0-9a-f-]{36}$/i.test(leadId)) {
      return json({ error: "A valid lead ID is required." }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: existing } = await admin
      .from("notification_logs")
      .select("id, status")
      .eq("lead_id", leadId)
      .eq("template_key", "new_quote_owner")
      .in("status", ["sent", "delivered"])
      .maybeSingle();

    if (existing) {
      return json({ success: true, owner_email_sent: true, duplicate: true });
    }

    const { data: lead, error: leadError } = await admin
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) return json({ error: "Lead not found." }, 404);

    const customerName = `${lead.first_name || ""} ${lead.last_name || ""}`.trim();
    const address = [lead.pickup_address, lead.pickup_city, lead.pickup_state, lead.pickup_zip]
      .filter(Boolean)
      .join(", ");
    const destination = [lead.destination_address, lead.destination_city, lead.destination_state, lead.destination_zip]
      .filter(Boolean)
      .join(", ");

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [OWNER_EMAIL],
        subject: `New Metro Haul quote request — ${customerName || "Customer"}`,
        html: `
          <h1>New quote request</h1>
          <p><strong>Customer:</strong> ${escapeHtml(customerName)}</p>
          <p><strong>Phone:</strong> ${escapeHtml(lead.phone)}</p>
          <p><strong>Email:</strong> ${escapeHtml(lead.email)}</p>
          <p><strong>Service:</strong> ${escapeHtml(lead.service_type)}</p>
          <p><strong>Move date:</strong> ${escapeHtml(lead.move_date || "Not provided")}</p>
          <p><strong>Preferred time:</strong> ${escapeHtml(lead.preferred_time || "Not provided")}</p>
          <p><strong>Pickup:</strong> ${escapeHtml(address || "Not provided")}</p>
          <p><strong>Destination:</strong> ${escapeHtml(destination || "Not provided")}</p>
          <p><strong>Home/job size:</strong> ${escapeHtml(lead.home_size || "Not provided")}</p>
          <p><strong>Specialty items:</strong> ${escapeHtml(lead.specialty_items || "None listed")}</p>
          <p><strong>Notes:</strong><br>${escapeHtml(lead.notes || "None")}</p>
          <p><strong>Lead source:</strong> ${escapeHtml(lead.lead_source || "Website")}</p>
        `
      })
    });

    const emailResult = await emailResponse.json().catch(() => ({}));
    const sent = emailResponse.ok;

    await admin.from("notification_logs").insert({
      lead_id: leadId,
      channel: "email",
      template_key: "new_quote_owner",
      recipient: OWNER_EMAIL,
      status: sent ? "sent" : "failed",
      provider_message_id: sent ? emailResult.id || null : null,
      error_message: sent ? null : emailResult.message || "Resend rejected the email.",
      payload: { service_type: lead.service_type },
      sent_at: sent ? new Date().toISOString() : null
    });

    if (!sent) {
      return json({
        owner_email_sent: false,
        owner_email_error: emailResult.message || "Resend rejected the email."
      }, 502);
    }

    return json({ success: true, owner_email_sent: true, owner_email_id: emailResult.id });
  } catch (error) {
    return json({
      success: false,
      error: error instanceof Error ? error.message : "Notification failed."
    }, 500);
  }
});

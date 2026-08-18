-- Quote form fields and notification support used by assets/quote.js.
alter table public.leads
  add column if not exists preferred_time text;

create index if not exists notification_logs_lead_template_idx
  on public.notification_logs (lead_id, template_key, created_at desc);

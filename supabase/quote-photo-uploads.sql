-- Optional customer photos for more accurate moving quotes.

alter table public.customer_files
  drop constraint if exists customer_files_category_check;

alter table public.customer_files
  add constraint customer_files_category_check
  check (category = any (array[
    'inventory_photo'::text,
    'damage_photo'::text,
    'document'::text,
    'signed_agreement'::text,
    'receipt'::text,
    'quote_photo'::text,
    'other'::text
  ]));

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'quote-photos',
  'quote-photos',
  false,
  8388608,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "website visitors upload quote photos" on storage.objects;
create policy "website visitors upload quote photos"
on storage.objects for insert
to anon
with check (
  bucket_id = 'quote-photos'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
);

drop policy if exists "active admins read quote photos" on storage.objects;
create policy "active admins read quote photos"
on storage.objects for select
to authenticated
using (
  bucket_id = 'quote-photos'
  and (select private.is_active_admin())
);

drop policy if exists "website visitors attach quote photos" on public.customer_files;
create policy "website visitors attach quote photos"
on public.customer_files for insert
to anon
with check (
  lead_id is not null
  and customer_id is null
  and job_id is null
  and storage_bucket = 'quote-photos'
  and storage_path like lead_id::text || '/%'
  and category = 'quote_photo'
  and uploaded_by is null
  and file_size between 1 and 8388608
  and mime_type = any(array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ])
);

grant insert on public.customer_files to anon;

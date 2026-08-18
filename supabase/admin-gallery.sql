-- Admin-managed public project gallery.

create table if not exists public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  file_size bigint not null check (file_size between 1 and 10485760),
  alt_text text not null default 'Metro Haul moving project',
  caption text,
  location text,
  display_order integer not null default 0 check (display_order >= 0),
  is_published boolean not null default true,
  is_featured boolean not null default false,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gallery_images enable row level security;
grant select on public.gallery_images to anon, authenticated;
grant insert, update, delete on public.gallery_images to authenticated;

drop policy if exists "public reads published gallery" on public.gallery_images;
create policy "public reads published gallery"
on public.gallery_images for select
to anon
using (is_published = true);

drop policy if exists "active admins read gallery" on public.gallery_images;
create policy "active admins read gallery"
on public.gallery_images for select
to authenticated
using ((select private.is_active_admin()));

drop policy if exists "active admins insert gallery" on public.gallery_images;
create policy "active admins insert gallery"
on public.gallery_images for insert
to authenticated
with check ((select private.is_active_admin()) and created_by = (select auth.uid()));

drop policy if exists "active admins update gallery" on public.gallery_images;
create policy "active admins update gallery"
on public.gallery_images for update
to authenticated
using ((select private.is_active_admin()))
with check ((select private.is_active_admin()));

drop policy if exists "active admins delete gallery" on public.gallery_images;
create policy "active admins delete gallery"
on public.gallery_images for delete
to authenticated
using ((select private.is_active_admin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gallery', 'gallery', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "active admins upload gallery objects" on storage.objects;
create policy "active admins upload gallery objects"
on storage.objects for insert
to authenticated
with check (bucket_id = 'gallery' and (select private.is_active_admin()));

drop policy if exists "active admins read gallery objects" on storage.objects;
create policy "active admins read gallery objects"
on storage.objects for select
to authenticated
using (bucket_id = 'gallery' and (select private.is_active_admin()));

drop policy if exists "active admins update gallery objects" on storage.objects;
create policy "active admins update gallery objects"
on storage.objects for update
to authenticated
using (bucket_id = 'gallery' and (select private.is_active_admin()))
with check (bucket_id = 'gallery' and (select private.is_active_admin()));

drop policy if exists "active admins delete gallery objects" on storage.objects;
create policy "active admins delete gallery objects"
on storage.objects for delete
to authenticated
using (bucket_id = 'gallery' and (select private.is_active_admin()));

create index if not exists gallery_images_public_order_idx
on public.gallery_images (is_published, is_featured desc, display_order, created_at desc);

create index if not exists gallery_images_created_by_idx
on public.gallery_images (created_by);

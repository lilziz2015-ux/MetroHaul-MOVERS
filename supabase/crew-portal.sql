-- Crew portal authorization. Review and run in the Metro Haul Supabase project.
-- Existing admin policies remain unchanged.

alter table public.crew_members
  add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null;

alter table public.crew_members enable row level security;
alter table public.crew_assignments enable row level security;
alter table public.jobs enable row level security;

drop policy if exists "crew can read own profile" on public.crew_members;
create policy "crew can read own profile"
on public.crew_members for select
to authenticated
using ((select auth.uid()) = auth_user_id and active = true);

drop policy if exists "crew can read own assignments" on public.crew_assignments;
create policy "crew can read own assignments"
on public.crew_assignments for select
to authenticated
using (
  exists (
    select 1 from public.crew_members cm
    where cm.id = crew_member_id
      and cm.auth_user_id = (select auth.uid())
      and cm.active = true
  )
);

drop policy if exists "crew can update own assignments" on public.crew_assignments;
create policy "crew can update own assignments"
on public.crew_assignments for update
to authenticated
using (
  exists (
    select 1 from public.crew_members cm
    where cm.id = crew_member_id
      and cm.auth_user_id = (select auth.uid())
      and cm.active = true
  )
)
with check (
  exists (
    select 1 from public.crew_members cm
    where cm.id = crew_member_id
      and cm.auth_user_id = (select auth.uid())
      and cm.active = true
  )
);

drop policy if exists "crew can read assigned jobs" on public.jobs;
create policy "crew can read assigned jobs"
on public.jobs for select
to authenticated
using (
  exists (
    select 1
    from public.crew_assignments ca
    join public.crew_members cm on cm.id = ca.crew_member_id
    where ca.job_id = jobs.id
      and cm.auth_user_id = (select auth.uid())
      and cm.active = true
  )
);

grant select on public.crew_members, public.crew_assignments, public.jobs to authenticated;
grant update (checked_in_at, checked_out_at) on public.crew_assignments to authenticated;

-- Preserve assignment ownership and scheduling fields even if this project
-- already grants broader UPDATE privileges to authenticated administrators.
create schema if not exists private;

create or replace function private.guard_crew_assignment_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (select auth.uid()) is null then
    return new;
  end if;

  if exists (
    select 1 from public.admin_users au
    where au.id = (select auth.uid())
      and au.is_active = true
  ) then
    return new;
  end if;

  if new.id is distinct from old.id
    or new.job_id is distinct from old.job_id
    or new.crew_member_id is distinct from old.crew_member_id
    or new.assignment_role is distinct from old.assignment_role
    or new.scheduled_start is distinct from old.scheduled_start
    or new.scheduled_end is distinct from old.scheduled_end
    or new.notes is distinct from old.notes
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Crew members may only update shift timestamps';
  end if;

  if old.checked_in_at is not null
    and new.checked_in_at is distinct from old.checked_in_at
  then
    raise exception 'Clock-in time is already set';
  end if;

  if new.checked_out_at is not null and new.checked_in_at is null then
    raise exception 'Clock in before clocking out';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_crew_assignment_update() from public;
revoke all on function private.guard_crew_assignment_update() from anon;
revoke all on function private.guard_crew_assignment_update() from authenticated;

drop trigger if exists guard_crew_assignment_update on public.crew_assignments;
create trigger guard_crew_assignment_update
before update on public.crew_assignments
for each row execute function private.guard_crew_assignment_update();

-- Add support for multiple phone numbers and setup type per org
alter table org_credentials
  add column if not exists phone_numbers text[] default '{}',
  add column if not exists setup_type text default 'default' check (setup_type in ('default', 'facebook'));

-- Storage bucket for org logos
insert into storage.buckets (id, name, public)
values ('org-logos', 'org-logos', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload org logos
create policy "Authenticated users can upload org logos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'org-logos');

create policy "Anyone can view org logos"
  on storage.objects for select to public
  using (bucket_id = 'org-logos');

create policy "Authenticated users can update own org logos"
  on storage.objects for update to authenticated
  using (bucket_id = 'org-logos');

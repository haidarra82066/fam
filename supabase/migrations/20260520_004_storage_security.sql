-- Enforce private storage and signed URL flow
insert into storage.buckets (id, name, public)
values ('person-media', 'person-media', false)
on conflict (id) do update set public = false;

create policy "person_media_read_signed" on storage.objects
for select to authenticated
using (
  bucket_id = 'person-media'
  and public.is_tree_member((storage.foldername(name))[1]::uuid)
);

create policy "person_media_write_member" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'person-media'
  and public.has_tree_role((storage.foldername(name))[1]::uuid, array['owner','editor','contributor']::public.membership_role[])
);

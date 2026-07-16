insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'beast-documents',
  'beast-documents',
  false,
  25000000,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users read own BeastOS document files"
on storage.objects;

create policy "Users read own BeastOS document files"
on storage.objects
for select
using (
  bucket_id = 'beast-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users upload own BeastOS document files"
on storage.objects;

create policy "Users upload own BeastOS document files"
on storage.objects
for insert
with check (
  bucket_id = 'beast-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users update own BeastOS document files"
on storage.objects;

create policy "Users update own BeastOS document files"
on storage.objects
for update
using (
  bucket_id = 'beast-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'beast-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users delete own BeastOS document files"
on storage.objects;

create policy "Users delete own BeastOS document files"
on storage.objects
for delete
using (
  bucket_id = 'beast-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

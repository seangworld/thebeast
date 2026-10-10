-- Private storage for entitled BeastFusion commercial installers.
-- No public or customer upload policy is granted.
insert into storage.buckets (id,name,public,file_size_limit)
values ('beastfusion-commercial-releases','beastfusion-commercial-releases',false,52428800)
on conflict (id) do nothing;

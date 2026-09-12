-- Cover owner-scoped manuscript queries and the owner_id foreign key.
create index if not exists kdp_chapters_owner_publication_order_idx
  on public.kdp_chapters(owner_id, publication_id, chapter_number);

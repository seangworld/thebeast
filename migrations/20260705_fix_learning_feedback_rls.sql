drop policy if exists "Users manage own learning feedback" on public.learning_feedback;
drop policy if exists "Users can read own learning feedback" on public.learning_feedback;
drop policy if exists "Users can insert own learning feedback" on public.learning_feedback;
drop policy if exists "Users can update own learning feedback" on public.learning_feedback;
drop policy if exists "Users can delete own learning feedback" on public.learning_feedback;

create policy "Users can read own learning feedback"
on public.learning_feedback for select
using (auth.uid() = user_id);

create policy "Users can insert own learning feedback"
on public.learning_feedback for insert
with check (auth.uid() = user_id);

create policy "Users can update own learning feedback"
on public.learning_feedback for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own learning feedback"
on public.learning_feedback for delete
using (auth.uid() = user_id);

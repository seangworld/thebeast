-- Member editing owns only Money, Education and Home. Preserve restrictions
-- on other modules (including Health) when saving unrelated account fields.
do $preserve_member_access$
declare
  function_definition text;
  old_delete constant text := E'delete from public.beast_admin_member_module_access\n  where member_id = selected_member_id;';
  new_delete constant text := E'delete from public.beast_admin_member_module_access\n  where member_id = selected_member_id\n    and module_id = any(array[''money'', ''learning'', ''home'']::text[]);';
  replacement_count integer;
begin
  select pg_get_functiondef(to_regprocedure(
    'public.update_beast_admin_member_account(uuid,text,text,text,text[],uuid[],jsonb,uuid)'
  )) into function_definition;
  if function_definition is null then
    raise exception 'Canonical member account RPC is unavailable' using errcode = 'P0002';
  end if;
  if position('from unnest(array[''money'', ''learning'', ''home'']::text[]) module_id;' in function_definition) = 0 then
    raise exception 'Member account RPC requires the reviewed Home entitlement migration'
      using errcode = '55000';
  end if;
  replacement_count := (length(function_definition)
    - length(replace(function_definition, old_delete, ''))) / length(old_delete);
  if replacement_count <> 1 then
    raise exception 'Member account RPC differs from reviewed access preservation contract'
      using errcode = '55000';
  end if;
  -- CREATE OR REPLACE preserves ownership and execute grants. Authorization,
  -- validation, audit and all other writes remain unchanged.
  execute replace(function_definition, old_delete, new_delete);
end;
$preserve_member_access$;

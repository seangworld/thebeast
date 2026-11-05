-- REVIEW/APPROVAL ONLY. Not a migration and never run by the build.
-- After exact migration/source approval, verified SMTP configuration and explicit
-- test-send approval, securely bind the EXISTING CRON_SECRET in Vault under
-- beast_account_mail_dispatch_secret. Do not paste it into this file/SQL logs.
-- Then separately approve this bounded existing-pg_cron pending-delivery backup.
do $$ begin
 if not exists(select 1 from vault.secrets where name='beast_account_mail_dispatch_secret') then
  raise exception 'Approved dispatch binding is required; no secret was created';
 end if;
end $$;
select cron.schedule('beast-account-mail-pending','* * * * *',
 $job$select beast_identity.dispatch_account_mail();$job$);

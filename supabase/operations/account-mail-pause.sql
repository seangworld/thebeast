-- REVIEW/APPROVAL ONLY: exact activation rollback procedure, not auto-executed.
-- First disable BEAST_ACCOUNT_MAIL_ENABLED, NEXT_PUBLIC_BEAST_USERNAME_MAIL_ENABLED,
-- and BEAST_OWNER_REGISTRATION_MAIL_ENABLED; restore the retained working deployment.
select cron.unschedule(jobid) from cron.job where jobname='beast-account-mail-pending';
alter table beast_identity.account_mail_outbox disable trigger wake_account_mail;
-- Keep the outbox, receipts, existing Auth records, usernames and managed notices.
-- Re-enabling the wake trigger requires the same reviewed activation approval.

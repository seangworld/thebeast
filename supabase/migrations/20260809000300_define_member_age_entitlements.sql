-- BO-600: use the existing nullable profile birthday as the authoritative
-- member date of birth for age-based module entitlement decisions.
-- Application code validates the date and calculates age as of the request date.
comment on column public.profiles.birthday is
  'Authoritative member date of birth used for age-based entitlement decisions; nullable until supplied by the member or an administrator.';

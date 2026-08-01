# BO-405 Shared Member Session Detection

`GET /api/session/status` exposes one privacy-minimized fact to the approved
SEANGWORLD origins: whether the browser currently has an active Beast session.
It is not SSO and does not share identity, roles, permissions, profile data, or
tokens.

## Contract

Approved credentialed origins are exactly:

- `https://www.seangworld.com`
- `https://seangworld.com`

Allowed `GET` requests return only `{ "authenticated": boolean }`. Allowed
preflight requests return no body. Missing and unapproved origins receive an
empty `403` response without an allow-origin header.

The endpoint validates the Supabase user, rejects disabled accounts, checks the
existing Beast session-control function, and fails closed to
`{ "authenticated": false }`. Responses are private and no-store. Preflight
permission may be cached for five minutes.

SEANGWORLD must use `credentials: "include"` and configure
`NEXT_PUBLIC_BEAST_SESSION_STATUS_URL` with the canonical endpoint. The browser
never reads Beast cookies directly; it receives only the boolean response.

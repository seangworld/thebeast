# BeastGuide native API gateway

The iPhone client calls these same-project routes on the canonical BeastOS host:

- `POST /api/native-auth` for username/password sign-in and account actions.
- `POST /api/native-identity` for bearer-authenticated identity and library operations.
- `GET /api/native-catalog` for public catalog metadata.

The gateway accepts only requests whose browser origin is exactly `capacitor://localhost`, rejects cookies, and emits a narrow CORS allowlist. Origin identifies the client surface only; it does not authenticate a user. Auth and library authorization remain in the shared BeastOS/BeastGuide handlers.

The routes fail closed unless `BEAST_NATIVE_API_ENABLED=true`. Keep this flag branch-scoped for Preview and enable it in Production only for the iPhone release. The gateway maps the existing canonical Auth configuration and BeastGuide database roles at runtime. Never copy a service-role key or database URL into the mobile bundle or a `VITE_` variable.

The client bundle contains only the canonical Supabase publishable key and API origin. Native auth tokens are stored in the iOS Keychain by the app. The web application continues to use its existing origin-checked routes.

See [BeastGuide iPhone setup](https://github.com/seangworld/beastguide/blob/main/docs/iphone-build.md) for build and acceptance steps.

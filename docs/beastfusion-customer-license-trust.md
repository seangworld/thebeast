# BeastFusion customer license trust model
- Vendor holds Ed25519 private signing key in server-only `BEASTFUSION_LICENSE_PRIVATE_KEY_PEM`. Never ship it to customers.
- The customer application bundles only the matching public key and verifies `BF5.<payload>.<signature>` offline.
- Customer obtains key from authenticated `/api/beastfusion/customer/license`; the endpoint requires an active license record.
- `updates_until` is an update entitlement date, **not** a software expiration date. Perpetual installations continue to run after update coverage expires.
- Offline verification cannot instantly detect later revocation. Future online status refresh must fail safely without disabling already-paid perpetual installations for transient network outages.
- Key rotation requires a versioned public-key identifier and retention of historical public keys. Not yet implemented.
- Do not advertise activation as ready until a separate installed customer runtime validates this token with the public key.

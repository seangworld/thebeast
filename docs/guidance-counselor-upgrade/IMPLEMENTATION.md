# Guidance Counselor research correction

Tracking issue: https://github.com/seangworld/thebeast/issues/272

## Problem and change

The previous GC research path could forward personal details, supplied two descriptive placeholders as search domains, and returned the public research answer without applying it to full private learner context.

The candidate constructs external queries solely from reviewed public topic strings. Member text and model-proposed queries select topics but are never copied into search input. Personal context remains available to the existing private planning model and a new private synthesis step. This is a web-query privacy boundary, not a claim that no authorized AI provider sees learner information.

Supported topics use actual allowlisted federal domains. Returned GC citations must be HTTPS, have no credentials or nondefault port, and match a selected host or its subdomain. Displayed GC sources are limited to citations present in the final safety-processed answer. Citation membership is not semantic entailment.

GC research is an evidence-only step with at most three tool calls and 1,800 output tokens; it adds one private synthesis call only when research succeeds. Public evidence is buffered and final output still passes the existing deterministic and semantic safety checks. No new retry loop, database schema, service, provider credential or model setting is added. Other professionals retain their existing research paths.

## Deliberate limit and remaining work

General FAFSA/Pell, VA education benefits, federal employment, accreditation, apprenticeship and occupational-outlook queries are supported. Arbitrary institution, credential, location and exact job-series queries are not supported by this constrained policy. Unsupported requested research produces an explicit limitation, not a fabricated verified answer. Mixed questions can retrieve general evidence while specific requirements remain unverified. This is a privacy correction with a coverage tradeoff, not proof of comprehensive institutional research capability.

The audit's separate questions about full roadmap access and education document review are not resolved by this patch. No new read adapters or broader permissions have been added. No fresh live competence grade is claimed.

## Verification record

The initial candidate passed 2,520 tests. The first production build caught ES target incompatibility in Set spread; it was corrected to Array.from without changing behavior. Final verification: 2,520/2,520 tests passed with zero skips; security-gated production build passed, including lint/type checks and 221 generated pages; npm audit found zero vulnerabilities and all 22 maintained-braces checks passed. git diff --check passed. Synthetic mocked-provider coverage checks actual outgoing query bodies, private synthesis context, no premature evidence streaming, final cited-source filtering, unsupported requirements, and host spoofing. No paid application inference was used.

See EVALUATION-PLAN.md for prepared role-specific scenarios and the required bounded dispatch preparation. The existing August 30 self-assessed six-turn result remains historical. Merge and production release require separate owner approval.

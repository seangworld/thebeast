# BM-35 Retirement Income Timeline, Gap Analysis & Printable Report

BM-35 turns an authenticated owner’s BM-34 scenario into a deterministic, informational year-by-year timeline. It preserves the source, source date, confidence, assumptions, and limitations of every value.

## What It Shows

- Separate documented retirement-income components, inflation-adjusted expenses, annual gap, and cumulative gap.
- An evidence-quality readiness summary, not a probability or recommendation.
- Up to three side-by-side deterministic scenario calculations through the model interface.
- A print-ready retirement view and owner-initiated JSON export containing the calculation version, scenario snapshot, and disclosures.

## Reproducibility and Provenance

Every saved timeline run carries a canonical scenario snapshot, `bm35-v1` calculation version, and reproducibility key. Timeline and export records are owner-scoped under Supabase RLS. Unknown values remain unknown; BM-35 does not infer official benefits, taxes, health costs, or eligibility.

## Safety Boundaries

Results are informational and non-guaranteed. BM-35 does not provide investment, withdrawal, retirement-date, benefit-claiming, tax, borrowing, or debt-payoff recommendations. BM-33 funding logic remains separate and is not used as retirement income.

## Migration

`20260718000200_add_retirement_timeline_reports.sql` creates owner-scoped timeline-run and report-export metadata tables with RLS. The migration is forward-only and is not applied by this package documentation.

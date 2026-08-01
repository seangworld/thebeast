# BO-502 Contextual Shared Workspaces

## Ownership

BeastOS remains the authoritative owner of Goals and Documents. Specialist
applications render filtered views of those services; they do not maintain
parallel goal or document records.

The canonical full-service routes remain `/dashboard/goals` and
`/dashboard/uploads`. `/dashboard/documents` remains a compatibility route to
the canonical Documents workspace.

## Contextual routes

Contextual workspaces follow `/dashboard/{application}/{service}`:

- Education: `/dashboard/education/goals` and `/dashboard/education/documents`
- Health: `/dashboard/health/goals` and `/dashboard/health/documents`
- Money: `/dashboard/money/goals` and `/dashboard/money/documents`
- Home: `/dashboard/home/goals` and `/dashboard/home/documents`

Because the application is present in the pathname, dashboard navigation keeps
that application expanded and active after refresh or deep linking. The shared
workspace identifies both the current application and BeastOS ownership.

## Filtering and creation

Goal context is determined from the canonical record's source module, category,
tags, active module contributions, and references. Contextual goal creation
defaults the category, context tag, and source module. A cross-module goal stays
one `beast_goals` record and may appear in multiple contexts through its tags,
contributions, or references.

Document context is determined from active `beast_document_module_links`, tags,
or a legacy source-module association. Contextual uploads create one
`beast_documents` record owned by BeastOS and one owner-scoped module link. If
the link cannot be saved, the new metadata and uploaded object are rolled back;
the application does not leave a misleading unlinked upload.

## Education planning

Member-facing navigation uses **Education Planning** for the versioned,
member-approved education roadmap and **Career Planning** for candidate career
paths and gap comparison. The existing `education_career_roadmaps`, roadmap
steps, and `education_career_paths` remain authoritative. Profile, research,
outcomes, schools, certifications, and scholarships keep their current data
models.

The former `/dashboard/education/educational-roadmap` URL redirects to
`/dashboard/education/education-planning`. Existing `#paths` and `#roadmap`
anchors remain available on the Education dashboard for compatibility; they are
not the only planning destinations in active navigation.

## Security and future modules

No schema change is required. Existing RLS and `owner_id` checks remain in
force for Goals, Documents, and document module links. New applications can add
a configuration entry and contextual routes without creating another storage
system.

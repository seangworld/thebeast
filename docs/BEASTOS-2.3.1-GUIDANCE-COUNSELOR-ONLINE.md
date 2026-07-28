# BeastOS 2.3.1 — Guidance Counselor Online

## Release-candidate scope

BeastOS 2.3.1 brings Guidance Counselor online inside the existing
BeastEducation member workspace. It builds on the current education engines,
professional identity, Tutor orchestration, and execution-history foundation.

The experience provides:

- a current Learning Briefing;
- an honest view of saved diagnostic and completed-learning evidence;
- goal planning connected to the saved learning path;
- deterministic learning priorities;
- career guidance with explicit verification boundaries;
- contextual notifications;
- recommendation confidence, evidence, limitations, and lifecycle controls;
- Tutor handoff; and
- learning from persisted member-reported outcomes.

## Professional boundary

Guidance Counselor owns educational direction, goal planning, learning-path
planning, prioritization, career-planning context, and the reason for a Tutor
handoff. Tutor remains the teaching specialist: it teaches the selected concept
and returns learning evidence for the next Guidance Counselor decision.

This release does not add another Tutor, duplicate lesson delivery, or move
teaching logic into Guidance Counselor.

## Evidence and diagnostics

The workspace uses current owner-scoped BeastEducation goals, plan, courses,
sessions, activities, confidence intelligence, learning recommendations, and
roadmap state.

Completed activity strengths and weak concepts may appear as learning evidence.
They are not labeled as a placement diagnostic. When no saved diagnostic
evidence exists, the workspace says so and does not infer mastery,
misconceptions, prerequisite gaps, career fit, or credential requirements.

## Execution History

Opening the workspace creates no activity. A durable execution request begins
only when the member explicitly accepts, defers, or declines a recommendation.
That flow records the request, state transitions, recommendation lifecycle,
confidence, evidence, limitations, and member or owner decision through the
existing execution-history store.

Accepted recommendations can receive a member-reported outcome. The result,
outcome, completed recommendation lifecycle, and immutable audit history are
then persisted. Reporting an outcome does not alter a learning record or claim
that external results were independently verified.

## Data and migration boundary

No database migration is included. BeastOS 2.3.1 reuses the existing
execution-history tables, functions, triggers, RLS policies, and owner-scoped
BeastEducation records.

## Release boundary

- Version: `2.3.1`
- Channel: release candidate
- Push: not included
- Deployment: not included
- Migration: none

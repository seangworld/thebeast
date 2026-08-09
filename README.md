# The Beast / BeastOS

Current platform manifest: `BeastOS v3.0.0` (Development)

BeastOS v3.0.0 activates Health Advisor as a protected owner experience for
health-record review, medication-list organization, appointment preparation,
provider questions, permissioned document summaries, timeline summaries, and
deterministic recommendations. Decisions and preparation outcomes use the
existing Execution History foundation. Health Advisor never diagnoses,
prescribes, interprets clinical significance, or replaces qualified care.

Current Money version: `BeastMoney v2.4.0` (Production)

Current education version: `BeastEducation v1.6 Beta`

## July 4, 2026 Closeout

BeastEducation is the canonical education product identity. The former BeastLearning name remains only in compatibility identifiers and historical release evidence.

Completed work includes:

- Guided Initialization
- Progressive Dashboard
- Mission-based onboarding
- AI Orchestration Platform
- AI integration boundary
- Prompt library
- Learning intelligence
- Knowledge graph
- Curriculum intelligence
- Learning library
- Courses
- Lessons
- Flashcards
- Quizzes
- Practice exams
- Study guides
- Search
- Collections
- Parent/Learner model
- Student timeline
- Certificate generation
- Founding Student program
- Feedback platform
- Two-tone BeastOS branding
- Module sub-navigation
- Calendar date alignment

## BeastEducation Roadmap

Planned next work:

- AI refinement
- Classroom support
- Teacher portal
- Real document ingestion
- Advanced analytics
- Collaboration
- Mobile optimization

## Development

Run the local development server:

```bash
npm run dev
```

Run validation:

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

## Environment

Use local or test Supabase credentials for development:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

OpenAI-backed BeastEducation routes are available when configured:

- `OPENAI_API_KEY`
- `OPENAI_LEARNING_MODEL`

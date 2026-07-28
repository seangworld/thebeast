# The Beast / BeastOS

Current platform version: `BeastOS v2.2.0`

BeastOS v2.2.0 introduces the Digital Staff and controlled execution-history
foundations, the owner-only SEANGWORLD Intelligence foundation, automatic
sitemap generation, and compatibility redirects. Live analytics connections
remain deferred; unavailable providers are reported honestly.

Current Money version: `BeastMoney v2.3.0`

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

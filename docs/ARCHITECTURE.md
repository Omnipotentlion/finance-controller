# Technical Architecture

## Principle
Build the smallest credible system that proves Track 04.

## Stack
- Frontend: Next.js/React + Tailwind CSS
- Backend: Next.js API routes/server actions
- Database: PostgreSQL
- ORM: Prisma if useful; otherwise use a simple PostgreSQL client
- AI: Gemini API/SDK
- Testing: Jest or the project's simplest equivalent
- Deployment: Vercel-compatible deployment

## Logical architecture

Frontend
→ API
→ Batch Pipeline
→ Deterministic Reconciliation Engine
→ PostgreSQL
→ Exception Investigation Agent
→ Resolution Policy
→ Audit Log + Metrics

Evaluation Harness
→ locked ground truth
→ compares final agent output
→ produces accuracy metrics

## Critical isolation
Ground truth MUST NOT be exposed through normal application APIs or agent tools.

## Processing
1. Validate batch.
2. Persist application records.
3. Run deterministic reconciliation across full batch.
4. Persist initial states.
5. Investigate selected exceptions with AI.
6. Apply deterministic safety policy to proposed resolutions.
7. Persist final states/audit events.
8. Evaluation harness calculates metrics against hidden ground truth.

## API
- POST /api/batch/ingest
- POST /api/batch/reconcile
- POST /api/batch/investigate
- GET /api/metrics
- GET /api/exceptions
- GET /api/records/:id

Do not expose ground truth through these APIs.

## Avoid
- Microservices
- Kafka
- Kubernetes
- vector DB/RAG
- custom ML training
- authentication unless needed for deployment

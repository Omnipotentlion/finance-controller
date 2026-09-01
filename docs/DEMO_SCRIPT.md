# 5-Minute Demo Script

## 0:00–0:30 — Hook
"Finance teams don't only need to find mismatches. They need to know which differences are explainable, which can be safely closed, and which still need human attention."

## 0:30–1:00 — Problem
Show 50+ synthetic records from multiple financial sources.
State that the prototype targets the Track 04 multi-source reconciliation direction.

## 1:00–2:00 — Full batch
Run the complete batch.
Show:
- total records
- match rate
- throughput
- detected exceptions

Do not cherry-pick.

## 2:00–3:30 — AI investigation
Open one non-trivial exception.
Show:
- linked payment
- settlement item
- settlement
- bank transaction
- expected vs actual
- deterministic checks
- AI explanation
- bounded resolution proposal

## 3:30–4:15 — Resolution
Show a safely auto-resolved case and an unresolved case.
Make the unresolved case visible and explain why the agent stopped.

## 4:15–5:00 — Evidence
Show:
- match rate
- measured accuracy
- throughput
- resolution rate
- exact unresolved exception list
- architecture
- one failure/recovery example

## Critical rule
The demo must run against the full evaluated batch. Never present a single successful match as evidence of system quality.

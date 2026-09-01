# LedgerAnalyser — Project Source of Truth

## Official track basis
Track 04 — AI LedgerAnalyser, Razorpay AI Buildathon 2026.

Official track requirement:
- Build an agent that closes one finance-ops loop across a 50+ record batch of synthetic data.
- Report match rate.
- Report exceptions the agent could not resolve.
- Official bar: throughput + measured accuracy + honest exception list.

Official submission requirements identified in the research:
- Public GitHub repository
- 5-minute pitch video
- Architecture documentation
- Explain what broke and how recovery was handled

The official track material does NOT establish a mandatory Razorpay API integration, specific technology stack, specific UI, or scoring weights.

## Product
LedgerAnalyser is a buildathon prototype for multi-source financial reconciliation.

Core loop:
Synthetic financial data
→ validate
→ deterministic reconciliation
→ classify
→ investigate exceptions
→ safely auto-resolve supported cases
→ escalate unresolved cases
→ report metrics + evidence + audit trail.

## Product hook
"Don't just find mismatches. Close the finance-ops loop: reconcile the batch, explain what went wrong, safely resolve what can be resolved, and expose exactly what still needs a human."

## Hard constraints
- Synthetic data.
- Evaluated batch must contain 50+ records.
- Full-batch evaluation; no cherry-picking.
- Match rate must be reported.
- Unresolved exceptions must be reported honestly.
- Throughput and measured accuracy must be demonstrated.
- AI must perform meaningful agentic investigation/decision support.

## Source-of-truth hierarchy
1. Official Razorpay track/T&Cs
2. This document
3. Other project specification documents
4. Implementation preferences

If an implementation idea conflicts with an official requirement, stop and resolve the conflict before coding.

## Ground truth rule
Ground truth is immutable and isolated from the agent.
The agent may read source financial records but MUST NOT read the ground-truth labels used to score it.

`ground_truth` is evaluation infrastructure, not application data.

## Deterministic/AI boundary
Deterministic code owns:
- financial arithmetic
- matching
- timing rules
- duplicate checks
- metric calculations
- ground-truth comparison
- state-transition safety checks

AI owns:
- evidence synthesis
- investigation
- root-cause explanation
- prioritization
- bounded resolution proposal

AI cannot invent evidence or override deterministic safety rules.

## Non-goals
- Real customer/production financial data
- Claiming to be an official Razorpay internal system
- Unsupported fraud detection claims
- Generic finance chatbot
- Generic dashboard with no closed loop
- Microservices/Kafka/Kubernetes/vector DB unless a concrete requirement emerges

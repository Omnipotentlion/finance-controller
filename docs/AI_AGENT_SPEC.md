# AI Agent Specification

## Objective
Investigate reconciliation exceptions and close the finance-ops loop within strict evidence and safety boundaries.

## Agent tools
- get_transaction_context(id)
- get_related_records(id)
- run_reconciliation_check(id)
- compare_expected_vs_actual(id)
- classify_exception(id)
- create_resolution_proposal(id)
- mark_auto_resolved(id)
- mark_unresolved(id, reason)
- get_batch_metrics()

## Agent flow
1. Receive deterministic exception.
2. Fetch related source records.
3. Re-run/inspect deterministic checks.
4. Synthesize evidence.
5. Identify likely root cause.
6. Propose a bounded resolution.
7. Auto-resolve only when the deterministic safety policy allows it.
8. Otherwise mark unresolved with evidence and reason.
9. Write an audit event.

## Guardrails
- Never access evaluation ground truth.
- Never invent missing values.
- Never perform financial arithmetic as an LLM-only calculation.
- Never silently modify source records.
- Never claim fraud without explicit evidence and a defined rule.
- Never create a new auto-resolution policy dynamically.
- If evidence is incomplete, stop and escalate.

## Performance
The deterministic engine processes the complete batch.
The LLM is invoked only where investigation adds value, rather than once per record by default.

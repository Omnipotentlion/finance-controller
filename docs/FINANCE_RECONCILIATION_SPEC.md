# Finance Reconciliation Specification

## Purpose
Provide deterministic, auditable reconciliation. The LLM must never be the source of financial arithmetic.

## Prototype source chain
Payment
→ Settlement Item
→ Settlement
→ Bank Transaction

Optional:
Payment → Refund / Chargeback

## Settlement model
For each synthetic settlement, explicitly store the components needed to explain the resulting settlement amount:
- payment/gross component
- adjustment amount(s)
- fee
- tax
- net/settlement amount

Do NOT hard-code a universal MDR or tax rate.

Do NOT use a universal formula such as `payment = settlement + fee + tax` when adjustments or other declared components exist.

## Deterministic checks
1. Payment ↔ settlement-item linkage.
2. Settlement-item component arithmetic.
3. Settlement batch total ↔ sum of settlement items.
4. Settlement UTR ↔ bank transaction UTR.
5. Settlement amount ↔ bank credit amount.
6. Settlement processed vs bank-credit observation timing.
7. Duplicate logical transactions.
8. Refund/chargeback consistency when those scenarios are included.

## Timing
A processed settlement is not automatically equivalent to an already-observed bank credit.
The synthetic dataset must explicitly encode the expected observation window.
Do not hard-code arbitrary "2 day" or "3 day" thresholds in the engine.

## Exception types
- amount_mismatch
- missing_settlement
- missing_bank_credit
- duplicate_payment
- timing_difference
- utr_mismatch
- fee_calculation_error
- refund_unaccounted
- chargeback_unaccounted

## Safe auto-resolution
A case may be auto-resolved ONLY when:
1. a predefined deterministic rule explains it completely,
2. all required evidence is present,
3. the state transition is permitted by policy,
4. the resolution is recorded with evidence.

Example: a settlement processed but bank credit still inside the explicitly configured observation window may be classified as a legitimate timing/pending case, not "missing money."

AI cannot create a new auto-resolution rule at runtime.

## Ground truth
Ground truth lives outside the agent-accessible application data and is loaded only by the evaluation harness.
